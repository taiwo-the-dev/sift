import { isAddress, type Address } from "viem";

import type { AgentProfile, AgentProfileService } from "@/features/agents/model";
import type {
  HiringAgentSummary,
  HiringCompatibility,
} from "@/features/hiring/model";
import {
  getErc8183Deployment,
  isHiringChainId,
} from "@/features/hiring/protocol";
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
 * Static eligibility gate for Sift's supported hiring paths. Passing
 * this gate never bypasses the live status, quote, deployment, allowance, and
 * receipt checks performed later in the flow.
 */
export function assessHiringCompatibility(
  profile: Pick<AgentProfile, "active" | "chainId" | "metadataStatus" | "ownerAddress" | "services">,
): HiringCompatibilityAssessment {
  const checks: HiringCompatibilityCheck[] = [];

  if (!isHiringChainId(profile.chainId)) {
    checks.push(compatibilityCheck("network", "Supported BNB network", "fail", `Found chain ${profile.chainId}; hiring requires BSC Mainnet (56) or BSC Testnet (97).`));
    return compatibilityAssessment(
      "unsupported-network",
      "Hiring is unavailable on this network",
      "This agent is not registered on a BNB network supported by Sift hiring.",
      checks,
    );
  }
  const deployment = getErc8183Deployment(profile.chainId);
  checks.push(compatibilityCheck("network", deployment.networkName, "pass", `Registered on ${deployment.networkName} (chain ${deployment.chainId}).`));

  if (profile.metadataStatus !== "valid") {
    checks.push(compatibilityCheck("metadata", "Verified profile", "fail", `Profile status: ${profile.metadataStatus}.`));
    return compatibilityAssessment(
      "invalid-metadata",
      "The agent's profile is not verified",
      "Sift cannot hire an agent until its profile passes verification.",
      checks,
    );
  }
  checks.push(compatibilityCheck("metadata", "Verified profile", "pass", "The agent's profile passed verification."));

  if (profile.active === false) {
    checks.push(compatibilityCheck("identity", "Active agent", "fail", "The agent is listed as inactive."));
    return compatibilityAssessment(
      "inactive-agent",
      "This agent is inactive",
      "This agent is inactive. Price quotes and hiring transactions are unavailable.",
      checks,
    );
  }

  if (!profile.ownerAddress || !isAddress(profile.ownerAddress)) {
    checks.push(compatibilityCheck("identity", "Verified owner", "fail", "No valid wallet address is available for the agent owner."));
    return compatibilityAssessment(
      "missing-owner",
      "A verified owner is unavailable",
      "Sift needs the owner's wallet address to verify the agent and its signed price quote.",
      checks,
    );
  }
  checks.push(compatibilityCheck("identity", "Verified owner", "pass", "A valid owner wallet address is available."));

  const declarations = profile.services.filter((service) =>
    isErc8183ServiceType(service.serviceType),
  );

  if (declarations.length === 0) {
    checks.push(compatibilityCheck("service", "ERC-8183 service", "fail", "The agent's profile does not list an ERC-8183 service."));
    return compatibilityAssessment(
      "missing-service",
      "No supported hiring service is listed",
      "This agent can still be viewed, but it has not published the ERC-8183 service Sift needs for hiring.",
      checks,
    );
  }

  const supportedDeclarations = declarations.filter((service) =>
    versionIsSupported(service.version),
  );

  if (supportedDeclarations.length === 0) {
    checks.push(compatibilityCheck("service", "Supported ERC-8183 version", "fail", "Sift does not support the ERC-8183 version listed by this agent."));
    return compatibilityAssessment(
      "unsupported-service-version",
      "The service version is not supported",
      "Sift currently supports ERC-8183 versions 0.x and 1.x. Agents using unknown major versions cannot be hired.",
      checks,
    );
  }
  checks.push(compatibilityCheck("service", "Supported ERC-8183 service", "pass", "A supported 0.x, 1.x, or unversioned service is listed."));

  for (const service of supportedDeclarations) {
    if (!service.endpoint) continue;
    const compatibility = deriveProtocolUrls(service.endpoint);

    if (compatibility) {
      checks.push(compatibilityCheck("endpoint", "Public service address", "pass", "A public HTTPS address is available for status and price checks."));
      return compatibilityAssessment(
        "compatible",
        "Ready for live compatibility checks",
        "The profile passed the first checks. Sift will still verify the live service, signed price quote, contract, and transaction receipts.",
        checks,
        compatibility,
      );
    }
  }

  checks.push(compatibilityCheck("endpoint", "Public service address", "fail", "No safe public HTTPS service address is available."));
  return compatibilityAssessment(
    "unsafe-endpoint",
    "A safe public service address is unavailable",
    "The service address is missing or uses an unsupported URL, credentials, query parameters, host, or port.",
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
  if (!isHiringChainId(profile.chainId)) {
    throw new TypeError("A hireable agent must use a supported BNB network.");
  }

  if (!profile.ownerAddress || !isAddress(profile.ownerAddress)) {
    throw new TypeError("An activatable agent must have a valid owner wallet address.");
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
