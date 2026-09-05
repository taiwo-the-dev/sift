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

const reservedHostnames = new Set([
  "example.com",
  "example.net",
  "example.org",
  "localhost",
  "www.example.com",
  "www.example.net",
  "www.example.org",
]);

const supportedServiceVersionPattern = /^(?:0|1)(?:\.\d+){0,2}$/;

export type HiringCompatibilityCode =
  | "compatible"
  | "inactive-agent"
  | "invalid-metadata"
  | "missing-owner"
  | "missing-service"
  | "unsupported-network"
  | "unsupported-service-version"
  | "unsafe-endpoint";

export type HiringCompatibilityCheck = Readonly<{
  detail: string;
  key: "endpoint" | "identity" | "metadata" | "network" | "service";
  label: string;
  status: "pass" | "fail";
}>;

export type HiringCompatibilityAssessment = Readonly<{
  checks: readonly HiringCompatibilityCheck[];
  code: HiringCompatibilityCode;
  compatibility: HiringCompatibility | null;
  explanation: string;
  title: string;
}>;

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
    reservedHostnames.has(hostname) ||
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

function versionIsSupported(version: string | null): boolean {
  return (
    version === null ||
    version.trim() === "" ||
    supportedServiceVersionPattern.test(version.trim())
  );
}

function compatibilityCheck(
  key: HiringCompatibilityCheck["key"],
  label: string,
  status: HiringCompatibilityCheck["status"],
  detail: string,
): HiringCompatibilityCheck {
  return { detail, key, label, status };
}

function compatibilityAssessment(
  code: HiringCompatibilityCode,
  title: string,
  explanation: string,
  checks: readonly HiringCompatibilityCheck[],
  compatibility: HiringCompatibility | null = null,
): HiringCompatibilityAssessment {
  return { checks, code, compatibility, explanation, title };
}

/**
 * Static eligibility gate for Sift's one supported activation path. Passing
 * this gate never bypasses the live status, quote, deployment, allowance, and
 * receipt checks performed later in the flow.
 */
export function assessHiringCompatibility(
  profile: Pick<AgentProfile, "active" | "chainId" | "metadataStatus" | "ownerAddress" | "services">,
): HiringCompatibilityAssessment {
  const checks: HiringCompatibilityCheck[] = [];

  if (profile.chainId !== HIRING_CHAIN_ID) {
    checks.push(compatibilityCheck("network", "BSC Testnet", "fail", `Found chain ${profile.chainId}; activation requires chain 97.`));
    return compatibilityAssessment(
      "unsupported-network",
      "Activation is testnet-only",
      "This identity is not registered on Sift's supported BSC Testnet activation network.",
      checks,
    );
  }
  checks.push(compatibilityCheck("network", "BSC Testnet", "pass", "Indexed on chain 97."));

  if (profile.metadataStatus !== "valid") {
    checks.push(compatibilityCheck("metadata", "Validated metadata", "fail", `Indexed metadata is ${profile.metadataStatus}.`));
    return compatibilityAssessment(
      "invalid-metadata",
      "Metadata is not currently validated",
      "Sift cannot bind an activation to agent details that failed or have not completed validation.",
      checks,
    );
  }
  checks.push(compatibilityCheck("metadata", "Validated metadata", "pass", "The indexed metadata passed validation."));

  if (profile.active === false) {
    checks.push(compatibilityCheck("identity", "Active identity", "fail", "The indexed identity is declared inactive."));
    return compatibilityAssessment(
      "inactive-agent",
      "This identity is inactive",
      "The agent has been marked inactive, so Sift will not request a quote or prepare a transaction.",
      checks,
    );
  }

  if (!profile.ownerAddress || !isAddress(profile.ownerAddress)) {
    checks.push(compatibilityCheck("identity", "Verified owner", "fail", "No valid indexed EVM owner is available."));
    return compatibilityAssessment(
      "missing-owner",
      "A verified owner is unavailable",
      "Sift needs the indexed owner to verify the provider status and signed quote.",
      checks,
    );
  }
  checks.push(compatibilityCheck("identity", "Verified owner", "pass", "A valid indexed EVM owner is available."));

  const declarations = profile.services.filter((service) =>
    isErc8183ServiceType(service.serviceType),
  );

  if (declarations.length === 0) {
    checks.push(compatibilityCheck("service", "ERC-8183 service", "fail", "No ERC-8183 service is declared in indexed metadata."));
    return compatibilityAssessment(
      "missing-service",
      "No supported hiring service is declared",
      "This agent can still be inspected, but it has not published the ERC-8183 service Sift needs for activation.",
      checks,
    );
  }

  const supportedDeclarations = declarations.filter((service) =>
    versionIsSupported(service.version),
  );

  if (supportedDeclarations.length === 0) {
    checks.push(compatibilityCheck("service", "Supported ERC-8183 version", "fail", "The declared service version is outside Sift's reviewed 0.x/1.x contract."));
    return compatibilityAssessment(
      "unsupported-service-version",
      "The service version is not supported",
      "Sift supports current 0.x and 1.x ERC-8183 declarations and fails closed for unknown major versions.",
      checks,
    );
  }
  checks.push(compatibilityCheck("service", "Supported ERC-8183 service", "pass", "A reviewed 0.x, 1.x, or unversioned declaration is present."));

  for (const service of supportedDeclarations) {
    if (!service.endpoint) continue;
    const compatibility = deriveProtocolUrls(service.endpoint);

    if (compatibility) {
      checks.push(compatibilityCheck("endpoint", "Public task endpoint", "pass", "A public HTTPS status and negotiation path can be derived."));
      return compatibilityAssessment(
        "compatible",
        "Ready for live compatibility checks",
        "The declaration passed static checks. Sift will still verify the live service, signed quote, deployment, and receipts.",
        checks,
        compatibility,
      );
    }
  }

  checks.push(compatibilityCheck("endpoint", "Public task endpoint", "fail", "No safe public HTTPS endpoint can be derived from the declaration."));
  return compatibilityAssessment(
    "unsafe-endpoint",
    "A safe public task endpoint is unavailable",
    "The declaration is missing an endpoint or uses credentials, query parameters, a placeholder host, a non-HTTPS URL, or a non-standard port.",
    checks,
  );
}

export function resolveHiringCompatibility(
  profile: Pick<AgentProfile, "active" | "chainId" | "metadataStatus" | "ownerAddress" | "services">,
): HiringCompatibility | null {
  return assessHiringCompatibility(profile).compatibility;
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
