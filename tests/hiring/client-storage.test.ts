import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseSavedHiringDraft } from "../../features/hiring/client-storage";

describe("hiring draft storage", () => {
  it("restores only the bounded non-secret mission fields", () => {
    const draft = parseSavedHiringDraft({
      mission: {
        deliverables: "A public report",
        durationSeconds: 86_400,
        maxSpend: "1",
        mission: "Review this public testnet position",
        qualityStandards: "Label unavailable public evidence",
      },
      version: 1,
    });

    assert.equal(draft?.mission.maxSpend, "1");
    assert.equal(draft?.version, 1);
  });

  it("rejects corrupt, oversized, and unsupported-version drafts", () => {
    assert.equal(parseSavedHiringDraft(null), null);
    assert.equal(parseSavedHiringDraft({ version: 2, mission: {} }), null);
    assert.equal(
      parseSavedHiringDraft({
        mission: {
          deliverables: "x",
          durationSeconds: 123,
          maxSpend: "1",
          mission: "x".repeat(1_501),
          qualityStandards: "x",
        },
        version: 1,
      }),
      null,
    );
  });
});

