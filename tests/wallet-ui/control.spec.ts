import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  WalletControlView,
  type WalletConnectionView,
} from "../../components/wallet/wallet-control-view";
import { mapWalletError } from "../../features/wallet/presentation";

function render(view: WalletConnectionView, mobile = false): string {
  return renderToStaticMarkup(
    createElement(WalletControlView, {
      mobile,
      onConnect() {},
      onDismissNotice() {},
      onOpenAccount() {},
      onOpenChain() {},
      onSwitchToTestnet() {},
      view,
    }),
  );
}

describe("wallet connection control states", () => {
  it("keeps the server/hydration shell stable and disconnected browsing enabled", () => {
    const hydrating = render({ connection: "hydrating" });
    const disconnected = render({
      connection: "disconnected",
      providerAvailable: true,
    });

    assert.match(hydrating, /Loading wallet connection/);
    assert.match(hydrating, /Connect Wallet/);
    assert.match(disconnected, /Connect Wallet/);
  });

  it("renders connecting and reconnecting states plainly", () => {
    assert.match(render({ connection: "connecting" }), /Connecting/);
    assert.match(render({ connection: "reconnecting" }), /Reconnecting/);
  });

  it("shows the actual shortened account and supported network", () => {
    const html = render({
      addressLabel: "0x1234…5678",
      chainName: "BSC Testnet",
      connection: "connected",
      supportedChain: true,
    });

    assert.match(html, /0x1234…5678/);
    assert.match(html, /BSC Testnet/);
    assert.match(html, /Open wallet menu/);
  });

  it("offers an explicit network switch and pending state", () => {
    assert.match(
      render({
        chainName: "Ethereum",
        connection: "connected",
        supportedChain: false,
      }),
      /Switch to BSC Testnet/,
    );
    assert.match(
      render({
        connection: "connected",
        supportedChain: false,
        switching: true,
      }),
      /Switching/,
    );
  });

  it("renders rejected and provider-unavailable guidance on mobile", () => {
    const rejected = render(
      {
        connection: "disconnected",
        notice: mapWalletError({ code: 4001 }),
        providerAvailable: true,
      },
      true,
    );
    const unavailable = render(
      {
        connection: "disconnected",
        notice: mapWalletError({ name: "ProviderNotFoundError" }),
        providerAvailable: false,
      },
      true,
    );

    assert.match(rejected, /Request cancelled/);
    assert.match(rejected, /Nothing was signed or submitted/);
    assert.match(unavailable, /Wallet unavailable/);
    assert.match(unavailable, /Install or unlock a supported wallet/);
  });
});
