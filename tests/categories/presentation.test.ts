import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldShowOtherCategory } from "../../features/categories/presentation";

describe("category presentation", () => {
  it("uses Other for a valid profile outside the supported taxonomy", () => {
    assert.equal(shouldShowOtherCategory("valid", []), true);
  });

  it("does not replace real category evidence or unknown metadata with Other", () => {
    assert.equal(
      shouldShowOtherCategory("valid", ["grid-trading"]),
      false,
    );
    assert.equal(shouldShowOtherCategory("invalid", []), false);
    assert.equal(shouldShowOtherCategory("unavailable", []), false);
    assert.equal(shouldShowOtherCategory("pending", []), false);
  });
});
