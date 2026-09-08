import { loadEnvConfig } from "@next/env";

import { parseActivationCheckConfig } from "@/features/activation/config";
import { runActivationChecks } from "@/features/activation/run";
import { createActivationRepository } from "@/lib/db/activation-repository";
import { createLogger, sanitizeError } from "@/lib/indexer/logger";

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const config = parseActivationCheckConfig(process.env);
  const logger = createLogger();

  if (process.argv[2] === "smoke") {
    logger.info("activation_check_smoke_complete", config);
    return;
  }
  if (process.argv[2] !== undefined) {
    throw new Error(
      "Activation command accepts only the optional smoke argument.",
    );
  }
  await runActivationChecks(config, {
    logger,
    repository: createActivationRepository(),
  });
}

main().catch((error: unknown) => {
  createLogger((line) => process.stderr.write(`${line}\n`)).error(
    "activation_check_failed",
    sanitizeError(error),
  );
  process.exitCode = 1;
});
