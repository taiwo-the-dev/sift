import {
  assertSafeRemoteUrl,
  MetadataUrlError,
  resolvePublicHost,
  type HostResolver,
} from "@/lib/indexer/metadata/url-safety";

export class ActivationRemoteError extends Error {
  constructor(
    readonly code:
      | "http-error"
      | "invalid-response"
      | "network-error"
      | "response-too-large"
      | "timeout"
      | "unsafe-endpoint",
    message: string,
  ) {
    super(message);
    this.name = "ActivationRemoteError";
  }
}

export type ActivationRemoteResponse = Readonly<{
  body: string;
  headers: Headers;
  responseTimeMs: number;
  status: number;
}>;

async function boundedText(response: Response, maxBytes: number): Promise<string> {
  const declared = response.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) {
    throw new ActivationRemoteError(
      "response-too-large",
      "The service response exceeded Sift's safety limit.",
    );
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ActivationRemoteError(
        "response-too-large",
        "The service response exceeded Sift's safety limit.",
      );
    }
    body += decoder.decode(value, { stream: true });
  }
  return body + decoder.decode();
}

export async function requestActivationService(
  endpoint: string,
  init: Readonly<{
    body?: string;
    fetchImpl?: typeof fetch;
    headers?: Readonly<Record<string, string>>;
    maxBytes?: number;
    method: "GET" | "POST";
    resolveHost?: HostResolver;
    timeoutMs?: number;
  }>,
): Promise<ActivationRemoteResponse> {
  let url: URL;
  try {
    url = await assertSafeRemoteUrl(
      endpoint,
      init.resolveHost ?? resolvePublicHost,
    );
  } catch (error) {
    if (error instanceof MetadataUrlError) {
      throw new ActivationRemoteError(
        "unsafe-endpoint",
        "The declared service address did not pass Sift's network safety checks.",
      );
    }
    throw error;
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    url.search
  ) {
    throw new ActivationRemoteError(
      "unsafe-endpoint",
      "Task services must use public HTTPS without credentials, query secrets, or custom ports.",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? 6_000);
  const startedAt = performance.now();

  try {
    const response = await (init.fetchImpl ?? fetch)(url, {
      body: init.body,
      cache: "no-store",
      headers: {
        accept: "application/json, application/*+json, text/event-stream",
        ...(init.body ? { "content-type": "application/json" } : {}),
        "user-agent": "Sift-Activation/1.0",
        ...init.headers,
      },
      method: init.method,
      redirect: "manual",
      signal: controller.signal,
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      throw new ActivationRemoteError(
        "unsafe-endpoint",
        "The task service redirected; its owner must publish the final HTTPS address.",
      );
    }

    return {
      body: await boundedText(response, init.maxBytes ?? 65_536),
      headers: response.headers,
      responseTimeMs: Math.max(0, Math.round(performance.now() - startedAt)),
      status: response.status,
    };
  } catch (error) {
    if (error instanceof ActivationRemoteError) throw error;
    throw new ActivationRemoteError(
      controller.signal.aborted ? "timeout" : "network-error",
      controller.signal.aborted
        ? "The service did not respond before the safety timeout."
        : "Sift could not reach the declared service.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function parseJsonOrSse(body: string): unknown {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new ActivationRemoteError("invalid-response", "The service returned an empty response.");
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const data = trimmed
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .filter((line) => line && line !== "[DONE]")
      .at(-1);
    if (data) {
      try {
        return JSON.parse(data) as unknown;
      } catch {
        // The uniform error below intentionally avoids returning untrusted text.
      }
    }
    throw new ActivationRemoteError(
      "invalid-response",
      "The service did not return valid JSON-RPC data.",
    );
  }
}

export function parseJsonBody(body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new ActivationRemoteError(
      "invalid-response",
      "The service did not return valid JSON.",
    );
  }
}
