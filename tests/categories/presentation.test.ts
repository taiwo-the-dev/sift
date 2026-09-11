import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldShowOtherCategory } from "../../features/categories/presentation";

describe("category presentation", () => {
  it("labels any agent with no matched category as Other", () => {
    assert.equal(shouldShowOtherCategory([]), true);
  });

  it("does not replace real category evidence with Other", () => {
    assert.equal(shouldShowOtherCategory(["grid-trading"]), false);
  });
});
