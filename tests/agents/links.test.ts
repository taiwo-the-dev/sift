import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildExplorerAddressHref,
  buildExplorerBlockHref,
  normalizeExternalHref,
} from "../../features/agents/links";

const address = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

describe("agent profile links", () => {
  it("builds chain-specific BscScan links from validated values", () => {
    assert.equal(
      buildExplorerAddressHref(97, address),
      "https://testnet.bscscan.com/address/0x8004a818bfb912233c491871b3d84c89a494bd9e",
    );
    assert.equal(
      buildExplorerBlockHref(56, 123),
      "https://bscscan.com/block/123",
    );
  });

  it("does not construct explorer links for unsupported or invalid values", () => {
    assert.equal(buildExplorerAddressHref(1, address), null);
    assert.equal(buildExplorerAddressHref(97, "not-an-address"), null);
    assert.equal(buildExplorerBlockHref(97, -1), null);
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
