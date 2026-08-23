import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canTransitionHiringIntent,
  canTransitionHiringTransaction,
  describeTransactionStep,
  nextTransactionStep,
} from "../../features/hiring/state";

describe("hiring state transitions", () => {
  it("allows resumable intent states but keeps confirmed terminal", () => {
    assert.equal(canTransitionHiringIntent("awaiting_wallet", "submitted"), true);
    assert.equal(canTransitionHiringIntent("submitted", "replaced"), true);
    assert.equal(canTransitionHiringIntent("cancelled", "awaiting_wallet"), true);
    assert.equal(canTransitionHiringIntent("confirmed", "submitted"), false);
  });

  it("keeps confirmed transaction evidence terminal", () => {
    assert.equal(canTransitionHiringTransaction("submitted", "confirmed"), true);
    assert.equal(canTransitionHiringTransaction("replaced", "confirmed"), true);
    assert.equal(canTransitionHiringTransaction("confirmed", "submitted"), false);
  });

  it("selects exact approval only when the live allowance requires it", () => {
    const completed = ["create_job", "register_job", "set_budget"] as const;
    assert.equal(nextTransactionStep(completed, true), "approve_token");
    assert.equal(nextTransactionStep(completed, false), "fund_job");
    assert.match(describeTransactionStep("approve_token"), /exact/i);
  });
});
