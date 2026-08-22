export type BlockRange = Readonly<{
  fromBlock: bigint;
  toBlock: bigint;
}>;

export function calculateConfirmedHead(
  latestBlock: bigint,
  confirmations: bigint,
): bigint | null {
  if (latestBlock < 0n || confirmations < 1n) {
    throw new RangeError("Block values must be non-negative and confirmations positive.");
  }

  return latestBlock < confirmations ? null : latestBlock - confirmations;
}

export function nextBlockRange(
  fromBlock: bigint,
  confirmedHead: bigint,
  batchSize: bigint,
): BlockRange | null {
  if (fromBlock < 0n || confirmedHead < 0n || batchSize < 1n) {
    throw new RangeError("Block range inputs are invalid.");
  }

  if (fromBlock > confirmedHead) {
    return null;
  }

  return {
    fromBlock,
    toBlock:
      fromBlock + batchSize - 1n > confirmedHead
        ? confirmedHead
        : fromBlock + batchSize - 1n,
  };
}

export function reduceBatchSize(
  currentSize: bigint,
  minimumSize: bigint,
): bigint | null {
  if (currentSize <= minimumSize) {
    return null;
  }

  const reduced = currentSize / 2n;
  return reduced < minimumSize ? minimumSize : reduced;
}
