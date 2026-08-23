import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createHiringResumeToken,
  isHiringIdempotencyKey,
  isHiringResumeToken,
} from "../../features/hiring/idempotency";

describe("hiring idempotency identifiers", () => {
  it("accepts UUID v4 keys and rejects ambiguous identifiers", () => {
    assert.equal(isHiringIdempotencyKey("550e8400-e29b-41d4-a716-446655440000"), true);
    assert.equal(isHiringIdempotencyKey("550e8400-e29b-11d4-a716-446655440000"), false);
    assert.equal(isHiringIdempotencyKey("not-a-key"), false);
  });

  it("creates distinct 256-bit browser resume capabilities", () => {
    const first = createHiringResumeToken();
    const second = createHiringResumeToken();

    assert.equal(isHiringResumeToken(first), true);
    assert.equal(isHiringResumeToken(second), true);
    assert.notEqual(first, second);
  });
});
