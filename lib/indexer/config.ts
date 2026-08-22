import { getAddress, type Address } from "viem";
import { bsc, bscTestnet, type Chain } from "viem/chains";
import { z } from "zod";

export const supportedBnbNetworks = ["bsc-testnet", "bsc-mainnet"] as const;
export type SupportedBnbNetwork = (typeof supportedBnbNetworks)[number];

type NetworkDefinition = Readonly<{
  chain: Chain;
  chainId: number;
  defaultRpcUrls: readonly [string, string, string];
  deploymentBlock: bigint;
  explorerUrl: string;
  registryAddress: Address;
}>;

/**
 * Addresses are from the canonical erc-8004/erc-8004-contracts repository and
 * the BNB Agent SDK. Deployment blocks were verified against BSC bytecode
 * history on 2026-08-20 (the prior block had no code).
 */
export const bnbNetworkDefinitions: Readonly<
  Record<SupportedBnbNetwork, NetworkDefinition>
> = {
  "bsc-testnet": {
    chain: bscTestnet,
    chainId: 97,
    defaultRpcUrls: [
      "https://bsc-prebsc-dataseed.bnbchain.org",
      "https://bsc-testnet-rpc.publicnode.com",
      "https://bsc-testnet.drpc.org",
    ],
    deploymentBlock: 84_555_147n,
    explorerUrl:
      "https://testnet.bscscan.com/address/0x8004A818BFB912233c491871b3d84c89A494BD9e",
    registryAddress: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
  },
  "bsc-mainnet": {
    chain: bsc,
    chainId: 56,
    defaultRpcUrls: [
      "https://bsc-mainnet.public.blastapi.io",
      "https://bsc-dataseed-public.bnbchain.org",
      "https://bsc-dataseed.bnbchain.org",
    ],
    deploymentBlock: 79_027_268n,
    explorerUrl:
      "https://bscscan.com/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    registryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
  },
};

export type IndexerConfig = Readonly<{
  batchSize: bigint;
  chain: Chain;
  chainId: number;
  confirmations: bigint;
  deploymentBlock: bigint;
  ipfsGatewayUrl: string;
  metadataConcurrency: number;
  metadataMaxBytes: number;
  metadataRetries: number;
  metadataTimeoutMs: number;
  minBatchSize: bigint;
  network: SupportedBnbNetwork;
  registryAddress: Address;
  rpcEndpoints: readonly [string, ...string[]];
  rpcTimeoutMs: number;
}>;

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export class IndexerConfigError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "IndexerConfigError";
  }
}

function optionalValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseInteger(
  value: string | undefined,
  fallback: number,
  bounds: Readonly<{ max: number; min: number }>,
  name: string,
): number {
  const parsed = z.coerce
    .number()
    .int()
    .min(bounds.min)
    .max(bounds.max)
    .safeParse(optionalValue(value) ?? fallback);

  if (!parsed.success) {
    throw new IndexerConfigError(
      `${name} must be an integer between ${bounds.min} and ${bounds.max}.`,
    );
  }

  return parsed.data;
}

function parseBlock(
  value: string | undefined,
  fallback: bigint,
  name: string,
): bigint {
  const raw = optionalValue(value);

  if (!raw) {
    return fallback;
  }

  if (!/^(0|[1-9][0-9]*)$/.test(raw)) {
    throw new IndexerConfigError(`${name} must be a non-negative block number.`);
  }

  const block = BigInt(raw);

  if (block > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new IndexerConfigError(`${name} exceeds JavaScript's safe integer range.`);
  }

  return block;
}

function parseHttpUrl(value: string, name: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch (error) {
    throw new IndexerConfigError(`${name} must be a valid HTTP(S) URL.`, {
      cause: error,
    });
  }

  if (!url.hostname || !["http:", "https:"].includes(url.protocol)) {
    throw new IndexerConfigError(`${name} must be a valid HTTP(S) URL.`);
  }

  if (url.username || url.password) {
    throw new IndexerConfigError(`${name} must not contain URL credentials.`);
  }

  return url.toString().replace(/\/$/, "");
}

function parseAddress(value: string | undefined, fallback: Address): Address {
  try {
    return getAddress(optionalValue(value) ?? fallback);
  } catch (error) {
    throw new IndexerConfigError(
      "ERC8004_REGISTRY_ADDRESS must be a 20-byte EVM address.",
      { cause: error },
    );
  }
}

export function parseIndexerConfig(source: EnvironmentSource): IndexerConfig {
  const networkValue = optionalValue(source.BNB_NETWORK) ?? "bsc-testnet";
  const networkResult = z.enum(supportedBnbNetworks).safeParse(networkValue);

  if (!networkResult.success) {
    throw new IndexerConfigError(
      `BNB_NETWORK must be one of: ${supportedBnbNetworks.join(", ")}.`,
    );
  }

  const network = networkResult.data;
  const definition = bnbNetworkDefinitions[network];
  const configuredRpcValues = [
    source.BNB_RPC_PRIMARY,
    source.BNB_RPC_FALLBACK_1,
    source.BNB_RPC_FALLBACK_2,
  ].map(optionalValue);
  const rpcValues = definition.defaultRpcUrls.map(
    (defaultValue, index) => configuredRpcValues[index] ?? defaultValue,
  );

  const rpcEndpoints = rpcValues.map((value, index) =>
    parseHttpUrl(value, `BNB RPC endpoint ${index + 1}`),
  ) as [string, ...string[]];
  const batchSize = parseBlock(
    source.INDEXER_BATCH_SIZE,
    50_000n,
    "INDEXER_BATCH_SIZE",
  );
  const minBatchSize = parseBlock(
    source.INDEXER_MIN_BATCH_SIZE,
    100n,
    "INDEXER_MIN_BATCH_SIZE",
  );

  if (batchSize === 0n || minBatchSize === 0n || minBatchSize > batchSize) {
    throw new IndexerConfigError(
      "Indexer batch sizes must be positive and the minimum cannot exceed the maximum.",
    );
  }

  return Object.freeze({
    batchSize,
    chain: definition.chain,
    chainId: definition.chainId,
    confirmations: BigInt(
      parseInteger(
        source.INDEXER_CONFIRMATIONS,
        15,
        { min: 1, max: 10_000 },
        "INDEXER_CONFIRMATIONS",
      ),
    ),
    deploymentBlock: parseBlock(
      source.ERC8004_DEPLOYMENT_BLOCK,
      definition.deploymentBlock,
      "ERC8004_DEPLOYMENT_BLOCK",
    ),
    ipfsGatewayUrl: `${parseHttpUrl(
      optionalValue(source.IPFS_GATEWAY_URL) ?? "https://ipfs.io/ipfs",
      "IPFS_GATEWAY_URL",
    )}/`,
    metadataConcurrency: parseInteger(
      source.INDEXER_METADATA_CONCURRENCY,
      4,
      { min: 1, max: 16 },
      "INDEXER_METADATA_CONCURRENCY",
    ),
    metadataMaxBytes: parseInteger(
      source.INDEXER_METADATA_MAX_BYTES,
      512_000,
      { min: 1_024, max: 5_000_000 },
      "INDEXER_METADATA_MAX_BYTES",
    ),
    metadataRetries: parseInteger(
      source.INDEXER_METADATA_RETRIES,
      2,
      { min: 0, max: 5 },
      "INDEXER_METADATA_RETRIES",
    ),
    metadataTimeoutMs: parseInteger(
      source.INDEXER_METADATA_TIMEOUT_MS,
      8_000,
      { min: 500, max: 60_000 },
      "INDEXER_METADATA_TIMEOUT_MS",
    ),
    minBatchSize,
    network,
    registryAddress: parseAddress(
      source.ERC8004_REGISTRY_ADDRESS,
      definition.registryAddress,
    ),
    rpcEndpoints,
    rpcTimeoutMs: parseInteger(
      source.INDEXER_RPC_TIMEOUT_MS,
      12_000,
      { min: 500, max: 60_000 },
      "INDEXER_RPC_TIMEOUT_MS",
    ),
  });
}
