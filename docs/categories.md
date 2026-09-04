# M14 category evidence and parity

Sift uses one versioned taxonomy for Yield Optimisation, Grid Trading, Health
Factor Monitoring, and Liquidity Rebalancing. The taxonomy is implemented in
`features/categories/taxonomy.ts` and currently reports version
`sift-category-taxonomy-v1.0.0`.

## Classification contract

An exact supported category value in validated agent or service metadata is
stored as `declared-metadata` with classification confidence `1.0`. A match
against a documented narrow phrase rule is stored separately as
`deterministic-rule` with confidence `0.65`. Generic terms such as “AI”,
“trading”, “APR”, or “pool” do not qualify by themselves.

Classification confidence describes confidence in the category mapping. It is
not a performance, safety, profitability, or availability score. Each evidence
row retains the rule version, matched terms, source fields, and metadata
observation time. Invalid or unavailable metadata never creates new category
evidence, and a failed metadata refresh does not become a positive claim.

| Category | Required narrow evidence examples | Category-specific facts shown only when found in validated source text |
| --- | --- | --- |
| Yield Optimisation | yield optimisation, yield strategy/routing/research, APR/APY comparison, vault strategy | protocol, asset, supported behavior, declared service |
| Grid Trading | grid trading, grid levels, bounded grid, grid strategy | venue/market, asset, grid behavior, declared service |
| Health Factor Monitoring | health factor, liquidation risk/alert, collateral health | lending protocol, monitored position, alert behavior, declared service |
| Liquidity Rebalancing | liquidity or LP rebalancing, concentrated liquidity, range management/LP range | protocol/venue, position/range behavior, declared service |

The source dictionary is intentionally bounded. A supported term is displayed
only with the indexed field that supplied it. Sift does not infer APR, returns,
win rate, uptime, custody, price, or risk.

## Mainnet shortlist bar

The M14 curation command accepts a candidate only when all of these are true at
run time:

- the exact chain-56 ERC-8004 identity exists in Sift's completed index;
- current metadata status is `valid` and a description is present;
- the versioned classifier has stored evidence for the intended category;
- at least one validated metadata service declares a public HTTPS endpoint.

The shortlist rank is editorial demo ordering, not a performance ranking.
Health, reputation, feedback, and Sift Score may still be Unknown. Those gaps
are measured rather than used to disqualify an otherwise well-described real
agent.

| Category | Curated BSC Mainnet identities |
| --- | --- |
| Yield Optimisation | `#326106`, `#322046`, `#315946` |
| Grid Trading | `#323332`, `#330536`, `#324936` |
| Health Factor Monitoring | `#331625`, `#330663`, `#322885` |
| Liquidity Rebalancing | `#315944`, `#325413`, `#265375` |

The public identity list lives in `features/categories/shortlist.ts`. The
curation script revalidates it before writing; it cannot seed an identity or
bypass the source bar.

## 8004scan cross-check

Sift's own chain index remains the core catalogue. The server-only 8004scan
adapter calls the exact chain/registry/token endpoint for only the 12 curated
agents. It checks identity, registry, owner, capability, feedback, reputation,
validation and network fields where supplied, preserves the bounded raw
response separately from normalized fields, records conflicts, and never
overwrites chain-indexed identity.

Successful responses are cached for six hours; unavailable responses are
cached for 15 minutes. Requests are serialized below the documented free-tier
rate, use a fixed HTTPS API origin, refuse redirects, time out after eight
seconds, and cap JSON responses at 512 KB. With `SIFT_8004SCAN_API_KEY` set,
the key is sent only as `X-API-Key` from the server. Without it, the adapter
uses the more conservative anonymous rate and core Sift pages continue to
work. API errors become `unavailable`, never invented evidence.

## Hosted runbook

After the M14 migration is deployed, run in order:

```bash
npm run classify:categories
npm run curate:categories
npm run enrich:categories
npm run check:agents
npm run score:agents
npm run report:categories
```

Classification is an idempotent one-time historical backfill; the Sift Indexer
classifies future successful metadata updates as it writes them. Curation and
enrichment are bounded to 12 agents. The health queue prioritizes shortlisted
agents that already meet the existing safe endpoint rules; it does not loosen
probe security. Scoring then recalculates only affected evidence. There is no
supported reputation source in the current Sift schema, so the coverage report
may correctly show zero reputation rows.

The timestamped report measures, per category: inventory, valid metadata,
service, health, reputation, score, image, endpoint, mainnet activation,
shortlist, 8004scan cross-check, and latest category observation. It exits
non-zero unless every category has at least three real classified candidates,
three validated shortlist rows, and three recorded cross-check outcomes. The
same read-only report is exposed at `/api/reports/category-coverage` and is
required by `release:data` and the deployed release smoke test.

Mainnet activation coverage is intentionally zero. Mainnet profiles support
discovery and comparison; only compatible BSC Testnet ERC-8183 identities may
enter the guarded existing hiring flow.
