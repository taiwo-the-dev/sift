import {
  createPublicClient,
  http,
  type Address,
  type Chain,
  type Hex,
  type PublicClient,
  type Transport,
} from "viem";

import {
  identityRegistryAbi,
  identityRegistryEvents,
} from "@/lib/indexer/abi";
import type { IndexerConfig } from "@/lib/indexer/config";
import {
  type Logger,
  sanitizeError,
} from "@/lib/indexer/logger";
import type { RegistryRawLog } from "@/lib/indexer/registry-events";

export type RegistryRpcProvider = Readonly<{
  getBlockNumber(): Promise<bigint>;
  getBlockTimestamp(blockNumber: bigint): Promise<bigint>;
  getBytecode(address: Address): Promise<Hex | undefined>;
  getChainId(): Promise<number>;
  getLogs(
    address: Address,
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<readonly RegistryRawLog[]>;
  name: string;
  ownerOf(
    address: Address,
    agentId: bigint,
    blockNumber: bigint,
  ): Promise<Address>;
  tokenUri(
    address: Address,
    agentId: bigint,
    blockNumber: bigint,
  ): Promise<string>;
}>;

type ViemClient = PublicClient<Transport, Chain>;

function createViemProvider(
  chain: Chain,
  endpoint: string,
  index: number,
  timeoutMs: number,
): RegistryRpcProvider {
  const client: ViemClient = createPublicClient({
    chain,
    transport: http(endpoint, {
      retryCount: 0,
      timeout: timeoutMs,
    }),
  });

  return {
    getBlockNumber: () => client.getBlockNumber(),
    async getBlockTimestamp(blockNumber) {
      const block = await client.getBlock({ blockNumber });
      return block.timestamp;
    },
    getBytecode: (address) => client.getBytecode({ address }),
    getChainId: () => client.getChainId(),
    async getLogs(address, fromBlock, toBlock) {
      const logs = await client.getLogs({
        address,
        events: identityRegistryEvents,
        fromBlock,
        strict: true,
        toBlock,
      });

      return logs.flatMap((log) => {
        if (
          log.blockNumber === null ||
          log.logIndex === null ||
          log.transactionHash === null
        ) {
          return [];
        }

        return [
          {
            blockNumber: log.blockNumber,
            data: log.data,
            logIndex: log.logIndex,
            topics: log.topics,
            transactionHash: log.transactionHash,
          },
        ];
      });
    },
    name: `rpc-${index + 1}`,
    ownerOf: (address, agentId, blockNumber) =>
      client.readContract({
        abi: identityRegistryAbi,
        address,
        args: [agentId],
        blockNumber,
        functionName: "ownerOf",
      }),
    tokenUri: (address, agentId, blockNumber) =>
      client.readContract({
        abi: identityRegistryAbi,
        address,
        args: [agentId],
        blockNumber,
        functionName: "tokenURI",
      }),
  };
}

export class RpcPoolError extends Error {
  readonly operation: string;

  constructor(operation: string, causes: readonly unknown[]) {
    super(`All configured RPC providers failed during ${operation}.`, {
      cause: causes.at(-1),
    });
    this.name = "RpcPoolError";
    this.operation = operation;
  }
}

export class RegistryRpcPool {
  private providers: readonly RegistryRpcProvider[];

  constructor(
    providers: readonly RegistryRpcProvider[],
    private readonly logger: Logger,
  ) {
    if (providers.length === 0) {
      throw new TypeError("At least one RPC provider is required.");
    }

    this.providers = providers;
  }

  async validate(chainId: number, registryAddress: Address): Promise<void> {
    const validProviders: RegistryRpcProvider[] = [];

    for (const provider of this.providers) {
      try {
        const actualChainId = await provider.getChainId();

        if (actualChainId !== chainId) {
          throw new Error(
            `Expected chain ${chainId}, received chain ${actualChainId}.`,
          );
        }

        validProviders.push(provider);
      } catch (error) {
        this.logger.warn("rpc_validation_failed", {
          provider: provider.name,
          ...sanitizeError(error),
        });
      }
    }

    if (validProviders.length === 0) {
      throw new RpcPoolError("network validation", []);
    }

    this.providers = validProviders;
    await this.execute("registry bytecode check", async (provider) => {
      const bytecode = await provider.getBytecode(registryAddress);

      if (!bytecode || bytecode === "0x") {
        throw new Error("The configured ERC-8004 registry has no contract code.");
      }
    });
  }

  getBlockNumber(): Promise<bigint> {
    return this.execute("read latest block", (provider) =>
      provider.getBlockNumber(),
    );
  }

  getBlockTimestamp(blockNumber: bigint): Promise<bigint> {
    return this.execute("read block timestamp", (provider) =>
      provider.getBlockTimestamp(blockNumber),
    );
  }

  getLogs(
    address: Address,
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<readonly RegistryRawLog[]> {
    return this.execute("read registry logs", (provider) =>
      provider.getLogs(address, fromBlock, toBlock),
    );
  }

  ownerOf(
    address: Address,
    agentId: bigint,
    blockNumber: bigint,
  ): Promise<Address> {
    return this.execute("read agent owner", (provider) =>
      provider.ownerOf(address, agentId, blockNumber),
    );
  }

  tokenUri(
    address: Address,
    agentId: bigint,
    blockNumber: bigint,
  ): Promise<string> {
    return this.execute("read agent URI", (provider) =>
      provider.tokenUri(address, agentId, blockNumber),
    );
  }

  private async execute<T>(
    operation: string,
    action: (provider: RegistryRpcProvider) => Promise<T>,
  ): Promise<T> {
    const errors: unknown[] = [];

    for (const [index, provider] of this.providers.entries()) {
      try {
        const result = await action(provider);

        if (index > 0) {
          this.logger.info("rpc_fallback_used", {
            operation,
            provider: provider.name,
          });
        }

        return result;
      } catch (error) {
        errors.push(error);
        this.logger.warn("rpc_request_failed", {
          operation,
          provider: provider.name,
          ...sanitizeError(error),
        });
      }
    }

    throw new RpcPoolError(operation, errors);
  }
}

export function createRegistryRpcPool(
  config: IndexerConfig,
  logger: Logger,
): RegistryRpcPool {
  return new RegistryRpcPool(
    config.rpcEndpoints.map((endpoint, index) =>
      createViemProvider(config.chain, endpoint, index, config.rpcTimeoutMs),
    ),
    logger,
  );
}
