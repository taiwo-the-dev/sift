# Sift Engineering Rules

Sift helps people find the right AI agent for a job by making BNB Chain agents discoverable, understandable, comparable, and eventually hireable.

- Treat `docs/tickets/MASTER-001-sift.md` as the master product and delivery specification.
- Develop milestone by milestone. Never implement a future milestone unless the user explicitly requests it.
- Use TypeScript first and keep strict type checking enabled.
- Inspect existing code and documentation before changing architecture or conventions.
- Run lint, build, and relevant tests after meaningful changes; resolve introduced failures.
- Never fabricate blockchain, agent, reputation, activity, price, or transaction data. Represent unavailable data honestly.
- Never commit secrets, private keys, seed phrases, or populated local environment files.
- Do not introduce paid services without explicit approval.
- Prefer small, composable modules with clear ownership over premature abstractions.
- Maintain accessible, responsive, professional, production-quality UI and UX.
- Preserve the hackathon goal of approximately $0 infrastructure cost by preferring open-source software and free tiers.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
