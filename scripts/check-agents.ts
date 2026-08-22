import { loadEnvConfig } from "@next/env";

import { parseHealthCheckConfig } from "@/features/health/config";
import { runHealthChecks } from "@/features/health/run";
import { createHealthRepository } from "@/lib/db/health-repository";
import {
  createLogger,
  sanitizeError,
} from "@/lib/indexer/logger";

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const config = parseHealthCheckConfig(process.env);
  const logger = createLogger();

  if (process.argv[2] === "smoke") {
    logger.info("health_check_smoke_complete", {
      concurrency: config.concurrency,
      intervalHours: config.intervalHours,
      limit: config.limit,
      maxBytes: config.maxBytes,
      retries: config.retries,
      timeoutMs: config.timeoutMs,
    });
    return;
  }

  if (process.argv[2] !== undefined) {
    throw new Error("Health command accepts only the optional smoke argument.");
  }

  await runHealthChecks(config, {
    logger,
    repository: createHealthRepository(),
  });
}

main().catch((error: unknown) => {
  const logger = createLogger((line) => process.stderr.write(`${line}\n`));
  logger.error("health_check_failed", sanitizeError(error));
  process.exitCode = 1;
});
