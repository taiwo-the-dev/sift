# Production-quality conventions

M11 standardizes Sift's current routes without adding product capability. The
application remains dark-only, evidence-led, and free of fabricated agent,
reputation, score, health, job, or transaction values.

## Public origin and sharing metadata

Set `SIFT_SITE_URL` to the deployed HTTPS origin when the host does not provide
`VERCEL_PROJECT_PRODUCTION_URL` or `VERCEL_URL`. The value is server-only and is
used to resolve canonical, OpenGraph, manifest, and robots metadata. Local
development safely falls back to `http://localhost:3000`.

Next.js generates the browser icon, Apple icon, and OpenGraph image from code at
build time. Static route metadata uses the shared helper in `lib/metadata.ts`;
agent profile metadata remains derived only from the indexed profile record.
Hiring and wallet dashboard routes are intentionally marked `noindex`.

## Resilience and accessibility

- The root application has global not-found, route error, and root-layout error
  experiences with safe recovery actions and no raw exception messages.
- Data-dependent routes retain route-specific loading, empty, partial, stale,
  and error states. Unknown evidence remains Unknown.
- Error headings receive focus when a boundary replaces the current page.
- The mobile navigation uses a modal dialog with focus trapping, Escape/outside
  dismissal, scroll locking, and trigger focus restoration.
- Reduced-motion preferences suppress nonessential animation and transitions.

## Security headers

`next.config.ts` applies clickjacking, MIME-sniffing, referrer, permissions, and
cross-origin opener protections to all routes. The CSP deliberately restricts
base URLs, forms, frames, and plugins without defining `script-src` or
`connect-src`; Sift's injected wallets, WalletConnect popups/WebSockets, and
user-configurable browser RPC endpoints require those channels. Tightening them
later requires testing every supported wallet and RPC origin. Production HTTPS
responses also receive HSTS.

External agent images continue to use Sift's bounded server proxy with HTTPS,
DNS/SSRF, content-type, redirect, timeout, and size checks. Server-only database
and blockchain modules must keep their `server-only` guards.

## Validation

Run the complete local quality gate:

```bash
npm run lint
npm run typecheck
npm test
npm run test:wallet-ui
npm run test:browser:release
npm run build
```

After M9 and M10 hosted migrations are present, manually test the primary path
at mobile, tablet, and desktop widths: landing, discovery, profile, comparison,
wallet connection, compatible-agent hiring, and the wallet-scoped dashboard.
Use a disposable BSC Mainnet wallet with only the minimum funds the owner accepts
risking. Keyboard-check the mobile menu, search,
filters, profile tabs, comparison controls, wallet dialogs, hiring steps, and
dashboard actions. Automated validation does not authorize a mainnet
transaction; the wallet owner must review and approve each real write.
