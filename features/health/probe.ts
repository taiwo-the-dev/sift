import {
  assertSafeRemoteUrl,
  MetadataUrlError,
  type HostResolver,
  resolvePublicHost,
} from "@/lib/indexer/metadata/url-safety";
import type {
  HealthObservation,
  HealthOutcome,
  HealthProbeTarget,
  HealthStatus,
} from "@/features/health/model";

export type HealthProbeOptions = Readonly<{
  clock?: () => number;
  fetchImpl?: typeof fetch;
  maxBytes: number;
  resolveHost?: HostResolver;
  retries: number;
  timeoutMs: number;
}>;

class HealthProbeError extends Error {
  constructor(
    readonly outcome: HealthOutcome,
    readonly status: HealthStatus,
    readonly retryable: boolean,
  ) {
    super(`Health probe failed: ${outcome}.`);
    this.name = "HealthProbeError";
  }
}

function resultFromError(
  target: HealthProbeTarget,
  error: HealthProbeError,
): HealthObservation {
  return {
    checkedEndpoint: target.checkedEndpoint,
    endpointHash: target.endpointHash,
    outcome: error.outcome,
    responseTimeMs: null,
    serviceType: target.serviceType,
    status: error.status,
    wasProbed: !["unsafe-endpoint", "invalid-endpoint"].includes(
      error.outcome,
    ),
  };
}

async function readBoundedBody(
  response: Response,
  maximumBytes: number,
): Promise<string> {
  const declaredLength = response.headers.get("content-length");

  if (declaredLength && Number(declaredLength) > maximumBytes) {
    throw new HealthProbeError("response-too-large", "unknown", false);
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maximumBytes) {
      await reader.cancel();
      throw new HealthProbeError("response-too-large", "unknown", false);
    }

    body += decoder.decode(value, { stream: true });
  }

  return body + decoder.decode();
}

function validateA2aCard(body: string): void {
  let value: unknown;

  try {
    value = JSON.parse(body);
  } catch {
    throw new HealthProbeError("invalid-response", "unknown", false);
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HealthProbeError("invalid-response", "unknown", false);
  }
}

function mapResponseFailure(status: number): HealthProbeError {
  if (status === 408 || status === 425 || status === 429 || status >= 500) {
    return new HealthProbeError("http-server-error", "degraded", true);
  }

  return new HealthProbeError("http-client-error", "unknown", false);
}

async function probeOnce(
  target: HealthProbeTarget,
  options: Required<HealthProbeOptions>,
): Promise<HealthObservation> {
  const startedAt = options.clock();
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const operation = async (): Promise<HealthObservation> => {
    let nextUrl = target.checkedEndpoint;

    for (let redirectCount = 0; redirectCount <= 2; redirectCount += 1) {
      let safeUrl: URL;

      try {
        safeUrl = await assertSafeRemoteUrl(nextUrl, options.resolveHost);
      } catch (error) {
        if (error instanceof MetadataUrlError) {
          throw new HealthProbeError(
            error.code === "dns-failed" ? "dns-error" : "unsafe-endpoint",
            "unknown",
            error.retryable,
          );
        }

        throw error;
      }

      const response = await options.fetchImpl(safeUrl, {
        headers: {
          accept:
            target.kind === "a2a-card"
              ? "application/json, application/*+json"
              : "application/json, text/plain;q=0.9, */*;q=0.1",
          "user-agent": "Sift-Health/1.0",
        },
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");

        if (!location || redirectCount === 2) {
          throw new HealthProbeError("redirect-error", "unknown", false);
        }

        nextUrl = new URL(location, safeUrl).toString();
        continue;
      }

      if (!response.ok) {
        throw mapResponseFailure(response.status);
      }

      const body = await readBoundedBody(response, options.maxBytes);

      if (target.kind === "a2a-card") {
        validateA2aCard(body);
      }

      return {
        checkedEndpoint: target.checkedEndpoint,
        endpointHash: target.endpointHash,
        outcome: "success",
        responseTimeMs: Math.max(0, Math.round(options.clock() - startedAt)),
        serviceType: target.serviceType,
        status: "online",
        wasProbed: true,
      };
    }

    throw new HealthProbeError("redirect-error", "unknown", false);
  };

  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new HealthProbeError("timeout", "offline", true));
        }, options.timeoutMs);
      }),
    ]);
  } catch (error) {
    if (error instanceof HealthProbeError) {
      throw error;
    }

    if (controller.signal.aborted) {
      throw new HealthProbeError("timeout", "offline", true);
    }

    throw new HealthProbeError("network-error", "offline", true);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function probeHealthEndpoint(
  target: HealthProbeTarget,
  options: HealthProbeOptions,
): Promise<HealthObservation> {
  const resolvedOptions: Required<HealthProbeOptions> = {
    clock: options.clock ?? (() => performance.now()),
    fetchImpl: options.fetchImpl ?? fetch,
    maxBytes: options.maxBytes,
    resolveHost: options.resolveHost ?? resolvePublicHost,
    retries: options.retries,
    timeoutMs: options.timeoutMs,
  };
  let finalError = new HealthProbeError("network-error", "offline", true);

  for (let attempt = 0; attempt <= resolvedOptions.retries; attempt += 1) {
    try {
      return await probeOnce(target, resolvedOptions);
    } catch (error) {
      finalError =
        error instanceof HealthProbeError
          ? error
          : new HealthProbeError("network-error", "offline", true);

      if (!finalError.retryable) {
        break;
      }
    }
  }

  return resultFromError(target, finalError);
}
