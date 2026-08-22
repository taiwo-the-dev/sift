import { loadEnvConfig } from "@next/env";

import { parseIndexerConfig } from "@/lib/indexer/config";
import { createLogger, sanitizeError } from "@/lib/indexer/logger";
import { createMetadataClientFromConfig } from "@/lib/indexer/metadata/fetch";
import { createCatalogPersistence } from "@/lib/indexer/persistence";
import { createRegistryRpcPool } from "@/lib/indexer/rpc";
import {
  runIndexer,
  runIndexerSmokeTest,
  type IndexerMode,
} from "@/lib/indexer/sync";

type Command = IndexerMode | "smoke";

function parseCommand(value: string | undefined): Command {
  if (value === "bootstrap" || value === "incremental" || value === "smoke") {
    return value;
  }

  throw new Error(
    "Indexer command must be bootstrap, incremental, or smoke.",
  );
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const command = parseCommand(process.argv[2]);
  const config = parseIndexerConfig(process.env);
  const logger = createLogger();
  const rpc = createRegistryRpcPool(config, logger);

  if (command === "smoke") {
    await runIndexerSmokeTest(config, { logger, rpc });
    return;
  }

  await runIndexer(command, config, {
    logger,
    metadata: createMetadataClientFromConfig(config),
    persistence: createCatalogPersistence(),
    rpc,
  });
}

main().catch((error: unknown) => {
  const logger = createLogger((line) => process.stderr.write(`${line}\n`));
  logger.error("indexer_failed", sanitizeError(error));
  process.exitCode = 1;
});
