import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ServiceResponse } from "../../components/activation/service-response";

describe("agent service response", () => {
  it("shows a readable result before the optional JSON response", () => {
    const html = renderToStaticMarkup(
      createElement(ServiceResponse, {
        value: {
          supportedChains: [
            { chainId: 56, name: "BNB Smart Chain" },
            { chainId: 56, name: "BSC Mainnet" },
          ],
          success: true,
        },
      }),
    );

    assert.match(html, /Agent reply/);
    assert.match(html, /Supported Chains/);
    assert.match(html, /BNB Smart Chain/);
    assert.match(html, /Success/);
    assert.match(html, />Yes</);
    assert.match(html, /View JSON response/);
    assert.match(html, /&quot;chainId&quot;: 56/);
    assert.doesNotMatch(html, /<details[^>]*open/);
  });

  it("turns JSON text returned by an MCP service into readable fields", () => {
    const html = renderToStaticMarkup(
      createElement(ServiceResponse, {
        value: {
          content: [
            {
              text: JSON.stringify({ message: "Request completed", total: 3 }),
              type: "text",
            },
          ],
        },
      }),
    );

    assert.match(html, /Request completed/);
    assert.match(html, /Total/);
  });

  it("keeps protocol-only responses honest and available in JSON", () => {
    const html = renderToStaticMarkup(
      createElement(ServiceResponse, {
        value: { contextId: "context-1", jsonrpc: "2.0", messageId: "message-1" },
      }),
    );

    assert.match(html, /No additional details/);
    assert.match(html, /View JSON response/);
    assert.match(html, /context-1/);
  });

  it("labels identity-only replies without presenting them as completed work", () => {
    const html = renderToStaticMarkup(
      createElement(ServiceResponse, {
        value: {
          kind: "message",
          parts: [
            {
              kind: "text",
              text: JSON.stringify({
                beta: true,
                message: "TempestPulse is registered for market monitoring.",
                tier: "identity",
              }),
            },
          ],
        },
      }),
    );

    assert.match(html, /described itself instead of completing the task/);
    assert.match(html, /TempestPulse is registered for market monitoring/);
    assert.match(html, /View JSON response/);
    assert.doesNotMatch(html, />Tier</);
  });
});
