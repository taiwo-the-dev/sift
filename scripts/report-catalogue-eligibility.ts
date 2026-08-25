import { loadEnvConfig } from "@next/env";

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const { createCatalogueStatusRepository } = await import(
    "@/lib/db/catalogue-status-repository"
  );
  const observedAt = new Date();
  const networks = await createCatalogueStatusRepository().list(observedAt);

  process.stdout.write(
    `${JSON.stringify(
      {
        event: "catalogue_eligibility_report",
        hiringPolicy: {
          mainnetWritesEnabled: false,
          supportedActivationChainId: 97,
        },
        networks,
        observedAt: observedAt.toISOString(),
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
      : "Unknown catalogue eligibility report failure.";
  process.stderr.write(`[FAIL] ${message}\n`);
  process.exitCode = 1;
});
