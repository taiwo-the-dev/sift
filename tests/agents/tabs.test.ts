import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAgentProfileTabHref,
  parseAgentProfileTab,
} from "../../features/agents/tabs";

describe("agent profile tabs", () => {
  it("accepts supported tabs and defaults invalid input to overview", () => {
    assert.equal(parseAgentProfileTab("services"), "services");
    assert.equal(parseAgentProfileTab(["trust", "metadata"]), "trust");
    assert.equal(parseAgentProfileTab("not-a-tab"), "overview");
    assert.equal(parseAgentProfileTab(undefined), "overview");
  });

  it("builds shareable tab URLs and preserves comparison intent", () => {
    assert.equal(
      buildAgentProfileTabHref(56, "1887", "overview"),
      "/agents/56/1887",
    );
    assert.equal(
      buildAgentProfileTabHref(
        56,
        "1887",
        "services",
        "Protect my loan",
      ),
      "/agents/56/1887?tab=services&goal=Protect+my+loan",
    );
  });
});
