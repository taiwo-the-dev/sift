import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { describeHiringError } from "../../features/hiring/error-presentation";

describe("hiring error presentation", () => {
  it("turns an empty call-revert response into a recoverable funding message", () => {
    const result = describeHiringError(
      new Error("An error occurred while executing calls. Reason: 0x Details: 0x"),
    );

    assert.equal(result.title, "The permission was not created");
    assert.match(result.message, /enough BNB/i);
    assert.match(result.technicalDetails ?? "", /Reason: 0x/);
  });

  it("makes a rejected wallet request clear and non-alarming", () => {
    const result = describeHiringError(new Error("User rejected the request"));

    assert.equal(result.title, "The request was cancelled");
    assert.match(result.message, /Nothing was submitted/);
  });

  it("does not replace an unfamiliar actionable message", () => {
    const result = describeHiringError(new Error("The quote signature is invalid."));

    assert.equal(result.message, "The quote signature is invalid.");
  });
});
