import "server-only";

import {
  assertSafeRemoteUrl,
  type HostResolver,
} from "@/lib/indexer/metadata/url-safety";

const allowedImageTypes = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const maximumImageBytes = 2 * 1024 * 1024;
const maximumRedirects = 2;
const maximumUrlLength = 2_048;
const requestTimeoutMs = 5_000;
const redirectStatuses = new Set([301, 302, 303, 307, 308]);

export class AgentImageError extends Error {
  constructor(
    readonly code:
      | "invalid-source"
      | "remote-failure"
      | "too-large"
      | "unsupported-content",
  ) {
    super(`Agent image rejected: ${code}.`);
    this.name = "AgentImageError";
  }
}

export type AgentImageResult = Readonly<{
  body: ArrayBuffer;
  contentType: string;
}>;

type AgentImageDependencies = Readonly<{
  fetchImplementation?: typeof fetch;
  resolveHost?: HostResolver;
}>;

async function validateSource(
  value: string,
  resolveHost?: HostResolver,
): Promise<URL> {
  if (value.length === 0 || value.length > maximumUrlLength) {
    throw new AgentImageError("invalid-source");
  }

  try {
    const url = await assertSafeRemoteUrl(value, resolveHost);

    if (url.protocol !== "https:") {
      throw new AgentImageError("invalid-source");
    }

    return url;
  } catch (error) {
    if (error instanceof AgentImageError) {
      throw error;
    }

    throw new AgentImageError("invalid-source");
  }
}

async function readBoundedBody(response: Response): Promise<ArrayBuffer> {
  const declaredLength = Number(response.headers.get("content-length"));

  if (Number.isFinite(declaredLength) && declaredLength > maximumImageBytes) {
    throw new AgentImageError("too-large");
  }

  if (!response.body) {
    throw new AgentImageError("remote-failure");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maximumImageBytes) {
        await reader.cancel();
        throw new AgentImageError("too-large");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const result = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result.buffer;
}

export async function fetchAgentImage(
  source: string,
  dependencies: AgentImageDependencies = {},
): Promise<AgentImageResult> {
  const fetchImplementation = dependencies.fetchImplementation ?? fetch;
  let url = await validateSource(source, dependencies.resolveHost);

  for (let redirectCount = 0; redirectCount <= maximumRedirects; redirectCount += 1) {
    let response: Response;

    try {
      response = await fetchImplementation(url, {
        headers: {
          accept: "image/avif,image/webp,image/png,image/jpeg,image/gif",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
    } catch {
      throw new AgentImageError("remote-failure");
    }

    if (redirectStatuses.has(response.status)) {
      const location = response.headers.get("location");

      if (!location || redirectCount === maximumRedirects) {
        throw new AgentImageError("remote-failure");
      }

      url = await validateSource(
        new URL(location, url).toString(),
        dependencies.resolveHost,
      );
      continue;
    }

    if (!response.ok) {
      throw new AgentImageError("remote-failure");
    }

    const contentType = response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();

    if (!contentType || !allowedImageTypes.has(contentType)) {
      throw new AgentImageError("unsupported-content");
    }

    return {
      body: await readBoundedBody(response),
      contentType,
    };
  }

  throw new AgentImageError("remote-failure");
}
