import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildExplorerAddressHref,
  buildExplorerBlockHref,
  buildExplorerTransactionHref,
  normalizeExternalHref,
} from "../../features/agents/links";

const address = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";

describe("agent profile links", () => {
  it("builds chain-specific BscScan links from validated values", () => {
    assert.equal(
      buildExplorerAddressHref(56, address),
      "https://bscscan.com/address/0x8004a169fb4a3325136eb29fa0ceb6d2e539a432",
    );
    assert.equal(
      buildExplorerBlockHref(56, 123),
      "https://bscscan.com/block/123",
    );
    assert.equal(
      buildExplorerTransactionHref(56, `0x${"A".repeat(64)}`),
      `https://bscscan.com/tx/0x${"a".repeat(64)}`,
    );
    assert.equal(
      buildExplorerAddressHref(97, address),
      "https://testnet.bscscan.com/address/0x8004a169fb4a3325136eb29fa0ceb6d2e539a432",
    );
  });

  it("does not construct explorer links for unsupported or invalid values", () => {
    assert.equal(buildExplorerAddressHref(1, address), null);
    assert.equal(buildExplorerAddressHref(56, "not-an-address"), null);
    assert.equal(buildExplorerBlockHref(56, -1), null);
    assert.equal(buildExplorerTransactionHref(56, "0x1234"), null);
  });

  it("allows public HTTPS metadata links and rejects unsafe targets", () => {
    assert.equal(
      normalizeExternalHref("https://agent.example/metadata.json"),
      "https://agent.example/metadata.json",
    );
    assert.equal(normalizeExternalHref("javascript:alert(1)"), null);
    assert.equal(normalizeExternalHref("data:text/html,hello"), null);
    assert.equal(normalizeExternalHref("http://agent.example/metadata"), null);
    assert.equal(normalizeExternalHref("https://localhost/metadata"), null);
    assert.equal(normalizeExternalHref("https://127.0.0.1/metadata"), null);
  });
});
