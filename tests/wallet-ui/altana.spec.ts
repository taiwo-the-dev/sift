import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

describe("Altana browser integration boundaries", () => {
  it("keeps private session material out of browser storage", async () => {
    const source = await readFile("features/altana/storage.ts", "utf8");
    assert.doesNotMatch(source, /privateKey/);
    assert.doesNotMatch(source, /sessionSigner/);
    assert.match(source, /publicKey/);
  });

  it("exposes create, inspect, and revoke controls", async () => {
    const source = await readFile("components/altana/altana-session-controls.tsx", "utf8");
    assert.match(source, /Create one-hour permission/);
    assert.match(source, /Check on-chain status/);
    assert.match(source, /Revoke permission/);
    assert.match(source, /Passkey wallet funding address/);
    assert.match(source, /CopyButton/);
    assert.match(source, /Token approval is intentionally excluded/);
  });

  it("loads the SDK only inside the client-side user action boundary", async () => {
    const source = await readFile("components/altana/altana-session-provider.tsx", "utf8");
    assert.match(source, /await import\("@altananetwork\/sdk"\)/);
    assert.doesNotMatch(source, /localStorage\.setItem\([^\n]*signer/);
  });
});
