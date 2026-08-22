import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatAgentDescription,
  formatAgentName,
  formatChainName,
  formatRegistrationDate,
  formatServiceType,
} from "../../features/discovery/format";

describe("discovery display fallbacks", () => {
  it("uses honest identity and description fallbacks", () => {
    assert.equal(formatAgentName(null, "42"), "Agent #42");
    assert.match(formatAgentDescription(null), /No human-readable description/);
  });

  it("humanizes service types without damaging known acronyms", () => {
    assert.equal(formatServiceType("MCP"), "MCP");
    assert.equal(formatServiceType("agent_wallet"), "Agent Wallet");
  });

  it("formats known networks and unavailable registration time", () => {
    assert.equal(formatChainName(97), "BSC Testnet");
    assert.equal(formatChainName(56), "BNB Smart Chain");
    assert.equal(formatRegistrationDate(null), "Registration time unavailable");
  });
});
