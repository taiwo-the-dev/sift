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
  it("uses honest agent name and description fallbacks", () => {
    assert.equal(formatAgentName(null, "42"), "Agent #42");
    assert.match(formatAgentDescription(null), /No description is available/);
  });

  it("humanizes service types without damaging known acronyms", () => {
    assert.equal(formatServiceType("MCP"), "MCP");
    assert.equal(formatServiceType("agent_wallet"), "Agent Wallet");
  });

  it("formats known networks and unavailable registration time", () => {
    assert.equal(formatChainName(97), "BSC Testnet");
    assert.equal(formatChainName(56), "BSC Mainnet");
    assert.equal(
      formatRegistrationDate("2026-09-05T12:00:00.000Z"),
      "Sep 5, 2026",
    );
    assert.equal(formatRegistrationDate(null), "Registration time unavailable");
  });
});
