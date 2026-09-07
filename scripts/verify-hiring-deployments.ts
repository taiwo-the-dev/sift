import { loadEnvConfig } from "@next/env";

import { hiringChainIds } from "@/features/hiring/protocol";

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const [{ getErc8183Deployment }, { verifyErc8183Runtime }] =
    await Promise.all([
      import("@/features/hiring/protocol"),
      import("@/lib/blockchain/hiring-client"),
    ]);
  const results = [];

  for (const chainId of hiringChainIds) {
    const deployment = getErc8183Deployment(chainId);
    const runtime = await verifyErc8183Runtime(chainId);

    results.push({
      chainId,
      commerce: deployment.commerce,
      disputeWindowSeconds: runtime.disputeWindowSeconds,
      network: deployment.network,
      observedBlockTimestamp: new Date(
        runtime.blockTimestamp * 1_000,
      ).toISOString(),
      paymentToken: deployment.paymentToken,
      platformFeeBasisPoints: runtime.platformFeeBasisPoints,
      policy: deployment.policy,
      router: deployment.router,
      status: "verified",
    });
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        event: "erc8183_deployments_verified",
        observedAt: new Date().toISOString(),
        results,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "Unknown ERC-8183 deployment verification failure.";
  process.stderr.write(`[FAIL] ${message}\n`);
  process.exitCode = 1;
});
