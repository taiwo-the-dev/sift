import "server-only";

import {
  assertSafeRemoteUrl,
  MetadataUrlError,
  resolvePublicHost,
  type HostResolver,
} from "@/lib/indexer/metadata/url-safety";

import { HiringQuoteError } from "@/features/hiring/quote";

const maximumResponseBytes = 65_536;
const redirectStatuses = [301, 302, 303, 307, 308];

async function readBoundedJson(response: Response): Promise<unknown> {
  const declaredLength = response.headers.get("content-length");

  if (declaredLength && Number(declaredLength) > maximumResponseBytes) {
    throw new HiringQuoteError(
      "agent-unavailable",
      "The agent response exceeded Sift's safety limit.",
    );
  }

  if (!response.body) {
    throw new HiringQuoteError(
      "agent-unavailable",
      "The agent returned an empty response.",
    );
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

    if (totalBytes > maximumResponseBytes) {
      await reader.cancel();
      throw new HiringQuoteError(
        "agent-unavailable",
        "The agent response exceeded Sift's safety limit.",
      );
    }

    body += decoder.decode(value, { stream: true });
  }

  try {
    return JSON.parse(body + decoder.decode()) as unknown;
  } catch {
    throw new HiringQuoteError(
      "agent-unavailable",
      "The agent did not return valid JSON.",
    );
  }
}

export async function fetchSafeAgentJson(
  initialUrl: string,
  init: Readonly<{
    body?: string;
    fetchImpl?: typeof fetch;
    method: "GET" | "POST";
    resolveHost?: HostResolver;
    timeoutMs?: number;
  }>,
): Promise<unknown> {
  const fetchImpl = init.fetchImpl ?? fetch;
  const resolveHost = init.resolveHost ?? resolvePublicHost;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? 8_000);
  let nextUrl = initialUrl;
  let method = init.method;
  let body = init.body;

  try {
    for (let redirectCount = 0; redirectCount <= 2; redirectCount += 1) {
      let safeUrl: URL;

      try {
        safeUrl = await assertSafeRemoteUrl(nextUrl, resolveHost);
      } catch (error) {
        if (error instanceof MetadataUrlError) {
          throw new HiringQuoteError(
            "agent-unavailable",
            "The agent's service address did not pass Sift's network safety checks.",
          );
        }

        throw error;
      }

      const response = await fetchImpl(safeUrl, {
        body,
        headers: {
          accept: "application/json, application/*+json",
          ...(body ? { "content-type": "application/json" } : {}),
          "user-agent": "Sift-Hiring/1.0",
        },
        method,
        redirect: "manual",
        signal: controller.signal,
      });

      if (redirectStatuses.includes(response.status)) {
        const location = response.headers.get("location");

        if (!location || redirectCount === 2) {
          throw new HiringQuoteError(
            "agent-unavailable",
            "The agent's service address redirected to an unsafe location.",
          );
        }

        nextUrl = new URL(location, safeUrl).toString();

        if (response.status === 303) {
          method = "GET";
          body = undefined;
        }

        continue;
      }

      if (!response.ok) {
        throw new HiringQuoteError(
          "agent-unavailable",
          response.status === 429
            ? "The agent is rate-limiting quote requests. Wait briefly and try again."
            : "The agent's quote service is currently unavailable.",
        );
      }

      return await readBoundedJson(response);
    }
  } catch (error) {
    if (error instanceof HiringQuoteError) {
      throw error;
    }

    throw new HiringQuoteError(
      "agent-unavailable",
      controller.signal.aborted
        ? "The agent did not respond before the safety timeout."
        : "Sift could not reach the agent's quote service.",
    );
  } finally {
    clearTimeout(timeout);
  }

  throw new HiringQuoteError(
    "agent-unavailable",
    "Sift could not reach the agent's quote service.",
  );
}
