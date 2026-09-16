import "server-only";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type { Database } from "@/lib/db/database.types";
import { getSupabaseServerConfig } from "@/lib/db/env";

let cachedClient: SupabaseClient<Database> | undefined;

const STATEMENT_TIMEOUT_RETRY_ATTEMPTS = 3;

async function isStatementTimeout(response: Response): Promise<boolean> {
  if (response.status < 500) return false;

  try {
    const body: unknown = await response.clone().json();
    return (
      typeof body === "object" &&
      body !== null &&
      "code" in body &&
      body.code === "57014"
    );
  } catch {
    return false;
  }
}

// The project's compute can idle down between requests, so the first query
// after a gap occasionally exceeds the platform's fixed 8s API timeout even
// though the query itself is fast. A canceled statement applies no partial
// writes, so retrying is safe.
async function fetchWithStatementTimeoutRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  for (
    let attempt = 1;
    attempt <= STATEMENT_TIMEOUT_RETRY_ATTEMPTS;
    attempt += 1
  ) {
    const response = await fetch(input, init);
    const isLastAttempt = attempt === STATEMENT_TIMEOUT_RETRY_ATTEMPTS;

    if (isLastAttempt || !(await isStatementTimeout(response))) {
      return response;
    }

    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
  }

  throw new Error("Unreachable: retry loop must return or throw.");
}

export function getSupabaseServerClient(): SupabaseClient<Database> {
  if (cachedClient) {
    return cachedClient;
  }

  const { secretKey, url } = getSupabaseServerConfig();

  cachedClient = createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    db: {
      schema: "public",
    },
    global: {
      fetch: fetchWithStatementTimeoutRetry,
    },
  });

  return cachedClient;
}
