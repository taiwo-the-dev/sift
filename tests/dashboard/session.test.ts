import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildDashboardChallengeMessage } from "../../features/dashboard/session";

describe("dashboard wallet challenge", () => {
  it("binds the read-only authorization to origin, wallet, chain, nonce, and expiry", () => {
    const message = buildDashboardChallengeMessage({
      chainId: 97,
      expiresAt: "2026-08-24T10:05:00.000Z",
      issuedAt: "2026-08-24T10:00:00.000Z",
      nonce: "test-only-nonce",
      origin: "https://sift.test",
      walletAddress: "0x1111111111111111111111111111111111111111",
    });

    assert.match(message, /Sift Dashboard/);
    assert.match(message, /URI: https:\/\/sift\.test/);
    assert.match(message, /Chain ID: 97/);
    assert.match(message, /Nonce: test-only-nonce/);
    assert.match(message, /does not submit a transaction or grant spending permission/);
  });
});

