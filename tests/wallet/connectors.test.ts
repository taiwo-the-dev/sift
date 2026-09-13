import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deduplicateConnectorsById } from "../../features/wallet/connectors";

describe("wallet connector discovery", () => {
  it("keeps only the first connector announced for each wallet identity", () => {
    const connectors = [
      { id: "ooo.plugwallet", instance: "first" },
      { id: "ooo.plugwallet", instance: "duplicate" },
      { id: "io.metamask", instance: "metamask" },
    ];

    assert.deepEqual(deduplicateConnectorsById(connectors), [
      connectors[0],
      connectors[2],
    ]);
  });

  it("does not alter an already unique connector list", () => {
    const connectors = [
      { id: "io.metamask" },
      { id: "com.walletconnect" },
    ];

    assert.deepEqual(deduplicateConnectorsById(connectors), connectors);
  });
});
