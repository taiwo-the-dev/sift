const blockedHostnameSuffixes = [".internal", ".local", ".localhost"] as const;
const maximumImageUrlLength = 2_048;

function isIpLiteral(hostname: string): boolean {
  return (
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) ||
    (hostname.startsWith("[") && hostname.endsWith("]"))
  );
}

export function normalizeAgentImageUrl(value: string | null): string | null {
  const candidate = value?.trim();

  if (!candidate || candidate.length > maximumImageUrlLength) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase();

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    hostname === "localhost" ||
    blockedHostnameSuffixes.some((suffix) => hostname.endsWith(suffix)) ||
    isIpLiteral(hostname)
  ) {
    return null;
  }

  return url.toString();
}

export function buildAgentImageProxyUrl(value: string | null): string | null {
  const imageUrl = normalizeAgentImageUrl(value);

  if (!imageUrl) {
    return null;
  }

  const params = new URLSearchParams({ url: imageUrl });
  return `/api/agent-image?${params.toString()}`;
}
