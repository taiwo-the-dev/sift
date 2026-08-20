# TICKET-008 — M8 Wallet Integration

## Status

Ready

## Depends On

M7 — Agent Comparison

## Objective

Add secure, accessible wallet connection and BNB Chain network state using RainbowKit, wagmi, and viem, with BSC Testnet as the development default and safe behavior when disconnected or on the wrong network.

## Product Context

Wallet connection is the bridge between research and action. Sift should introduce it only after users can discover and compare agents, and it must feel like a deliberate account/network control rather than an invitation to sign arbitrary transactions. This milestone establishes wallet identity and network readiness but performs no hiring transaction.

## Scope

- Review the installed Next.js/React versions and current official RainbowKit, wagmi, and viem integration guidance before selecting compatible package versions.
- Add RainbowKit, wagmi, and viem with the minimum supporting dependencies.
- Configure BSC Testnet as the default development network.
- Support BNB Smart Chain mainnet configuration without enabling unsafe production transactions by default.
- Add validated public RPC configuration suitable for browser wallet clients, with a documented free/public fallback strategy.
- Add client-side wallet/query providers at the narrowest appropriate root boundary.
- Replace the existing inactive Connect Wallet placeholder with a real, accessible connection control.
- Implement connected, disconnected, connecting, reconnecting, rejected, unsupported-network, and unavailable-provider states.
- Display the connected account in a privacy-conscious shortened form.
- Add explicit supported-network switching and clear guidance when automatic switching is unavailable.
- Preserve safe browsing, discovery, profiles, and comparison while disconnected.
- Add hydration-safe client boundaries and avoid rendering unstable wallet-only values during server rendering.
- Document wallet setup, supported chains, environment variables, and test procedure.

## Out of Scope

- Mission forms, permission configuration, hiring, job creation, token approvals, or contract writes.
- Transaction signing or sending.
- Authentication, user database records, SIWE, or custodial accounts.
- Persisting private wallet data beyond the connector's normal browser behavior.
- Mainnet financial demonstrations.
- Dashboard job ownership or wallet-based activity aggregation.
- Custom wallet implementation when RainbowKit/wagmi provides the required behavior.

## Technical Requirements

- Use compatible current versions of RainbowKit, wagmi, and viem.
- Use typed chain configuration for BSC Testnet and BNB Smart Chain.
- Keep wallet-specific code in `features/wallet`, `lib/blockchain`, or an equivalent feature boundary.
- Keep providers and hooks in Client Components; preserve Server Components elsewhere.
- Avoid duplicating viem chain/client configuration already introduced by M3; share safe common constants while separating server indexer transports from browser wallet transports.
- Validate public environment variables and do not expose server-only RPC or database credentials.
- Use connector configuration appropriate for the browser environment and documented project metadata.
- Prevent hydration mismatches by using stable disconnected server output and client-mounted wallet state.
- Avoid Redux; wagmi/TanStack Query and local state are sufficient.
- Do not add a transaction abstraction until M9 defines a real supported contract interaction.

## Data Integrity Requirements

- Display the actual connected wallet address and chain reported by the provider.
- Never simulate a connected account, successful switch, balance, approval, signature, or transaction.
- Do not display fake balances or testnet funds.
- Treat stale/reconnecting state honestly.

## Security Requirements

- Never request, store, log, or transmit private keys, seed phrases, or raw wallet secrets.
- Never ask users to paste wallet credentials.
- Do not request signatures or transactions in this milestone.
- Clearly identify the active network before later transaction flows.
- Do not silently switch networks; network changes must follow wallet/provider consent.
- Sanitize connector errors before displaying them and avoid logging sensitive provider payloads.
- Keep WalletConnect or similar project identifiers in appropriate public environment variables and document their exposure model.

## UX Requirements

- The application must remain fully browsable while disconnected.
- The connection control must work on desktop and mobile navigation.
- Connection, rejection, wrong-network, and provider-unavailable states must use plain language and actionable next steps.
- Connected state must show a recognizable shortened address and current network.
- Network switching must be explicit and keyboard accessible.
- Avoid repeated modal prompts or automatic connection attempts that surprise users.
- Maintain visible focus, sufficient contrast, and screen-reader labels.

## Acceptance Criteria

- [ ] Compatible RainbowKit, wagmi, and viem packages are configured.
- [ ] BSC Testnet is the default documented development network.
- [ ] Users can connect and disconnect a supported wallet from desktop and mobile.
- [ ] Connected address and actual chain state display correctly.
- [ ] Unsupported-network state offers an explicit switch action or manual guidance.
- [ ] Rejected/unavailable/reconnecting states are handled without breaking the page.
- [ ] Discovery, profiles, and comparison continue to work while disconnected.
- [ ] Server rendering is stable and wallet hydration produces no implementation-caused mismatch.
- [ ] No message signing, token approval, or transaction is requested.
- [ ] No secrets or private wallet material enter source control or logs.
- [ ] Lint, typecheck, relevant tests, browser/wallet testing, and production build pass.

## Testing Requirements

- Unit-test address formatting, supported-chain checks, and wallet error mapping.
- Component/integration-test disconnected, connecting, connected, rejected, wrong-network, and switch-unavailable states with mocked connectors/providers.
- Browser-test desktop/mobile connection controls with a safe test wallet procedure where automation supports it.
- Test a BSC Testnet network switch and cancellation; do not require mainnet funds or transactions.
- Test server render/hydration with wallet providers enabled.
- Run `npm run lint`, typecheck, relevant tests, and `npm run build`.

## Definition of Done

M8 is complete when users can safely connect a wallet, understand and change supported BNB Chain network state, continue browsing while disconnected, encounter robust wallet states without hydration errors, and the application performs no M9 transaction or hiring behavior.

## Codex Completion Report

Codex must report:

- Status: PASS or BLOCKED
- Implemented
- Files Changed
- Tests / Validation
- Important Decisions
- Known Issues
- Not Implemented
- Recommended Next Step

## Stop Condition

Do not implement the next milestone automatically.
