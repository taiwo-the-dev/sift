import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateConfirmedHead,
  nextBlockRange,
  reduceBatchSize,
} from "../../lib/indexer/ranges";

describe("block range calculation", () => {
  it("applies confirmations and caps the final range", () => {
    assert.equal(calculateConfirmedHead(1_000n, 15n), 985n);
    assert.deepEqual(nextBlockRange(900n, 985n, 50n), {
      fromBlock: 900n,
      toBlock: 949n,
    });
    assert.deepEqual(nextBlockRange(950n, 985n, 50n), {
      fromBlock: 950n,
      toBlock: 985n,
    });
  });

  it("does not create an empty range and stops reducing at the minimum", () => {
    assert.equal(nextBlockRange(986n, 985n, 50n), null);
    assert.equal(reduceBatchSize(1_000n, 100n), 500n);
    assert.equal(reduceBatchSize(101n, 100n), 100n);
    assert.equal(reduceBatchSize(100n, 100n), null);
  });
});
