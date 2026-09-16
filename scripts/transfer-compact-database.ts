import { loadEnvConfig } from "@next/env";

type TransferSpec = Readonly<{
  conflict: string;
  cursor?: string;
  table: string;
}>;

type DatabaseConnection = Readonly<{
  key: string;
  url: string;
}>;

const BATCH_SIZE = 200;
const MAX_ATTEMPTS = 5;
const REQUEST_TIMEOUT_MS = 45_000;

const transferOrder: readonly TransferSpec[] = [
  { conflict: "id", cursor: "id", table: "agents" },
  { conflict: "id", cursor: "id", table: "agent_services" },
  {
    conflict: "agent_db_id,category",
    table: "agent_category_evidence",
  },
  {
    conflict: "category,shortlist_rank",
    table: "agent_category_shortlist",
  },
  {
    conflict: "agent_db_id,provider",
    table: "agent_external_evidence",
  },
  {
    conflict: "agent_db_id",
    cursor: "agent_db_id",
    table: "agent_health",
  },
  {
    conflict: "agent_db_id",
    cursor: "agent_db_id",
    table: "agent_reputation",
  },
  {
    conflict: "agent_db_id",
    cursor: "agent_db_id",
    table: "agent_scores",
  },
  { conflict: "chain_id,registry_address", table: "sync_state" },
  { conflict: "id", cursor: "id", table: "jobs" },
  { conflict: "id", cursor: "id", table: "job_transactions" },
  { conflict: "id", cursor: "id", table: "job_activity" },
];

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name} in .env.local.`);
  return value;
}

function connection(urlName: string, keyName: string): DatabaseConnection {
  const rawUrl = requiredEnvironmentValue(urlName);
  const key = requiredEnvironmentValue(keyName);
  const url = new URL(rawUrl);

  if (url.protocol !== "https:") {
    throw new Error(`${urlName} must use HTTPS.`);
  }
  if (key.startsWith("sb_publishable_")) {
    throw new Error(`${keyName} must be a secret key, not a publishable key.`);
  }

  return {
    key,
    url: url.toString().replace(/\/$/, ""),
  };
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isRetryable(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function databaseFetch(
  database: DatabaseConnection,
  path: string,
  init: RequestInit,
  operation: string,
): Promise<Response> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(`${database.url}${path}`, {
        ...init,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${database.key}`,
          apikey: database.key,
          ...init.headers,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) throw error;
      await wait(500 * 2 ** (attempt - 1));
      continue;
    }

    if (response.ok) return response;

    const message = (await response.text()).slice(0, 500);
    if (!isRetryable(response.status) || attempt === MAX_ATTEMPTS) {
      throw new Error(
        `${operation} failed with HTTP ${response.status}: ${message || "No response details."}`,
      );
    }

    await wait(500 * 2 ** (attempt - 1));
  }

  throw new Error(`${operation} exhausted its retry limit.`);
}

async function readBatch(
  database: DatabaseConnection,
  spec: TransferSpec,
  offset: number,
  after: string | null,
): Promise<readonly Record<string, unknown>[]> {
  const query = new URLSearchParams({ select: "*" });

  if (spec.cursor) {
    query.set("order", `${spec.cursor}.asc`);
    query.set("limit", String(BATCH_SIZE));
    if (after !== null) query.set(spec.cursor, `gt.${after}`);
  } else {
    query.set("limit", String(BATCH_SIZE));
    query.set("offset", String(offset));
  }

  const response = await databaseFetch(
    database,
    `/rest/v1/${spec.table}?${query.toString()}`,
    { method: "GET" },
    `Read ${spec.table}`,
  );
  const payload: unknown = await response.json();

  if (!Array.isArray(payload)) {
    throw new Error(`Read ${spec.table} returned an invalid response.`);
  }

  return payload as readonly Record<string, unknown>[];
}

async function latestCursor(
  database: DatabaseConnection,
  spec: TransferSpec,
): Promise<string | null> {
  if (!spec.cursor) return null;

  const query = new URLSearchParams({
    limit: "1",
    order: `${spec.cursor}.desc`,
    select: spec.cursor,
  });
  const response = await databaseFetch(
    database,
    `/rest/v1/${spec.table}?${query.toString()}`,
    { method: "GET" },
    `Read target ${spec.table} cursor`,
  );
  const payload: unknown = await response.json();

  if (!Array.isArray(payload) || payload.length === 0) return null;
  const value = (payload[0] as Record<string, unknown>)[spec.cursor];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : null;
}

async function upsertBatch(
  database: DatabaseConnection,
  spec: TransferSpec,
  rows: readonly Record<string, unknown>[],
): Promise<void> {
  const query = new URLSearchParams({ on_conflict: spec.conflict });
  await databaseFetch(
    database,
    `/rest/v1/${spec.table}?${query.toString()}`,
    {
      body: JSON.stringify(rows),
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      method: "POST",
    },
    `Write ${spec.table}`,
  );
}

async function transferTable(
  source: DatabaseConnection,
  target: DatabaseConnection,
  spec: TransferSpec,
): Promise<number> {
  let after = await latestCursor(target, spec);
  let offset = 0;
  let copied = 0;

  process.stdout.write(
    `${JSON.stringify({
      event: "compact_transfer_table_started",
      resumedAfter: after,
      table: spec.table,
    })}\n`,
  );

  while (true) {
    const rows = await readBatch(source, spec, offset, after);
    if (rows.length === 0) break;

    await upsertBatch(target, spec, rows);
    copied += rows.length;
    offset += rows.length;

    if (spec.cursor) {
      const next = rows.at(-1)?.[spec.cursor];
      if (typeof next !== "string" && typeof next !== "number") {
        throw new Error(`${spec.table} returned an invalid cursor value.`);
      }
      after = String(next);
    }

    if (copied % 2_000 === 0 || rows.length < BATCH_SIZE) {
      process.stdout.write(
        `${JSON.stringify({
          copiedThisRun: copied,
          event: "compact_transfer_progress",
          table: spec.table,
        })}\n`,
      );
    }

    if (rows.length < BATCH_SIZE) break;
  }

  process.stdout.write(
    `${JSON.stringify({
      copiedThisRun: copied,
      event: "compact_transfer_table_complete",
      table: spec.table,
    })}\n`,
  );
  return copied;
}

const DISCOVERY_REFRESH_BATCH_SIZE = 2_000;

async function refreshDiscoveryDocuments(
  target: DatabaseConnection,
): Promise<number> {
  let after: string | null = null;
  let refreshed = 0;

  while (true) {
    const query = new URLSearchParams({
      limit: String(DISCOVERY_REFRESH_BATCH_SIZE),
      order: "id.asc",
      select: "id",
    });
    if (after !== null) query.set("id", `gt.${after}`);

    const response = await databaseFetch(
      target,
      `/rest/v1/agents?${query.toString()}`,
      { method: "GET" },
      "Read agent ids for discovery refresh",
    );
    const rows = (await response.json()) as readonly { id: string }[];
    if (rows.length === 0) break;

    const ids = rows.map((row) => row.id);
    await databaseFetch(
      target,
      "/rest/v1/rpc/refresh_agent_discovery_documents",
      {
        body: JSON.stringify({ p_agent_ids: ids }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
      "Refresh agent discovery documents batch",
    );

    refreshed += ids.length;
    after = ids.at(-1) ?? after;

    process.stdout.write(
      `${JSON.stringify({
        event: "compact_discovery_refresh_progress",
        refreshed,
      })}\n`,
    );

    // PostgREST may cap the returned page below the requested limit, so a
    // short page does not by itself mean the source is exhausted.
    if (rows.length === 0) break;
  }

  return refreshed;
}

// Supabase's PostgREST/API roles carry a fixed 8-second statement_timeout,
// too short for validating and analyzing hundreds of thousands of rows.
// Finalize runs over a direct database connection instead, which uses the
// project's normal (multi-minute) timeout.
async function finalize(database: DatabaseConnection): Promise<unknown> {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    throw new Error(
      "SUPABASE_DB_PASSWORD is required to finalize the compact import.",
    );
  }

  const projectRef = new URL(database.url).hostname.split(".")[0];
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  const { stdout } = await execFileAsync(
    "psql",
    [
      `host=db.${projectRef}.supabase.co port=5432 dbname=postgres user=postgres sslmode=require`,
      "-t",
      "-A",
      "-c",
      "select public.finalize_compact_catalogue_import();",
    ],
    { env: { ...process.env, PGPASSWORD: password } },
  );

  return JSON.parse(stdout.trim());
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const source = connection("SUPABASE_URL", "SUPABASE_SECRET_KEY");
  const target = connection(
    "COMPACT_SUPABASE_URL",
    "COMPACT_SUPABASE_SECRET_KEY",
  );

  if (new URL(source.url).hostname === new URL(target.url).hostname) {
    throw new Error("Source and compact target must be different projects.");
  }

  process.stdout.write(
    `${JSON.stringify({
      event: "compact_transfer_started",
      skippedEphemeralTables: [
        "dashboard_sessions",
        "dashboard_wallet_challenges",
        "mcp_action_authorizations",
      ],
    })}\n`,
  );

  const copied: Record<string, number> = {};
  for (const spec of transferOrder) {
    copied[spec.table] = await transferTable(source, target, spec);
  }

  const refreshed = await refreshDiscoveryDocuments(target);
  process.stdout.write(
    `${JSON.stringify({
      event: "compact_discovery_refresh_complete",
      refreshed,
    })}\n`,
  );

  const validation = await finalize(target);
  process.stdout.write(
    `${JSON.stringify({
      copiedThisRun: copied,
      event: "compact_transfer_complete",
      validation,
    })}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown failure.";
  process.stderr.write(
    `${JSON.stringify({ event: "compact_transfer_failed", message })}\n`,
  );
  process.exitCode = 1;
});
