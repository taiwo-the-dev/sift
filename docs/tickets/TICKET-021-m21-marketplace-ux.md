# M21 — Marketplace UX and Hiring Clarity

# Status

Implemented Locally; Browser Validation Pending

# Depends On

M4 — Discover Marketplace, M5 — Agent Profiles, M6 — Agent Health + Sift
Score, M9 — Hiring / Job Flow, M10 — Dashboard, and M20 — Altana Session
Hiring.

# Objective

Make Sift easier to understand and use from discovery through hiring and job
tracking without weakening its evidence or transaction-safety rules.

# Product Context

Users should quickly see which agents can enter the hiring flow, understand why
data is unavailable, prepare the correct wallet, and follow a funded job without
having to understand implementation terminology.

# Scope

- Show evidence-based hiring support on marketplace cards and profiles.
- Add an availability filter to Agent status and a real-data featured-agent
  homepage collection.
- Simplify navigation, marketplace cards, profile evidence, hiring steps, and
  dashboard language.
- Show the protected wallet address, selected network, BNB balance, payment-token
  balance, registration fee, and testnet funding links.
- Present common wallet and protected-hire failures in plain language while
  retaining optional technical details.
- Explain why a Sift Score has not been calculated.
- Show a clear ERC-8183 job progress sequence in My Jobs.

# Out of Scope

- Fabricated agents, live service state, prices, scores, health, balances, or
  transactions.
- Passkey-wallet authorization for the private dashboard.
- Provider delivery, settlement, disputes, refunds, or autonomous trading.
- New contracts, paid services, or changes to protocol safety gates.

# Technical Requirements

- Reuse the existing discovery, profile, scoring, ERC-8183, Altana, Supabase,
  viem, and wallet boundaries.
- Load service endpoints for only the bounded discovery result set; avoid N+1
  database reads.
- Treat published ERC-8183 metadata as initial hiring support only. Keep live
  status, signed quote, deployment, allowance, and receipt checks mandatory.
- Use Server Components by default and isolate wallet balance reads to the
  existing client interaction boundary.

# Data Integrity Requirements

- Never present static metadata compatibility as proof that an endpoint is live.
- Never substitute sample agents or estimated wallet balances when reads fail.
- Keep unavailable evidence explicit.

# Security Requirements

- Never display, log, persist, or transmit passkey or session private material.
- Keep exact spending, network, expiry, allowlist, and receipt verification.
- Treat BSC Mainnet balances and actions as real assets.

# UX Requirements

- Use task-focused labels and short explanations suitable for a first-time user.
- Keep technical evidence available without making it the primary action.
- Preserve accessible status text, keyboard interaction, responsive layout, and
  reduced-motion behavior.

# Acceptance Criteria

- [x] Discovery cards clearly distinguish hiring-supported and unavailable agents.
- [x] Hiring-supported cards link directly to the quote flow.
- [x] The homepage featured carousel uses only real indexed, hiring-compatible agents.
- [x] Discovery exposes availability inside the Agent status filter.
- [x] Agent profiles explain why hiring and Sift Score data may be unavailable.
- [x] Primary navigation uses Discover, Bookmarks, Compare, and My Jobs.
- [x] Protected hire is recommended and described without relying on protocol jargon.
- [x] Passkey-wallet funding address and live balances are visible and refreshable.
- [x] Common wallet errors have a plain-language recovery path.
- [x] My Jobs shows a progress sequence derived from verified or saved job state.
- [ ] Desktop and mobile browser flows have been manually validated.

# Testing Requirements

- Unit-test hiring error presentation and discovery evidence enrichment.
- Run strict typecheck, lint, full tests, wallet UI tests, and production build.
- Browser-test discovery, agent profile, protected-hire funding, and My Jobs on
  desktop and mobile. Do not automate a mainnet transaction.

# Definition of Done

M21 is complete when automated validation passes and a human verifies the core
desktop and mobile paths using genuine indexed data and testnet-only wallet
actions.

# Codex Completion Report

Codex must report Status: PASS or BLOCKED, Implemented, Files Changed, Tests /
Validation, Important Decisions, Known Issues, Not Implemented, and Recommended
Next Step.

# Stop Condition

Do not implement the next milestone automatically.
