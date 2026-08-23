import { isAddress, type Address } from "viem";

import type { AgentProfile, AgentProfileService } from "@/features/agents/model";
import type {
  HiringAgentSummary,
  HiringCompatibility,
} from "@/features/hiring/model";
import { HIRING_CHAIN_ID } from "@/features/hiring/protocol";
import { formatAgentName } from "@/features/discovery/format";

const reservedHostnameSuffixes = [
  ".example",
  ".invalid",
  ".localhost",
  ".test",
];

export function isErc8183ServiceType(value: string): boolean {
  return value.trim().toLowerCase().replaceAll("-", "") === "erc8183";
}

function deriveProtocolUrls(endpoint: string): HiringCompatibility | null {
  let url: URL;

  try {
    url = new URL(endpoint);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase();

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    url.search ||
    reservedHostnameSuffixes.some((suffix) => hostname.endsWith(suffix))
  ) {
    return null;
  }

  url.hash = "";
  const segments = url.pathname.split("/").filter(Boolean);
  const last = segments.at(-1)?.toLowerCase();

  if (last === "status" || last === "health" || last === "negotiate") {
    segments.pop();
  }

  const basePath = `/${segments.join("/")}`.replace(/\/$/, "");
  const statusUrl = new URL(url);
  const negotiateUrl = new URL(url);
  statusUrl.pathname = `${basePath}/status`.replaceAll("//", "/");
  negotiateUrl.pathname = `${basePath}/negotiate`.replaceAll("//", "/");

  return {
    endpoint: url.toString(),
    negotiateUrl: negotiateUrl.toString(),
    statusUrl: statusUrl.toString(),
  };
}

export function resolveHiringCompatibility(
  profile: Pick<AgentProfile, "active" | "chainId" | "metadataStatus" | "ownerAddress" | "services">,
): HiringCompatibility | null {
  if (
    profile.chainId !== HIRING_CHAIN_ID ||
    profile.metadataStatus !== "valid" ||
    profile.active === false ||
    !profile.ownerAddress ||
    !isAddress(profile.ownerAddress)
  ) {
    return null;
  }

  for (const service of profile.services) {
    if (!isErc8183ServiceType(service.serviceType) || !service.endpoint) {
      continue;
    }

    const result = deriveProtocolUrls(service.endpoint);

    if (result) {
      return result;
    }
  }

  return null;
}

export function hasErc8183Declaration(
  services: readonly Pick<AgentProfileService, "serviceType">[],
): boolean {
  return services.some((service) => isErc8183ServiceType(service.serviceType));
}

export function toHiringAgentSummary(profile: AgentProfile): HiringAgentSummary {
  if (!profile.ownerAddress || !isAddress(profile.ownerAddress)) {
    throw new TypeError("A hireable agent must have a valid indexed owner address.");
  }

  return {
    agentId: profile.agentId,
    chainId: profile.chainId,
    imageUrl: profile.imageUrl,
    name: formatAgentName(profile.name, profile.agentId),
    ownerAddress: profile.ownerAddress as Address,
    profileHref: `/agents/${profile.chainId}/${profile.agentId}`,
  };
}

