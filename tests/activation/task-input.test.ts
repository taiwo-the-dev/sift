import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildTaskArguments,
  initialTaskInputValues,
  taskInputFields,
} from "../../features/activation/task-input";

describe("schema-driven agent task fields", () => {
  const fields = taskInputFields(
    {
      additionalProperties: false,
      properties: {
        chainId: {
          description: "BNB network identifier",
          maximum: 97,
          minimum: 56,
          type: "integer",
        },
        mode: {
          default: "safe",
          enum: ["safe", "fast"],
          type: "string",
        },
        notes: {
          anyOf: [{ type: "string" }, { type: "null" }],
          title: "Extra notes",
        },
        tokenId: {
          description: "Position token ID",
          type: "string",
        },
      },
      required: ["tokenId"],
      type: "object",
    },
    56,
  );

  it("uses the published schema to create labelled typed fields", () => {
    assert.deepEqual(
      fields.map((field) => ({
        defaultValue: field.defaultValue,
        kind: field.kind,
        label: field.label,
        required: field.required,
      })),
      [
        {
          defaultValue: "56",
          kind: "integer",
          label: "Chain ID",
          required: false,
        },
        {
          defaultValue: "safe",
          kind: "select",
          label: "Mode",
          required: false,
        },
        {
          defaultValue: "",
          kind: "string",
          label: "Extra notes",
          required: false,
        },
        {
          defaultValue: "",
          kind: "string",
          label: "Token ID",
          required: true,
        },
      ],
    );
  });

  it("presents technical withdrawal instructions as clear product copy", () => {
    const [amountField] = taskInputFields(
      {
        properties: {
          amount: {
            description:
              "The amount to withdraw in human-readable decimal format (e.g. '1.5'). Use '-1' to withdraw entire balance.",
            type: "string",
          },
        },
        type: "object",
      },
      56,
    );

    assert.equal(
      amountField?.description,
      "Enter the amount to withdraw (for example, 1.5). Enter -1 to withdraw the full available balance.",
    );
  });

  it("builds correctly typed arguments and omits empty optional fields", () => {
    const values = {
      ...initialTaskInputValues(fields),
      notes: "",
      tokenId: "42",
    };

    assert.deepEqual(buildTaskArguments(fields, values), {
      chainId: 56,
      mode: "safe",
      tokenId: "42",
    });
  });

  it("rejects missing required fields and values outside published bounds", () => {
    assert.throws(
      () => buildTaskArguments(fields, initialTaskInputValues(fields)),
      /Enter token ID/i,
    );
    assert.throws(
      () =>
        buildTaskArguments(fields, {
          ...initialTaskInputValues(fields),
          chainId: "200",
          tokenId: "42",
        }),
      /no more than 97/i,
    );
  });

  it("parses object and list fields without accepting malformed JSON", () => {
    const structuredFields = taskInputFields(
      {
        properties: {
          filters: { type: "object" },
          tokens: { type: "array" },
        },
        required: ["filters", "tokens"],
        type: "object",
      },
      56,
    );

    assert.deepEqual(
      buildTaskArguments(structuredFields, {
        filters: '{"active":true}',
        tokens: '["BNB"]',
      }),
      { filters: { active: true }, tokens: ["BNB"] },
    );
    assert.throws(
      () =>
        buildTaskArguments(structuredFields, {
          filters: "not-json",
          tokens: "[]",
        }),
      /valid JSON/i,
    );
  });
});
