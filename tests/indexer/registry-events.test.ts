import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encodeAbiParameters,
  encodeEventTopics,
  type Hex,
} from "viem";

import { identityRegistryAbi } from "../../lib/indexer/abi";
import {
  decodeRegistryLog,
  decodeRegistryLogs,
  type RegistryRawLog,
} from "../../lib/indexer/registry-events";

const owner = "0x1111111111111111111111111111111111111111";
const nextOwner = "0x2222222222222222222222222222222222222222";
const transactionHash = `0x${"ab".repeat(32)}` as Hex;

function registeredLog(blockNumber = 100n): RegistryRawLog {
  return {
    blockNumber,
    data: encodeAbiParameters([{ type: "string" }], ["ipfs://bafyagent"]),
    logIndex: 2,
    topics: encodeEventTopics({
      abi: identityRegistryAbi,
      args: { agentId: 7n, owner },
      eventName: "Registered",
    }).flatMap((topic) => (typeof topic === "string" ? [topic] : [])),
    transactionHash,
  };
}

describe("ERC-8004 event decoding", () => {
  it("decodes a canonical Registered event without losing uint256 precision", () => {
    assert.deepEqual(decodeRegistryLog(registeredLog()), {
      agentId: 7n,
      agentUri: "ipfs://bafyagent",
      blockNumber: 100n,
      kind: "registered",
      logIndex: 2,
      owner,
      transactionHash,
    });
  });

  it("ignores unrelated proxy events and orders decoded events", () => {
    const unrelated: RegistryRawLog = {
      ...registeredLog(99n),
      topics: [`0x${"ff".repeat(32)}`],
    };

    assert.equal(decodeRegistryLog(unrelated), null);
    assert.deepEqual(
      decodeRegistryLogs([registeredLog(101n), registeredLog(100n)]).map(
        (event) => event.blockNumber,
      ),
      [100n, 101n],
    );
  });

  it("decodes URI and ownership changes", () => {
    const uriUpdated: RegistryRawLog = {
      ...registeredLog(),
      data: encodeAbiParameters(
        [{ type: "string" }],
        ["https://agent.example/new.json"],
      ),
      topics: encodeEventTopics({
        abi: identityRegistryAbi,
        args: { agentId: 7n, updatedBy: owner },
        eventName: "URIUpdated",
      }).flatMap((topic) => (typeof topic === "string" ? [topic] : [])),
    };
    const transfer: RegistryRawLog = {
      ...registeredLog(),
      data: "0x",
      topics: encodeEventTopics({
        abi: identityRegistryAbi,
        args: { from: owner, to: nextOwner, tokenId: 7n },
        eventName: "Transfer",
      }).flatMap((topic) => (typeof topic === "string" ? [topic] : [])),
    };

    assert.equal(decodeRegistryLog(uriUpdated)?.kind, "uri-updated");
    assert.deepEqual(decodeRegistryLog(transfer), {
      agentId: 7n,
      blockNumber: 100n,
      from: owner,
      kind: "transfer",
      logIndex: 2,
      to: nextOwner,
      transactionHash,
    });
  });
});
