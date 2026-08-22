# MASTER-001 — Build Sift: BNB Agent Discovery & Hiring Marketplace

## Status

Ready for Development

## Milestone Tracking

- M0 — Complete
- M1 — Complete
- M2 — Complete
- M3 — Complete
- M4 — Complete
- M5 — Complete
- M6 — Complete
- M7 — Ready
- M8 — Not Started
- M9 — Not Started
- M10 — Not Started
- M11 — Not Started
- M12 — Not Started

## Priority

P0 — Hackathon Core

## Product

**Sift**

## Product Tagline

**Find the right AI agent for the job.**

## Objective

Build a polished, production-ready-looking web application for the BNB Chain hackathon that allows users to:

1. Discover AI agents registered on BNB Chain.
2. Search for agents based on what they want to accomplish.
3. Browse agents across the four required categories.
4. View useful agent profiles instead of raw blockchain records.
5. Compare multiple agents side-by-side.
6. Understand agent reputation, reliability and availability.
7. Receive an explainable Sift recommendation score.
8. Connect a wallet.
9. Configure a task/mission and permissions.
10. Hire or activate an agent through the appropriate BNB Agent infrastructure.
11. Monitor hired agents and job activity.

The application must feel like a real SaaS/Web3 startup product rather than a hackathon prototype.

---

# 1. Core Product Principle

There are already large numbers of agents registered on BNB Chain.

Sift is **not primarily an agent-building platform**.

Sift is the discovery, comparison, trust and hiring layer.

The core product journey is:

```text
User has a goal
      ↓
Describe goal
      ↓
Discover matching agents
      ↓
Filter and rank
      ↓
Compare agents
      ↓
Inspect agent
      ↓
Set task and permissions
      ↓
Connect wallet
      ↓
Hire agent
      ↓
Monitor activity
```

The product should hide unnecessary blockchain complexity from ordinary users.

---

# 2. Important Product Constraint

Do NOT make 8004scan a critical dependency.

Sift must obtain its core agent catalogue from BNB Chain / ERC-8004 infrastructure through its own indexing layer.

External explorers such as 8004scan may later be used for:

- enrichment;
- validation;
- debugging;
- comparison;
- optional fallback data.

If 8004scan becomes unavailable, core Sift discovery must continue functioning.

---

# 3. Cost Constraint

The hackathon version should target an infrastructure cost of approximately:

**$0**

Prefer free/open-source technologies and free tiers.

Do not introduce paid infrastructure unless absolutely required.

Preferred free architecture:

```text
BNB Smart Chain
      ↓
Public RPC
      ↓
Sift Indexer
      ↓
Supabase PostgreSQL
      ↓
Next.js Application
      ↓
Vercel
```

Scheduled incremental indexing may use GitHub Actions.

Development and blockchain transaction demonstrations should prefer BSC Testnet where appropriate.

---

# 4. Required Agent Categories

Treat all four categories as first-class product categories.

## 4.1 Yield Optimisation

Agents helping users identify or manage yield opportunities.

Example user goal:

> "I have USDT and want to earn yield without taking excessive risk."

---

## 4.2 Grid Trading

Agents managing grid-based automated trading strategies.

Example user goal:

> "I want an agent that trades automatically within a defined price range."

---

## 4.3 Health Factor Monitoring

Agents monitoring lending/borrowing positions and potential liquidation risk.

Example user goal:

> "Protect my lending position from getting close to liquidation."

---

## 4.4 Liquidity Rebalancing

Agents monitoring and rebalancing LP positions/ranges.

Example user goal:

> "Keep my liquidity position within an effective range."

---

# 5. Recommended Technology Stack

Use TypeScript wherever practical.

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide icons

## State / Data Fetching

- TanStack Query where useful
- React state/context where sufficient
- Avoid Redux unless a genuine requirement appears

## Database

- Supabase
- PostgreSQL

## Search

Start with PostgreSQL search.

Potential later enhancement:

- pgvector / semantic search

Do not introduce Elasticsearch for the hackathon.

## Web3

- viem
- wagmi
- RainbowKit

## Blockchain

- BNB Smart Chain
- BSC Testnet during development
- ERC-8004 for agent identity/discovery
- ERC-8183 or current BNB-supported agent commerce mechanism for job/hiring workflow

## Indexer

- Node.js
- TypeScript
- viem

## Hosting

- Vercel for Next.js
- Supabase free tier
- GitHub Actions for scheduled indexing where practical

## Repository

- GitHub

---

# 6. Repository Structure

Use a clean feature-oriented structure.

Target:

```text
Sift/
├── app/
│   ├── page.tsx
│   ├── discover/
│   ├── agents/
│   ├── compare/
│   ├── dashboard/
│   ├── hire/
│   └── api/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── agents/
│   ├── discovery/
│   ├── comparison/
│   └── dashboard/
│
├── features/
│   ├── agents/
│   ├── discovery/
│   ├── comparison/
│   ├── scoring/
│   ├── hiring/
│   ├── wallet/
│   └── dashboard/
│
├── lib/
│   ├── blockchain/
│   ├── db/
│   ├── rpc/
│   ├── scoring/
│   ├── search/
│   └── utils/
│
├── scripts/
│   ├── index-agents.ts
│   └── sync-agents.ts
│
├── types/
│
├── public/
│
├── docs/
│   ├── architecture.md
│   ├── database.md
│   └── tickets/
│
├── .env.example
├── README.md
└── package.json
```

Avoid dumping unrelated logic into large page components.

---

# 7. Application Navigation

Desktop navigation:

```text
Sift

Discover
Compare
My Agents

Search

Connect Wallet
```

Optional later items:

```text
Activity
About
```

Keep navigation simple.

---

# 8. Screen 1 — Landing Page

Route:

```text
/
```

Purpose:

A new user should understand Sift within five seconds.

## Hero

Headline:

**Find the right AI agent for the job.**

Supporting copy:

**Discover, compare and safely hire autonomous agents on BNB Chain.**

Primary interaction:

```text
What do you want an agent to do?

[ I want to earn yield on my USDT safely... ]

[ Find Agents ]
```

Quick actions:

- Earn Yield
- Automate Trading
- Protect a Loan
- Rebalance Liquidity

Additional credibility section:

```text
200K+ agents.
One place to find the right one.
```

Explain process:

```text
1. Tell us what you need
2. Compare relevant agents
3. Configure permissions
4. Hire and monitor
```

Do not overwhelm the homepage with blockchain terminology.

---

# 9. Screen 2 — Discover Marketplace

Route:

```text
/discover
```

Required functionality:

- Search
- Category filtering
- Status filtering
- Risk filtering
- Sorting
- Agent cards
- Pagination or progressive loading
- Responsive experience

Suggested filters:

### Category

- Yield Optimisation
- Grid Trading
- Health Monitoring
- Rebalancing

### Status

- Online
- Offline
- Unknown

### Trust

- Verified
- Has reputation
- Has successful activity

### Risk

Where sufficient information exists:

- Conservative
- Moderate
- Aggressive

### Sort

- Best Match
- Highest Reputation
- Most Reliable
- Most Active
- Recently Registered

Do not invent unsupported metrics.

---

# 10. Agent Card Design

Each agent card should contain useful human-readable information.

Example structure:

```text
ONLINE                                      94 MATCH

YieldPilot

AI-powered yield optimisation

Searches supported DeFi protocols for yield
opportunities based on the user's preferences.

★ 4.8        97% Success        1.8K Tasks

Low Risk                ERC-8004 Verified

[ View Agent ]                         [ Compare + ]
```

Use graceful fallbacks when fields are unavailable.

Never fabricate values.

If a metric is unknown, show:

```text
Not available
```

or omit it.

---

# 11. Screen 3 — Agent Profile

Route:

```text
/agents/[chainId]/[agentId]
```

The profile should transform blockchain metadata into a professional product page.

## Header

Show:

- agent name
- description
- category
- current availability
- verification status
- Sift Score
- reputation where available
- number of relevant feedback/jobs where supported

Primary actions:

```text
Try Agent
Compare
Hire Agent
```

## Tabs

```text
Overview
Performance
Capabilities
Activity
Technical
```

### Overview

Human-readable description.

### Performance

Only show verifiable metrics.

### Capabilities

Show supported services/protocols/capabilities.

### Activity

Show known recent activity where data is available.

### Technical

Place blockchain-heavy information here:

- chain ID
- registry address
- agent ID
- owner wallet
- agent URI
- service endpoints
- supported standards

Raw blockchain details should not dominate the main UX.

---

# 12. Sift Score

Create an explainable ranking system.

Do NOT ask an LLM to randomly assign scores.

Initial score may combine available signals such as:

```text
Reputation
Reliability
Availability
Capability match
Activity / track record
Metadata completeness
```

Example weighting:

```text
Reputation          30%
Reliability         25%
Availability        15%
Capability Match    15%
Track Record        10%
Metadata Quality     5%
```

The exact formula may change depending on available source data.

## Critical requirement

Every component of the score must be derived from real data or deterministic rules.

If insufficient information exists, reduce confidence instead of inventing a score.

Consider storing:

```text
score
confidence
score_version
calculated_at
breakdown
```

The UI should explain:

> Why is this agent ranked highly?

---

# 13. Screen 4 — Compare Agents

Route:

```text
/compare
```

Users should be able to select approximately 2–4 agents.

Comparison attributes may include:

- Sift Score
- reputation
- reliability
- availability
- category
- capabilities
- successful activity
- supported protocols
- cost if known
- service types
- last verified
- risk classification where supported

Visually identify the strongest candidate for the user's current goal.

Do not declare an absolute "best agent" without context.

Prefer:

> Best match for your stated requirements.

---

# 14. Screen 5 — Hire / Mission Flow

Route:

```text
/hire/[agentId]
```

This should feel like a modern checkout rather than a raw smart-contract interaction.

Use a step-based flow.

## Step 1 — Define Mission

Example:

```text
Optimise 1,000 USDT for relatively low-risk yield.
```

## Step 2 — Configure Permissions

Depending on what the protocol and agent actually support, allow users to configure applicable restrictions such as:

- maximum spend
- approved protocols/contracts
- task expiry
- execution duration
- permitted actions

Do not create UI controls that cannot eventually be enforced.

## Step 3 — Review

Display:

```text
Agent
Mission
Network
Permissions
Maximum spend
Expiry
Estimated fee where available
```

## Step 4 — Wallet

Connect wallet.

Show network.

Request explicit approval.

## Step 5 — Confirmation

Show:

- job identifier
- transaction hash
- agent
- mission
- status
- blockchain explorer link

---

# 15. Screen 6 — My Agents Dashboard

Route:

```text
/dashboard
```

Purpose:

Make Sift feel like an ongoing control centre rather than a one-time marketplace.

Top KPIs:

```text
Active Agents
Completed Jobs
Pending Jobs
Total Activity
```

Each active agent card should show applicable information:

```text
Agent name
Mission
Status
Started
Expires
Permissions
Recent activity
```

Actions where technically supported:

```text
View
Pause
Revoke
```

Do not expose buttons that perform fake actions.

---

# 16. Screen 7 — Activity / Audit View

Provide a readable activity timeline.

Example:

```text
10:42 Agent queried protocol
10:43 Strategy evaluated
10:44 Transaction prepared
10:44 Permission policy validated
10:45 Transaction submitted
10:45 Transaction confirmed
```

Where possible, include verifiable transaction references.

Users should understand what the agent did.

---

# 17. Own ERC-8004 Indexing Layer

Implement an Sift indexing service.

Responsibilities:

1. Connect to BNB Smart Chain RPC.
2. Identify the appropriate ERC-8004 registry deployment.
3. Synchronise historical agent registrations.
4. Maintain a `last_synced_block` checkpoint.
5. Read only new blocks/events on incremental sync.
6. Resolve agent identifiers and URIs.
7. Fetch agent metadata.
8. Validate metadata.
9. Normalize metadata.
10. Store normalized records in PostgreSQL.
11. Update records if agent metadata/registration changes.
12. Log failures without crashing the entire indexing process.

Never rescan the full chain on every update.

---

# 18. RPC Resilience

Do not depend on a single RPC endpoint.

Environment configuration should support:

```text
BNB_RPC_PRIMARY=
BNB_RPC_FALLBACK_1=
BNB_RPC_FALLBACK_2=
```

Implement provider fallback.

Example:

```text
Try primary
    ↓ fail
Try fallback 1
    ↓ fail
Try fallback 2
```

Failures must be logged.

Do not silently return fabricated data.

---

# 19. Metadata Handling

An agent's URI may resolve to remote metadata.

Implement:

- HTTP timeout
- response size limit
- JSON validation
- schema normalization
- safe error handling
- retry policy
- cached last-known-good metadata

If remote metadata later becomes unavailable, Sift should still be capable of displaying its last successfully indexed representation.

Show:

```text
Last verified: ...
```

where appropriate.

---

# 20. Proposed Database Model

Initial schema should include at minimum:

## agents

```text
id
chain_id
agent_id
registry_address
owner_address
agent_uri
name
description
image_url
category
active
x402_supported
metadata_status
registered_block
registered_at
last_synced_at
created_at
updated_at
```

## agent_services

```text
id
agent_db_id
service_type
endpoint
version
metadata
created_at
updated_at
```

## agent_health

```text
agent_db_id
status
response_time_ms
last_checked_at
last_success_at
failure_count
service_type
checked_endpoint
endpoint_hash
outcome
check_count
success_count
```

## agent_reputation

```text
agent_db_id
feedback_count
reputation_score
successful_jobs
failed_jobs
last_activity_at
source
source_observed_at
updated_at
```

Only store fields we can genuinely derive.

## agent_scores

```text
agent_db_id
sift_score
confidence
reputation_component
reliability_component
availability_component
capability_component
track_record_component
metadata_component
score_version
calculated_at
evidence_snapshot
source_freshness
```

## sync_state

```text
chain_id
registry_address
last_synced_block
updated_at
```

## comparisons

Optional.

## users

Optional initially.

## saved_agents

Optional initially.

## jobs

Required once hiring flow is implemented.

---

# 21. Search Architecture

Phase 1:

Use PostgreSQL search across:

```text
name
description
category
capabilities
services
```

Allow basic intent mapping.

Examples:

```text
yield
earn
APY
APR

→ Yield Optimisation
```

```text
loan
liquidation
health factor
borrow

→ Health Monitoring
```

```text
grid
trade
buy
sell

→ Grid Trading
```

```text
liquidity
LP
range
rebalance

→ Rebalancing
```

Do not introduce a paid LLM dependency simply to classify these four categories.

Semantic search can be added later if genuinely useful.

---

# 22. UI Design System

The interface should feel premium and restrained.

Avoid stereotypical crypto visual design.

Do NOT overuse:

- glowing gradients
- giant neon effects
- floating cryptocurrency graphics
- excessive glassmorphism
- meaningless Web3 animations

## Suggested Visual Direction

Primary background:

```text
#F8FAFC
```

Surface/cards:

```text
#FFFFFF
```

Primary text:

```text
#0F172A
```

Secondary text:

```text
#64748B
```

BNB-inspired accent:

```text
#F0B90B
```

Use the yellow accent intentionally rather than covering the entire interface with it.

## Typography

Prefer:

- Geist
- Inter

Create a consistent hierarchy.

Example:

```text
Hero            48–64px desktop
Page heading    30–36px
Section         22–26px
Card title      17–20px
Body            14–16px
Metadata        12–14px
```

---

# 23. UX Quality Requirements

Every production-facing page must consider:

## Loading

Use skeleton loaders.

Do not show empty jumping layouts.

## Errors

Never expose raw stack traces.

Example:

> We couldn't refresh blockchain data. Showing information last synced 6 minutes ago.

## Empty States

Provide helpful next actions.

Do not only display:

> No results.

## Mobile

Core flows must work on mobile.

## Accessibility

Use:

- semantic elements
- keyboard accessible controls
- appropriate labels
- sufficient contrast
- visible focus states

## Feedback

Buttons performing asynchronous actions should show:

```text
idle
loading
success
error
```

states.

---

# 24. Data Integrity Rules

Never fabricate:

- reputation
- task counts
- prices
- success rates
- APY
- online status
- wallet activity
- transactions
- blockchain events

If information cannot be verified:

```text
Unknown
```

is better than fake data.

Demo/seed data is allowed only when clearly identified as demo data.

---

# 25. Security Requirements

Do not store:

- private keys
- wallet seed phrases
- plaintext secrets

Use environment variables.

Provide:

```text
.env.example
```

Do not commit:

```text
.env.local
```

Validate external metadata.

Sanitize URLs where needed.

Do not automatically execute financial transactions.

Require explicit user wallet confirmation for relevant blockchain actions.

---

# 26. Free-Tier Requirements

The implementation should be designed to operate within free-tier constraints during the hackathon.

Avoid:

- dedicated blockchain node
- paid RPC requirement
- Elasticsearch
- Redis cluster
- Kubernetes
- Kafka
- microservices
- unnecessary server infrastructure
- paid AI dependency
- excessive polling

Optimise blockchain reads.

Use incremental indexing.

Cache stable information.

---

# 27. Development Milestones

Codex should implement these sequentially.

Do not attempt the entire project in one uncontrolled change.

---

## M0 — Repository Foundation

Deliver:

- Next.js TypeScript project
- Tailwind
- shadcn/ui
- ESLint
- environment validation
- clean repository structure
- base layout
- responsive navigation
- README
- `.env.example`

Acceptance:

```text
npm install
npm run dev
npm run lint
npm run build
```

must succeed.

---

## M1 — Design System + Landing

Deliver:

- Sift branding
- typography
- colour tokens
- responsive navbar
- landing page
- hero search
- four category shortcuts
- "How it works"
- polished footer
- loading/hover/focus patterns

Goal:

Application should already look like a credible startup.

---

## M2 — Database Foundation

Deliver:

- Supabase integration
- SQL migrations
- agent-related tables
- generated TypeScript database types where practical
- repository/service data-access layer

Do not couple UI directly to raw Supabase queries everywhere.

---

## M3 — BNB / ERC-8004 Indexer

Deliver:

- RPC configuration
- fallback RPC support
- registry client
- historical sync
- incremental sync
- sync checkpoint
- metadata resolution
- normalization
- structured logging
- failure handling

Include CLI:

```bash
npm run index:agents
```

and/or:

```bash
npm run sync:agents
```

---

## M4 — Discover Marketplace

Deliver:

- real indexed agents
- search
- filters
- sorting
- pagination
- agent cards
- category coverage
- mobile version
- loading/error/empty states

---

## M5 — Agent Profiles

Deliver:

- dynamic profile routes
- overview
- capabilities
- technical tab
- health/reputation sections where data exists
- last verified
- explorer links where applicable

---

## M6 — Agent Health + Scoring

Deliver:

- endpoint health checks where supported
- status persistence
- deterministic Sift Score
- score confidence
- score breakdown
- explanation component

Do not perform aggressive health checking across every indexed agent.

Prioritise relevant/top/recent agents.

---

## M7 — Comparison

Deliver:

- add/remove comparison
- compare 2–4 agents
- comparison page
- highlight strongest contextual match
- persistence in URL or local client state

---

## M8 — Wallet Integration

Deliver:

- RainbowKit
- wagmi
- viem
- BSC Testnet configuration
- network switching
- wallet states
- safe disconnected behaviour

---

## M9 — Hiring / Job Flow

Deliver:

- mission form
- available permission configuration
- review
- wallet confirmation
- BNB-supported job creation
- transaction status
- confirmation screen
- persisted job record

Use testnet while developing.

---

## M10 — Dashboard

Deliver:

- active jobs
- completed jobs
- job details
- activity timeline
- agent status
- supported pause/revoke controls where genuinely implemented

---

## M11 — Production Polish

Deliver:

- favicon
- metadata
- OpenGraph
- polished 404
- error boundary
- loading states
- skeletons
- responsive QA
- accessibility review
- performance review
- remove console noise
- remove placeholder content
- consistent spacing
- consistent button behaviour

---

## M12 — Hackathon Readiness

Deliver:

- deployed Vercel application
- reliable demo flow
- sample testnet wallet procedure
- README screenshots
- architecture diagram
- setup guide
- demo guide
- known limitations
- future roadmap

Ensure every major demo interaction works before adding optional features.

---

# 28. Testing Expectations

At minimum:

## Unit Tests

Focus on:

- Sift scoring
- normalization
- category classification
- metadata validation
- important utilities

## Integration Tests

Focus on:

- database agent persistence
- RPC fallback
- metadata ingestion
- search/filter logic

## E2E

At least the primary demo path:

```text
Open site
↓
Search
↓
View results
↓
Open agent
↓
Compare
↓
Connect wallet/test hiring flow
```

Use practical testing.

Do not spend the hackathon chasing 100% coverage.

---

# 29. Definition of Done

The project is considered hackathon-ready when a judge can:

1. Open the live URL.
2. Understand the product immediately.
3. Search for an agent using normal language.
4. Browse all four target categories.
5. See real indexed BNB agent information.
6. Open a professional agent profile.
7. Understand why an agent is considered trustworthy/relevant.
8. Compare multiple agents.
9. Connect a wallet.
10. Create or demonstrate a real testnet hiring/job interaction.
11. See the resulting transaction/job information.
12. View the activity from a dashboard.
13. Use the application without seeing obvious placeholder or broken states.

---

# 30. Non-Goals for Hackathon MVP

Do NOT build unless core functionality is complete:

- custom L1/L2 blockchain
- DAO
- token
- NFT system
- social network
- mobile native app
- Kubernetes infrastructure
- Kafka
- custom blockchain node
- giant analytics platform
- dozens of custom agents
- complex machine learning ranking model
- paid LLM dependency
- excessive animation system

---

# 31. Code Quality Rules for Codex

When implementing this ticket:

1. Inspect the current repository before modifying files.
2. Preserve working functionality.
3. Prefer small composable components.
4. Avoid files becoming excessively large.
5. Keep domain logic outside React components where practical.
6. Do not use `any` unless unavoidable and documented.
7. Validate external data.
8. Add error handling around network boundaries.
9. Avoid unnecessary dependencies.
10. Do not introduce paid services without explicit approval.
11. Do not fabricate blockchain or agent data.
12. Keep secrets out of source control.
13. Update README/documentation when architecture changes.
14. Run lint/build/tests after meaningful implementation stages.
15. Fix introduced warnings/errors before declaring a milestone complete.

---

# 32. Codex Workflow

Do not implement MASTER-001 in one giant pass.

For each milestone:

### Before Coding

1. Inspect existing repository.
2. Identify affected files.
3. State implementation approach.
4. Identify potential risks.
5. Avoid changing unrelated areas.

### During Coding

Implement only the active milestone.

### After Coding

Run:

```bash
npm run lint
npm run test
npm run build
```

where available.

Then report:

```text
Completed
Files changed
Key decisions
Tests performed
Known limitations
Next milestone
```

Do not move automatically into unrelated future work if the current milestone has unresolved errors.

---

# 33. Initial Codex Instruction

When first receiving this ticket, Codex should:

1. Read this entire document.
2. Inspect the repository.
3. Determine the current implementation state.
4. Map existing work against M0–M12.
5. Do not overwrite useful existing code.
6. Begin with the earliest incomplete milestone.
7. Create a short implementation plan.
8. Implement that milestone.
9. Test the implementation.
10. Report completion and recommend the next milestone.

---

# 34. Product Success Statement

The finished application should communicate this clearly:

> Sift transforms a large, technical ecosystem of BNB Chain AI agents into a consumer-friendly marketplace where users can discover what agents do, compare their trust and capabilities, safely configure a mission, hire an agent, and monitor what happens next.

The engineering should be robust enough to demonstrate a credible path to production.

The presentation should be polished enough that the product does not visually feel like a weekend prototype.

The hackathon implementation should achieve this while relying primarily on free/open-source infrastructure and free service tiers.
