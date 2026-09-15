import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parsePublicAgentQuery,
  PublicApiQueryError,
} from "../../features/public-api/query";

describe("public agent API query", () => {
  it("uses mainnet and bounded pagination defaults", () => {
    const query = parsePublicAgentQuery(
      new URL("https://sift.example/api/v1/agents"),
    );

    assert.equal(query.network, "bsc-mainnet");
    assert.deepEqual(query.networkChainIds, [56]);
    assert.equal(query.page, 1);
    assert.equal(query.pageSize, 12);
    assert.equal(query.sort, "recent");
  });

  it("accepts documented repeated and comma-separated filters", () => {
    const query = parsePublicAgentQuery(
      new URL(
        "https://sift.example/api/v1/agents?chainId=97&category=grid-trading,yield-optimisation&health=online&profileStatus=valid&availability=ready&sort=score-desc&page=2&limit=24",
      ),
    );

    assert.equal(query.network, "bsc-testnet");
    assert.deepEqual(query.categories, [
      "grid-trading",
      "yield-optimisation",
    ]);
    assert.deepEqual(query.healthStatuses, ["online"]);
    assert.deepEqual(query.metadataStatuses, ["valid"]);
    assert.equal(query.taskAvailability, "ready");
    assert.equal(query.page, 2);
    assert.equal(query.pageSize, 24);
    assert.equal(query.sort, "score-desc");
  });

  it("rejects unsupported networks, limits, and unknown parameters", () => {
    for (const url of [
      "https://sift.example/api/v1/agents?chainId=1",
      "https://sift.example/api/v1/agents?limit=100",
      "https://sift.example/api/v1/agents?secret=true",
    ]) {
      assert.throws(
        () => parsePublicAgentQuery(new URL(url)),
        PublicApiQueryError,
      );
    }
  });
});
