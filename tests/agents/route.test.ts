import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAgentProfileHref,
  parseAgentProfileIdentity,
} from "../../features/agents/route";

describe("agent profile route identity", () => {
  it("parses canonical chain and uint256 identifiers", () => {
    assert.deepEqual(parseAgentProfileIdentity("56", "1887"), {
      agentId: "1887",
      chainId: 56,
    });
    assert.deepEqual(parseAgentProfileIdentity("97", "1887"), {
      agentId: "1887",
      chainId: 97,
    });
    assert.equal(buildAgentProfileHref(56, "1887"), "/agents/56/1887");
  });

  it("rejects malformed, unsafe and out-of-range route values", () => {
    const aboveUint256 = (1n << 256n).toString();

    assert.equal(parseAgentProfileIdentity("0", "1"), null);
    assert.equal(parseAgentProfileIdentity("1", "1887"), null);
    assert.equal(parseAgentProfileIdentity("56", "001"), null);
    assert.equal(parseAgentProfileIdentity("56", "-1"), null);
    assert.equal(parseAgentProfileIdentity("56", aboveUint256), null);
    assert.equal(parseAgentProfileIdentity("9007199254740992", "1"), null);
  });
});
