# Sift wallet integration

M8 adds wallet identity and BNB Chain network readiness. It does not authenticate users, request signatures, read balances, approve tokens, send transactions, or start the M9 hiring flow.

## Supported chains

Sift configures BSC Mainnet, chain ID `56`, and BSC Testnet, chain ID `97`, in
viem and wagmi. The header selector controls which isolated catalogue is being
browsed and asks a connected wallet to switch through its normal consent UI.
Agent actions still verify the wallet against the agent's actual chain.

## Packages and provider boundary

- RainbowKit `2.2.11`
- wagmi `2.19.5`
- viem `2.55.19`
- TanStack Query `5.102.0`

`WalletProvider` is the narrow client boundary around the existing server-rendered application shell. Wagmi SSR mode and RainbowKit's mounted state keep the initial disconnected markup stable while browser wallet state hydrates. Server Components remain the default elsewhere.

The root package pins audited `axios`, `uuid`, and `ws` transitive versions. It also pins the unused Base Account connector dependency to `2.2.0` because the later connector release imports optional x402 payment modules during a Turbopack build. Sift does not expose that connector or install those out-of-scope payment packages. Revisit the override only after an upstream wagmi/RainbowKit compatibility release, then repeat the production build and dependency audit.

## Environment configuration

All M8 variables are optional during local development:

```text
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_BNB_MAINNET_RPC_URL=
NEXT_PUBLIC_BNB_TESTNET_RPC_URL=
```

`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is a 32-character public project identifier from WalletConnect Cloud. It is not a secret. When configured, RainbowKit enables WalletConnect/QR flows suitable for mobile wallets. When absent, Sift deliberately configures only installed injected browser wallets and shows an actionable unavailable-provider state when none exists.

The two browser RPC overrides must be public HTTPS URLs without embedded URL credentials. They are compiled into the browser bundle. Never reuse `BNB_RPC_PRIMARY` or another server-only URL containing a provider token here unless that provider explicitly permits public browser exposure and origin restrictions are configured.

If an override is blank, Sift uses ordered free/public BNB endpoints. A configured override is tried first and the public endpoints remain fallbacks. Browser RPCs are intentionally separate from M3's server indexer transports even though both use the shared typed chain definitions.

## User-visible states

The header control handles:

- stable hydration and disconnected states;
- connecting and reconnecting states;
- connected address shortened to `0x1234…5678`;
- a persistent Mainnet/Testnet catalogue selector and unsupported-wallet guidance;
- pending, cancelled, unavailable-provider, unsupported-switch, and unknown errors using sanitized guidance;
- account-menu disconnect through RainbowKit.

Connection errors are never rendered from raw provider payloads. Wallet addresses are not sent to Sift's database or logged by this implementation. Connector persistence remains limited to normal wagmi/RainbowKit browser behavior.

## Safe manual test procedure

Use a dedicated test wallet with no valuable mainnet assets.

1. Start Sift with `npm run dev` and confirm landing, discovery, profiles, and comparison work while disconnected.
2. Open the desktop connection control and cancel the wallet request. Confirm Sift shows or retains safe cancellation guidance and no page breaks.
3. Connect the test wallet and confirm the shortened address matches the account shown by the wallet.
4. Confirm the displayed network matches the provider's current chain.
5. Switch the catalogue between Mainnet and Testnet and confirm Discover shows only chain `56` or only chain `97` agents.
6. With a wallet connected, approve and reject network-switch requests to verify both consent paths.
7. Open the account control and disconnect.
8. Repeat from the mobile navigation. Configure the WalletConnect public project ID when testing QR-based mobile wallets.
9. Confirm the wallet never requests a signature, approval, balance transfer, or transaction.

Automated validation covers public environment parsing, supported-chain detection, address formatting, sanitized error mapping, and rendered disconnected/connecting/reconnecting/connected/wrong-network/unavailable-provider states. A real extension or mobile wallet approval remains a manual provider-controlled step.

## M15 activation boundary

The activation flow always shows the selected agent's chain, the current contract, the effect of
the next call, and that the wallet will estimate mainnet BNB gas before each
signature. Account changes keep only bounded mission text; wallet-bound quotes,
intents, signatures, approvals, and dashboard sessions are never silently
transferred to another account. Follow the real-wallet test and evidence record
in [activation-proof.md](activation-proof.md).
