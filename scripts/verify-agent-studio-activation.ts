import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { loadEnvConfig } from "@next/env";
import { getAddress as getSdkDeployment, knownPaymentTokens } from "@bnbagent/sdk/networks";
import { getAddress } from "viem";

import { categorySlugs, type CategorySlug } from "@/features/categories/taxonomy";
import { assessHiringCompatibility } from "@/features/hiring/compatibility";
import { getErc8183Deployment } from "@/features/hiring/protocol";
import { parseAgentCommerceStatus } from "@/features/hiring/quote";
import { fetchSafeAgentJson } from "@/features/hiring/remote";

type Candidate = Readonly<{ agentId: string; category: CategorySlug }>;
const verificationChainId = 56 as const;
const verificationNetwork = "bsc-mainnet" as const;
const verificationDeployment = getErc8183Deployment(verificationChainId);

function packageVersion(packageName: string): string {
  const manifestPath = join(process.cwd(), "node_modules", ...packageName.split("/"), "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Readonly<{
    version?: unknown;
  }>;

  if (typeof manifest.version !== "string") {
    throw new Error(`Could not read the installed ${packageName} version.`);
  }

  return manifest.version;
}

function parseCandidates(args: readonly string[]): readonly Candidate[] {
  return args.flatMap((argument) => {
    if (!argument.startsWith("--candidate=")) return [];

    const [category, agentId] = argument.slice("--candidate=".length).split(":");

    if (
      !categorySlugs.some((slug) => slug === category) ||
      !agentId ||
      !/^(?:0|[1-9][0-9]*)$/.test(agentId)
    ) {
      throw new Error(
        `Invalid candidate "${argument}". Use --candidate=<category>:<decimal-agent-id>.`,
      );
    }

    return [{ agentId, category: category as CategorySlug }];
  });
}

function parseStudioProject(args: readonly string[]): string | null {
  const value = args
    .find((argument) => argument.startsWith("--studio-project="))
    ?.slice("--studio-project=".length)
    .trim();

  return value ? resolve(value) : null;
}

function installedBagPath(): string {
  return join(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "bag.cmd" : "bag",
  );
}

function runBag(args: readonly string[], cwd = process.cwd()): Readonly<{
  detail: string;
  ok: boolean;
}> {
  const result = spawnSync(installedBagPath(), args, {
    cwd,
    encoding: "utf8",
    timeout: 30_000,
  });
  const detail = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();

  return {
    detail: detail.slice(0, 2_000),
    ok: result.status === 0,
  };
}

function verifySdkDeployment(): Readonly<{
  addresses: ReturnType<typeof getSdkDeployment>;
  ok: boolean;
  paymentTokenAllowlisted: boolean;
}> {
  const addresses = getSdkDeployment(verificationDeployment.chainId);
  const paymentTokenAllowlisted = knownPaymentTokens().has(
    `${verificationDeployment.chainId}:${verificationDeployment.paymentToken}`,
  );
  const ok =
    getAddress(addresses.commerceProxy) === verificationDeployment.commerce &&
    getAddress(addresses.routerProxy) === verificationDeployment.router &&
    getAddress(addresses.policy) === verificationDeployment.policy &&
    getAddress(addresses.paymentToken) === verificationDeployment.paymentToken &&
    paymentTokenAllowlisted;

  return { addresses, ok, paymentTokenAllowlisted };
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const args = process.argv.slice(2);
  let candidates = parseCandidates(args);
  const studioProject = parseStudioProject(args);
  const cliVersion = packageVersion("@bnbagent/studio-cli");
  const sdkVersion = packageVersion("@bnbagent/sdk");
  const cliCheck = runBag(["--version"]);
  const sdkCheck = verifySdkDeployment();
  const blockers: string[] = [];

  if (!cliCheck.ok || cliCheck.detail !== cliVersion) {
    blockers.push("The installed Agent Studio CLI did not report its pinned version.");
  }

  if (!sdkCheck.ok) {
    blockers.push("The official SDK deployment does not match Sift's reviewed mainnet deployment.");
  }

  if (!studioProject) {
    blockers.push("A genuine Agent Studio project path was not supplied for the read-only CLI identity check.");
  } else if (
    !existsSync(join(studioProject, "studio.toml")) &&
    !existsSync(join(studioProject, "app", "agent", "studio.toml"))
  ) {
    blockers.push("The supplied Agent Studio project does not contain studio.toml.");
  }

  const { getAgentProfile } = await import("@/features/agents/service");
  const { getHiringPublicClient, verifyErc8183Runtime } = await import(
    "@/lib/blockchain/hiring-client"
  );
  const publicClient = getHiringPublicClient(verificationChainId);
  let runtimeVerified = false;

  if (candidates.length === 0) {
    try {
      const [{ parseDiscoverySearchParams }, { createDiscoveryRepository }] =
        await Promise.all([
          import("@/features/discovery/query"),
          import("@/lib/db/discovery-repository"),
        ]);
      const repository = createDiscoveryRepository();
      const results = await Promise.all(
        categorySlugs.map(async (category) => ({
          category,
          result: await repository.search(
            parseDiscoverySearchParams({
              category,
              metadata: "valid",
              network: verificationNetwork,
              q: "ERC-8183",
              size: "12",
            }),
          ),
        })),
      );
      candidates = results.flatMap(({ category, result }) =>
        result.agents.slice(0, 3).map((agent) => ({
          agentId: agent.agentId,
          category,
        })),
      );
    } catch (error) {
      blockers.push(
        `Sift could not discover real category candidates: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  if (candidates.length === 0) {
    blockers.push("No real indexed category candidates were found or supplied.");
  }

  if (candidates.length > 0 && sdkCheck.ok) {
    try {
      await verifyErc8183Runtime(verificationChainId, publicClient);
      runtimeVerified = true;
    } catch (error) {
      blockers.push(
        `The live mainnet deployment check failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  const candidateResults = await Promise.all(
    candidates.map(async (candidate) => {
      const profile = await getAgentProfile(verificationChainId, candidate.agentId);

      if (!profile) {
        return { ...candidate, ok: false, reason: "The indexed BSC Mainnet identity was not found." };
      }

      if (!profile.categories.includes(candidate.category)) {
        return {
          ...candidate,
          indexedCategories: profile.categories,
          ok: false,
          reason: "The indexed source evidence does not support the claimed category.",
        };
      }

      const staticAssessment = assessHiringCompatibility(profile);

      if (!staticAssessment.compatibility || !profile.ownerAddress) {
        return { ...candidate, code: staticAssessment.code, ok: false, reason: staticAssessment.explanation };
      }

      try {
        const statusDocument = await fetchSafeAgentJson(
          staticAssessment.compatibility.statusUrl,
          { method: "GET" },
        );
        parseAgentCommerceStatus(
          statusDocument,
          getAddress(profile.ownerAddress),
          verificationChainId,
        );
        const cliResolution = studioProject
          ? runBag(
              ["erc8004", "resolve", candidate.agentId, "--network", verificationNetwork],
              studioProject,
            )
          : null;

        return {
          ...candidate,
          cliIdentityResolved: cliResolution?.ok ?? false,
          liveStatusVerified: true,
          ok: runtimeVerified && (cliResolution?.ok ?? false),
          profile: `/agents/${verificationChainId}/${candidate.agentId}`,
          reason:
            cliResolution && !cliResolution.ok
              ? cliResolution.detail || "Agent Studio CLI identity resolution failed."
              : cliResolution
                ? null
                : "A genuine Agent Studio project is required for CLI identity resolution.",
        };
      } catch (error) {
        return {
          ...candidate,
          liveStatusVerified: false,
          ok: false,
          reason: error instanceof Error ? error.message : "The live status check failed.",
        };
      }
    }),
  );

  for (const category of categorySlugs) {
    if (!candidateResults.some((candidate) => candidate.category === category && candidate.ok)) {
      blockers.push(`No source-verified activatable candidate passed for ${category}.`);
    }
  }

  const report = {
    blockers: [...new Set(blockers)],
    candidates: candidateResults,
    event: "agent_studio_activation_readiness",
    observedAt: new Date().toISOString(),
    runtime: {
      chainId: verificationDeployment.chainId,
      verified: runtimeVerified,
    },
    status: blockers.length === 0 ? "ready-for-human-activation" : "blocked",
    tooling: {
      cli: {
        command: `bag erc8004 resolve <agent-id> --network ${verificationNetwork}`,
        installedVersion: cliVersion,
        versionCheck: cliCheck,
      },
      sdk: {
        deployment: sdkCheck,
        installedVersion: sdkVersion,
      },
    },
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status === "blocked") process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown activation readiness failure.";
  process.stderr.write(`[FAIL] ${message}\n`);
  process.exitCode = 1;
});
