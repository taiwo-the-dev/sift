import { Braces, ChevronDown, MessageSquareText, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

const MAX_VISIBLE_ARRAY_ITEMS = 24;
const MAX_READABLE_DEPTH = 6;

const hiddenProtocolKeys = new Set([
  "_meta",
  "artifacts",
  "content",
  "contextId",
  "jsonrpc",
  "kind",
  "message",
  "messageId",
  "parts",
  "role",
  "summary",
  "type",
]);

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function humanizeKey(key: string): string {
  const words = key
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const normalized = word.toLowerCase();
      if (normalized === "id") return "ID";
      if (normalized === "url") return "URL";
      if (normalized === "api") return "API";
      if (normalized === "apy") return "APY";
      if (normalized === "apr") return "APR";
      if (normalized === "roi") return "ROI";
      if (normalized === "pnl") return "PnL";
      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    });

  return words.join(" ") || "Response";
}

function parseStructuredText(value: string): unknown | null {
  const trimmed = value.trim();
  if (
    !(
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    )
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return record(parsed) || Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function serializeResponse(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

function containsIdentityOnlyResult(value: unknown, depth = 0): boolean {
  if (depth > MAX_READABLE_DEPTH) return false;
  if (typeof value === "string") {
    const parsed = parseStructuredText(value);
    return parsed === null ? false : containsIdentityOnlyResult(parsed, depth + 1);
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsIdentityOnlyResult(item, depth + 1));
  }
  const object = record(value);
  if (!object) return false;
  if (typeof object.tier === "string" && object.tier.toLowerCase() === "identity") {
    return true;
  }
  return Object.values(object).some((item) =>
    containsIdentityOnlyResult(item, depth + 1),
  );
}

function extractReplyText(
  value: unknown,
  output: string[],
  structured: unknown[],
  depth = 0,
): void {
  if (depth > MAX_READABLE_DEPTH || value === null || value === undefined) return;

  if (typeof value === "string") {
    const parsed = parseStructuredText(value);
    if (parsed !== null) {
      if (!structured.some((item) => serializeResponse(item) === serializeResponse(parsed))) {
        structured.push(parsed);
      }
      extractReplyText(parsed, output, structured, depth + 1);
      return;
    }
    const text = value.trim();
    if (text && !output.includes(text)) output.push(text);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => extractReplyText(item, output, structured, depth + 1));
    return;
  }

  const object = record(value);
  if (!object) return;

  if (
    typeof object.text === "string" &&
    (object.kind === "text" || object.type === "text")
  ) {
    extractReplyText(object.text, output, structured, depth + 1);
  }

  for (const key of ["summary", "message", "answer"] as const) {
    if (key in object) extractReplyText(object[key], output, structured, depth + 1);
  }
  for (const key of ["parts", "content", "artifacts"] as const) {
    if (key in object) extractReplyText(object[key], output, structured, depth + 1);
  }

  const status = record(object.status);
  if (status?.message !== undefined) {
    extractReplyText(status.message, output, structured, depth + 1);
  }
}

function ReadableValue({
  depth = 0,
  value,
}: Readonly<{ depth?: number; value: unknown }>): ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">Not provided</span>;
  }

  if (typeof value === "string") {
    const parsed = parseStructuredText(value);
    if (parsed !== null && depth < MAX_READABLE_DEPTH) {
      return <ReadableValue depth={depth + 1} value={parsed} />;
    }

    return (
      <p className="whitespace-pre-wrap break-words leading-6 text-foreground">
        {value || "No text returned"}
      </p>
    );
  }

  if (typeof value === "boolean") {
    return <span className="font-medium text-foreground">{value ? "Yes" : "No"}</span>;
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return <span className="font-medium text-foreground">{String(value)}</span>;
  }

  if (depth >= MAX_READABLE_DEPTH) {
    return (
      <span className="text-muted-foreground">
        More details are available in the JSON response.
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground">No items returned</span>;
    }

    const visibleItems = value.slice(0, MAX_VISIBLE_ARRAY_ITEMS);
    return (
      <div className="divide-y divide-border/70">
        {visibleItems.map((item, index) => (
          <div className="py-3 first:pt-0 last:pb-0" key={index}>
            <ReadableValue depth={depth + 1} value={item} />
          </div>
        ))}
        {value.length > visibleItems.length ? (
          <p className="pt-3 text-xs text-muted-foreground">
            {value.length - visibleItems.length} more items are available in the
            JSON response.
          </p>
        ) : null}
      </div>
    );
  }

  const object = record(value);
  if (!object) {
    return <span className="text-foreground">{String(value)}</span>;
  }

  const entries = Object.entries(object).filter(
    ([key]) => !hiddenProtocolKeys.has(key),
  );
  if (entries.length === 0) {
    return <span className="text-muted-foreground">No additional details</span>;
  }

  return (
    <dl className="divide-y divide-border/70 border-y border-border/70">
      {entries.map(([key, item]) => (
        <div
          className="grid min-w-0 gap-1.5 py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5"
          key={key}
        >
          <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {humanizeKey(key)}
          </dt>
          <dd className="min-w-0 text-sm">
            <ReadableValue depth={depth + 1} value={item} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ServiceResponse({ value }: Readonly<{ value: unknown }>) {
  const messages: string[] = [];
  const structured: unknown[] = [];
  extractReplyText(value, messages, structured);
  const identityOnly = containsIdentityOnlyResult(value);
  const readableValue =
    structured.length === 0
      ? value
      : structured.length === 1
        ? structured[0]
        : structured;

  return (
    <section aria-live="polite" className="mt-7 border-t border-border pt-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-brand/30 bg-brand/8 text-brand">
          <MessageSquareText className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-foreground">Agent reply</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Key text is shown first. The full reply is unchanged in the JSON view.
          </p>
        </div>
      </div>

      {identityOnly ? (
        <div className="mt-5 flex gap-3 border-l-2 border-brand bg-brand/5 py-2 pl-4">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              The agent described itself instead of completing the task.
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              This provider currently returns identity information and may not support
              custom task replies yet.
            </p>
          </div>
        </div>
      ) : null}

      {messages.length > 0 ? (
        <div className="mt-5 space-y-4 border-l-2 border-brand/50 py-1 pl-4 text-sm">
          {messages.map((message) => (
            <p className="whitespace-pre-wrap break-words leading-6 text-foreground" key={message}>
              {message}
            </p>
          ))}
        </div>
      ) : null}

      {!identityOnly ? (
        <div className="mt-5 min-w-0 text-sm">
          <ReadableValue value={readableValue} />
        </div>
      ) : null}

      <details className="group mt-5 border-t border-border/70">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 text-xs font-semibold text-foreground outline-none hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/30 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <Braces className="size-3.5 text-brand" aria-hidden="true" />
            View JSON response
          </span>
          <ChevronDown
            className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="border-t border-border/70 bg-background/50 p-4">
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-muted-foreground">
            {serializeResponse(value)}
          </pre>
        </div>
      </details>
    </section>
  );
}
