import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyActivationMethod,
  hasCurrentActivation,
  isActivationEvidenceCurrent,
  isUsableActivationEvidence,
  parseActivationStatus,
} from "../../features/activation/model";
import { parseActivationCheckConfig } from "../../features/activation/config";
import {
  a2aTaskSchema,
  mcpToolCallSchema,
} from "../../features/activation/schema";

describe("task service evidence", () => {
  it("classifies only explicit supported service names", () => {
    assert.equal(classifyActivationMethod("ERC-8183"), "erc8183");
    assert.equal(classifyActivationMethod("Agent-to-Agent"), "a2a");
    assert.equal(classifyActivationMethod("Model Context Protocol"), "mcp");
    assert.equal(classifyActivationMethod("B402"), "x402");
    assert.equal(classifyActivationMethod("Web"), null);
  });

  it("requires a successful check no older than 24 hours", () => {
    const now = Date.parse("2026-09-08T12:00:00.000Z");
    assert.equal(
      isActivationEvidenceCurrent(
        { lastSuccessAt: "2026-09-07T12:00:00.000Z", status: "available" },
        now,
      ),
      true,
    );
    assert.equal(
      isActivationEvidenceCurrent(
        { lastSuccessAt: "2026-09-07T11:59:59.999Z", status: "available" },
        now,
      ),
      false,
    );
    assert.equal(
      hasCurrentActivation(
        [
          {
            availabilityLastSuccessAt: "2026-09-08T11:00:00.000Z",
            availabilityStatus: "degraded",
          },
        ],
        now,
      ),
      false,
    );
  });

  it("fails closed when hosted availability evidence is absent or unknown", () => {
    assert.equal(parseActivationStatus(undefined), "unchecked");
    assert.equal(parseActivationStatus("invented-success"), "unchecked");
  });

  it("reuses only fresh successful MCP inspections from the former policy", () => {
    const now = Date.parse("2026-09-09T18:00:00.000Z");
    const legacyInspection = {
      checkedAt: "2026-09-09T17:00:00.000Z",
      failureCode: "no-read-only-tools",
      lastSuccessAt: null,
      method: "mcp" as const,
      status: "unsupported" as const,
      summary: { tools: [{ name: "borrow", readOnly: false }] },
    };

    assert.equal(isUsableActivationEvidence(legacyInspection, now), true);
    assert.equal(
      isUsableActivationEvidence(
        { ...legacyInspection, checkedAt: "2026-09-08T17:59:59.999Z" },
        now,
      ),
      false,
    );
    assert.equal(
      isUsableActivationEvidence(
        { ...legacyInspection, failureCode: "invalid-response" },
        now,
      ),
      false,
    );
    assert.equal(
      isUsableActivationEvidence({ ...legacyInspection, summary: { tools: [] } }, now),
      false,
    );
  });

  it("accepts stored service IDs but rejects client-supplied target URLs", () => {
    const serviceId = "11111111-1111-4111-8111-111111111111";
    assert.equal(
      a2aTaskSchema.safeParse({
        endpoint: "https://attacker.example",
        message: "Inspect this position",
        serviceId,
      }).success,
      false,
    );
    assert.equal(
      mcpToolCallSchema.safeParse({
        arguments: {},
        confirmedSideEffects: true,
        serviceId,
        toolName: "inspect",
        url: "https://attacker.example",
      }).success,
      false,
    );
  });

  it("keeps the scheduled checker bounded", () => {
    assert.deepEqual(parseActivationCheckConfig({}), {
      concurrency: 3,
      intervalHours: 6,
      limit: 25,
      maxBytes: 65_536,
      timeoutMs: 6_000,
    });
    assert.throws(
      () => parseActivationCheckConfig({ ACTIVATION_CHECK_LIMIT: "1000" }),
      /ACTIVATION_CHECK_LIMIT/,
    );
  });
});
