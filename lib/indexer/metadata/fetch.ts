import { Buffer } from "node:buffer";

import type { IndexerConfig } from "@/lib/indexer/config";
import { normalizeAgentMetadata, type NormalizedAgentMetadata } from "@/lib/indexer/metadata/normalize";
import { validateAgentMetadata } from "@/lib/indexer/metadata/schema";
import {
  assertSafeRemoteUrl,
  MetadataUrlError,
  type HostResolver,
  resolvePublicHost,
} from "@/lib/indexer/metadata/url-safety";

export type MetadataFailureCode =
  | "blocked-host"
  | "dns-failed"
  | "empty-uri"
  | "http-error"
  | "invalid-content-type"
  | "invalid-data-uri"
  | "invalid-json"
  | "invalid-schema"
  | "network-error"
  | "redirect-limit"
  | "response-too-large"
  | "timeout"
  | "unsupported-url";

export type MetadataFetchResult =
  | Readonly<{
      code: MetadataFailureCode;
      status: "invalid" | "unavailable";
    }>
  | Readonly<{
      metadata: NormalizedAgentMetadata;
      status: "valid";
    }>;

type MetadataClientOptions = Readonly<{
  fetchImpl?: typeof fetch;
  ipfsGatewayUrl: string;
  maxBytes: number;
  resolveHost?: HostResolver;
  retries: number;
  timeoutMs: number;
}>;

class MetadataRequestError extends Error {
  constructor(
    readonly code: MetadataFailureCode,
    readonly status: "invalid" | "unavailable",
    readonly retryable: boolean,
  ) {
    super(`Agent metadata request failed: ${code}.`);
    this.name = "MetadataRequestError";
  }
}

function parseDataUri(uri: string, maxBytes: number): string {
  const match = uri.match(/^data:application\/json(;charset=[^;,]+)?(;base64)?,(.*)$/is);

  if (!match) {
    throw new MetadataRequestError("invalid-data-uri", "invalid", false);
  }

  let bytes: Buffer;

  try {
    bytes = match[2]
      ? Buffer.from(match[3], "base64")
      : Buffer.from(decodeURIComponent(match[3]), "utf8");
  } catch {
    throw new MetadataRequestError("invalid-data-uri", "invalid", false);
  }

  if (bytes.byteLength > maxBytes) {
    throw new MetadataRequestError("response-too-large", "invalid", false);
  }

  return bytes.toString("utf8");
}

function resolveAgentUri(uri: string, ipfsGatewayUrl: string): string {
  if (uri.startsWith("ipfs://")) {
    const path = uri.slice("ipfs://".length);

    if (!/^[a-zA-Z0-9]+(?:\/[a-zA-Z0-9._~-]+)*$/.test(path)) {
      throw new MetadataRequestError("unsupported-url", "invalid", false);
    }

    return new URL(path, ipfsGatewayUrl).toString();
  }

  return uri;
}

async function readBoundedBody(
  response: Response,
  maxBytes: number,
): Promise<string> {
  const declaredLength = response.headers.get("content-length");

  if (declaredLength && Number(declaredLength) > maxBytes) {
    throw new MetadataRequestError("response-too-large", "invalid", false);
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new MetadataRequestError("response-too-large", "invalid", false);
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function parseAndNormalize(jsonText: string): MetadataFetchResult {
  let json: unknown;

  try {
    json = JSON.parse(jsonText);
  } catch {
    return { code: "invalid-json", status: "invalid" };
  }

  const validated = validateAgentMetadata(json);

  if (!validated.success) {
    return { code: validated.code, status: "invalid" };
  }

  return {
    metadata: normalizeAgentMetadata(validated.metadata),
    status: "valid",
  };
}

async function fetchOnce(
  uri: string,
  options: Required<MetadataClientOptions>,
): Promise<string> {
  let nextUrl = resolveAgentUri(uri, options.ipfsGatewayUrl);

  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    let safeUrl: URL;

    try {
      safeUrl = await assertSafeRemoteUrl(nextUrl, options.resolveHost);
    } catch (error) {
      if (error instanceof MetadataUrlError) {
        throw new MetadataRequestError(
          error.code === "invalid-url" ? "unsupported-url" : error.code,
          error.retryable ? "unavailable" : "invalid",
          error.retryable,
        );
      }

      throw error;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const response = await options.fetchImpl(safeUrl, {
        headers: {
          accept: "application/json, application/*+json",
          "user-agent": "Sift-Indexer/1.0",
        },
        redirect: "manual",
        signal: controller.signal,
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");

        if (!location) {
          throw new MetadataRequestError("http-error", "unavailable", false);
        }

        if (redirectCount === 3) {
          throw new MetadataRequestError("redirect-limit", "invalid", false);
        }

        nextUrl = new URL(location, safeUrl).toString();
        continue;
      }

      if (!response.ok) {
        throw new MetadataRequestError(
          "http-error",
          "unavailable",
          response.status === 408 ||
            response.status === 429 ||
            response.status >= 500,
        );
      }

      const contentType =
        response.headers.get("content-type")?.toLowerCase() ?? "";

      if (!/^application\/(?:[^;]+\+)?json(?:;|$)/.test(contentType)) {
        throw new MetadataRequestError(
          "invalid-content-type",
          "invalid",
          false,
        );
      }

      return await readBoundedBody(response, options.maxBytes);
    } catch (error) {
      if (error instanceof MetadataRequestError) {
        throw error;
      }

      if (controller.signal.aborted) {
        throw new MetadataRequestError("timeout", "unavailable", true);
      }

      throw new MetadataRequestError("network-error", "unavailable", true);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new MetadataRequestError("redirect-limit", "invalid", false);
}

export type MetadataClient = Readonly<{
  fetch(uri: string): Promise<MetadataFetchResult>;
}>;

export function createMetadataClient(options: MetadataClientOptions): MetadataClient {
  const resolvedOptions: Required<MetadataClientOptions> = {
    fetchImpl: options.fetchImpl ?? fetch,
    ipfsGatewayUrl: options.ipfsGatewayUrl,
    maxBytes: options.maxBytes,
    resolveHost: options.resolveHost ?? resolvePublicHost,
    retries: options.retries,
    timeoutMs: options.timeoutMs,
  };

  return {
    async fetch(uri) {
      const trimmedUri = uri.trim();

      if (!trimmedUri) {
        return { code: "empty-uri", status: "invalid" };
      }

      if (trimmedUri.startsWith("{")) {
        if (Buffer.byteLength(trimmedUri, "utf8") > options.maxBytes) {
          return { code: "response-too-large", status: "invalid" };
        }

        return parseAndNormalize(trimmedUri);
      }

      if (trimmedUri.startsWith("data:")) {
        try {
          return parseAndNormalize(parseDataUri(trimmedUri, options.maxBytes));
        } catch (error) {
          if (error instanceof MetadataRequestError) {
            return { code: error.code, status: error.status };
          }

          return { code: "invalid-data-uri", status: "invalid" };
        }
      }

      for (let attempt = 0; attempt <= resolvedOptions.retries; attempt += 1) {
        try {
          return parseAndNormalize(
            await fetchOnce(trimmedUri, resolvedOptions),
          );
        } catch (error) {
          const requestError =
            error instanceof MetadataRequestError
              ? error
              : new MetadataRequestError("network-error", "unavailable", true);

          if (!requestError.retryable || attempt === resolvedOptions.retries) {
            return { code: requestError.code, status: requestError.status };
          }
        }
      }

      return { code: "network-error", status: "unavailable" };
    },
  };
}

export function createMetadataClientFromConfig(
  config: IndexerConfig,
): MetadataClient {
  return createMetadataClient({
    ipfsGatewayUrl: config.ipfsGatewayUrl,
    maxBytes: config.metadataMaxBytes,
    retries: config.metadataRetries,
    timeoutMs: config.metadataTimeoutMs,
  });
}
