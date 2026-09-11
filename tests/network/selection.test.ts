import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  catalogueChainId,
  catalogueNetworkForChainId,
  parseCatalogueNetwork,
} from "../../features/network/selection";

describe("catalogue network selection", () => {
  it("maps the two supported BNB catalogue networks without ambiguity", () => {
    assert.equal(catalogueChainId("bsc-mainnet"), 56);
    assert.equal(catalogueChainId("bsc-testnet"), 97);
    assert.equal(catalogueNetworkForChainId(56), "bsc-mainnet");
    assert.equal(catalogueNetworkForChainId(97), "bsc-testnet");
    assert.equal(catalogueNetworkForChainId(1), null);
  });

  it("rejects unsupported persisted or URL values", () => {
    assert.equal(parseCatalogueNetwork("bsc-mainnet"), "bsc-mainnet");
    assert.equal(parseCatalogueNetwork("bsc-testnet"), "bsc-testnet");
    assert.equal(parseCatalogueNetwork("all"), null);
    assert.equal(parseCatalogueNetwork("ethereum"), null);
    assert.equal(parseCatalogueNetwork(null), null);
  });
});
