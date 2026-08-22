import {
  decodeEventLog,
  type Address,
  type Hex,
} from "viem";

import { identityRegistryAbi } from "@/lib/indexer/abi";

export type RegistryRawLog = Readonly<{
  blockNumber: bigint;
  data: Hex;
  logIndex: number;
  topics: readonly Hex[];
  transactionHash: Hex;
}>;

type EventProvenance = Readonly<{
  blockNumber: bigint;
  logIndex: number;
  transactionHash: Hex;
}>;

export type RegisteredEvent = EventProvenance &
  Readonly<{
    agentId: bigint;
    agentUri: string;
    kind: "registered";
    owner: Address;
  }>;

export type UriUpdatedEvent = EventProvenance &
  Readonly<{
    agentId: bigint;
    kind: "uri-updated";
    newUri: string;
    updatedBy: Address;
  }>;

export type TransferEvent = EventProvenance &
  Readonly<{
    agentId: bigint;
    from: Address;
    kind: "transfer";
    to: Address;
  }>;

export type RegistryEvent = RegisteredEvent | TransferEvent | UriUpdatedEvent;

export function decodeRegistryLog(log: RegistryRawLog): RegistryEvent | null {
  if (log.topics.length === 0) {
    return null;
  }

  try {
    const decoded = decodeEventLog({
      abi: identityRegistryAbi,
      data: log.data,
      strict: true,
      topics: log.topics as [Hex, ...Hex[]],
    });
    const provenance = {
      blockNumber: log.blockNumber,
      logIndex: log.logIndex,
      transactionHash: log.transactionHash,
    };

    switch (decoded.eventName) {
      case "Registered":
        return {
          ...provenance,
          agentId: decoded.args.agentId,
          agentUri: decoded.args.agentURI,
          kind: "registered",
          owner: decoded.args.owner,
        };
      case "URIUpdated":
        return {
          ...provenance,
          agentId: decoded.args.agentId,
          kind: "uri-updated",
          newUri: decoded.args.newURI,
          updatedBy: decoded.args.updatedBy,
        };
      case "Transfer":
        return {
          ...provenance,
          agentId: decoded.args.tokenId,
          from: decoded.args.from,
          kind: "transfer",
          to: decoded.args.to,
        };
    }
  } catch {
    return null;
  }
}

export function decodeRegistryLogs(
  logs: readonly RegistryRawLog[],
): RegistryEvent[] {
  return logs
    .map(decodeRegistryLog)
    .filter((event): event is RegistryEvent => event !== null)
    .sort((left, right) => {
      if (left.blockNumber === right.blockNumber) {
        return left.logIndex - right.logIndex;
      }

      return left.blockNumber < right.blockNumber ? -1 : 1;
    });
}
