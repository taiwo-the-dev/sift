import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

const repositoryRoot = process.cwd();
const pinnedAction = /uses:\s+actions\/(?:checkout|setup-node)@[0-9a-f]{40}(?:\s+#\s+v\d+)?/g;

async function workflow(name: string): Promise<string> {
  return readFile(
    path.join(repositoryRoot, ".github", "workflows", name),
    "utf8",
  );
}

describe("GitHub workflow security", () => {
  it("pins third-party workflow actions to immutable commits", async () => {
    for (const name of ["assess-agents.yml", "sync-agents.yml"]) {
      const source = await workflow(name);
      const actionUses = source.match(/uses:\s+actions\/[^\s]+/g) ?? [];

      assert.ok(actionUses.length > 0, `${name} should use reviewed actions`);
      assert.equal(
        source.match(pinnedAction)?.length,
        actionUses.length,
        `${name} contains an action that is not commit-pinned`,
      );
    }
  });

  it("does not expose service secrets to dependency installation", async () => {
    for (const name of ["assess-agents.yml", "sync-agents.yml"]) {
      const source = await workflow(name);
      const stepsIndex = source.indexOf("    steps:");
      const installIndex = source.indexOf("run: npm ci");
      const nextStepIndex = source.indexOf("      - name:", installIndex + 1);

      assert.ok(stepsIndex >= 0 && installIndex > stepsIndex);
      assert.doesNotMatch(source.slice(0, stepsIndex), /secrets\./);
      assert.doesNotMatch(
        source.slice(installIndex, nextStepIndex),
        /SUPABASE_|BNB_RPC_|SIFT_8004SCAN_API_KEY/,
      );
    }
  });
});
