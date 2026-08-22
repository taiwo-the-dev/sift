import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

export type HostResolver = (
  hostname: string,
) => Promise<readonly Readonly<{ address: string; family: number }>[] >;

const blockedHostSuffixes = [".internal", ".local", ".localhost"] as const;

function isBlockedIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);

  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return true;
  }

  const [a, b] = octets;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 192 && b === 0 && octets[2] === 2) ||
    (a === 198 && b === 51 && octets[2] === 100) ||
    (a === 203 && b === 0 && octets[2] === 113) ||
    a >= 224
  );
}

function isBlockedIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];

  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8")
  ) {
    return true;
  }

  const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];

  if (mappedIpv4) {
    return isBlockedIpv4(mappedIpv4);
  }

  const numericAddress = parseIpv6(normalized);

  if (numericAddress === null) {
    return true;
  }

  const ipv4MappedPrefix = 0xffffn;

  if (numericAddress >> 32n === ipv4MappedPrefix) {
    const ipv4 = Number(numericAddress & 0xffff_ffffn);
    return isBlockedIpv4(
      [24, 16, 8, 0]
        .map((shift) => String((ipv4 >>> shift) & 255))
        .join("."),
    );
  }

  return false;
}

function parseIpv6(address: string): bigint | null {
  const halves = address.split("::");

  if (halves.length > 2) {
    return null;
  }

  function parseParts(value: string): number[] | null {
    if (!value) {
      return [];
    }

    const rawParts = value.split(":");
    const parts: number[] = [];

    for (const [index, part] of rawParts.entries()) {
      if (part.includes(".")) {
        if (index !== rawParts.length - 1 || !/^\d+(?:\.\d+){3}$/.test(part)) {
          return null;
        }

        const octets = part.split(".").map(Number);

        if (octets.some((octet) => octet < 0 || octet > 255)) {
          return null;
        }

        parts.push(octets[0] * 256 + octets[1], octets[2] * 256 + octets[3]);
      } else {
        if (!/^[0-9a-f]{1,4}$/.test(part)) {
          return null;
        }

        parts.push(Number.parseInt(part, 16));
      }
    }

    return parts;
  }

  const left = parseParts(halves[0]);
  const right = parseParts(halves[1] ?? "");

  if (!left || !right) {
    return null;
  }

  const missing = 8 - left.length - right.length;

  if (
    missing < 0 ||
    (halves.length === 1 && missing !== 0) ||
    (halves.length === 2 && missing < 1)
  ) {
    return null;
  }

  const parts = [...left, ...Array.from({ length: missing }, () => 0), ...right];
  return parts.reduce((value, part) => (value << 16n) | BigInt(part), 0n);
}

export function isPrivateOrReservedIp(address: string): boolean {
  const family = isIP(address);

  if (family === 4) {
    return isBlockedIpv4(address);
  }

  if (family === 6) {
    return isBlockedIpv6(address);
  }

  return true;
}

export const resolvePublicHost: HostResolver = async (hostname) =>
  dnsLookup(hostname, { all: true, verbatim: true });

export async function assertSafeRemoteUrl(
  value: string,
  resolveHost: HostResolver = resolvePublicHost,
): Promise<URL> {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new MetadataUrlError("invalid-url");
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new MetadataUrlError("unsupported-url");
  }

  const rawHostname = url.hostname.toLowerCase();
  const hostname =
    rawHostname.startsWith("[") && rawHostname.endsWith("]")
      ? rawHostname.slice(1, -1)
      : rawHostname;

  if (
    hostname === "localhost" ||
    blockedHostSuffixes.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw new MetadataUrlError("blocked-host");
  }

  if (isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new MetadataUrlError("blocked-host");
    }

    return url;
  }

  let addresses: readonly Readonly<{ address: string; family: number }>[];

  try {
    addresses = await resolveHost(hostname);
  } catch {
    throw new MetadataUrlError("dns-failed", true);
  }

  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isPrivateOrReservedIp(address))
  ) {
    throw new MetadataUrlError("blocked-host");
  }

  return url;
}

export class MetadataUrlError extends Error {
  constructor(
    readonly code:
      | "blocked-host"
      | "dns-failed"
      | "invalid-url"
      | "unsupported-url",
    readonly retryable = false,
  ) {
    super(`Metadata URL rejected: ${code}.`);
    this.name = "MetadataUrlError";
  }
}
