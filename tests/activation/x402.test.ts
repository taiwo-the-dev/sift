import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ClientEvmSigner } from "@x402/evm";

import {
  createBnbX402PaymentPayload,
  parseBnbX402Challenge,
  validateX402PaymentPayload,
  x402PaymentHeader,
} from "../../features/activation/x402";

const payer = "0x1111111111111111111111111111111111111111" as const;
const asset = "0x2222222222222222222222222222222222222222" as const;
const recipient = "0x3333333333333333333333333333333333333333" as const;
const signature = `0x${"11".repeat(65)}` as const;

function v1Challenge(amount = "50000000000000000") {
  return {
    accepts: [
      {
        asset,
        description: "One paid result",
        extra: { name: "World Liberty Financial USD", transferMethod: "eip3009", version: "1" },
        maxAmountRequired: amount,
        maxTimeoutSeconds: 120,
        mimeType: "application/json",
        network: "eip155:56",
        payTo: recipient,
        resource: "/api/result",
        scheme: "exact",
      },
    ],
    x402Version: 1,
  } as const;
}

function v2Challenge(amount = "1000000") {
  return {
    accepts: [
      {
        amount,
        asset,
        extra: { assetTransferMethod: "eip3009", name: "USD Test", version: "1" },
        maxTimeoutSeconds: 120,
        network: "eip155:56",
        payTo: recipient,
        scheme: "exact",
      },
    ],
    resource: { url: "https://agent.example/paid" },
    x402Version: 2,
  } as const;
}

const signer: ClientEvmSigner = {
  address: payer,
  async signTypedData() {
    return signature;
  },
};

describe("x402 BNB payment boundary", () => {
  it("accepts a legacy v1 CAIP-2 BNB challenge", () => {
    const challenge = parseBnbX402Challenge(v1Challenge(), 56);
    assert.equal(challenge.x402Version, 1);
    assert.equal(challenge.accepts[0]?.network, "eip155:56");
  });

  it("rejects a challenge without an EIP-712 token domain", () => {
    const challenge = v1Challenge();
    assert.throws(
      () =>
        parseBnbX402Challenge(
          {
            ...challenge,
            accepts: [{ ...challenge.accepts[0], extra: undefined }],
          },
          56,
        ),
      /did not offer a supported exact BNB Chain payment/,
    );
  });

  it("creates and binds a v1 exact authorization", async () => {
    const payload = await createBnbX402PaymentPayload(v1Challenge(), signer, 56);
    assert.equal(payload.x402Version, 1);
    assert.equal(x402PaymentHeader(payload).name, "X-PAYMENT");
    const validated = validateX402PaymentPayload(
      payload,
      v1Challenge(),
      56,
      payer,
    );
    assert.equal(validated.payer, payer);
    assert.equal(validated.requirement.payTo, recipient);
  });

  it("creates and binds a v2 exact authorization", async () => {
    const payload = await createBnbX402PaymentPayload(v2Challenge(), signer, 56);
    assert.equal(payload.x402Version, 2);
    assert.equal(x402PaymentHeader(payload).name, "PAYMENT-SIGNATURE");
    const validated = validateX402PaymentPayload(
      payload,
      v2Challenge(),
      56,
      payer,
    );
    assert.equal(validated.requirement.asset, asset);
  });

  it("rejects a signed authorization after the live amount changes", async () => {
    const payload = await createBnbX402PaymentPayload(v1Challenge(), signer, 56);
    assert.throws(
      () =>
        validateX402PaymentPayload(
          payload,
          v1Challenge("60000000000000000"),
          56,
          payer,
        ),
      /live payment request changed/,
    );
  });
});
