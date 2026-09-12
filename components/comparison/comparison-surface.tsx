import {
  BadgeCheck,
  ChevronDown,
  CircleAlert,
  Gauge,
  RadioTower,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BookmarkToggle } from "@/components/bookmarks/bookmark-toggle";
import { AgentAvatar } from "@/components/discovery/agent-avatar";
import { AgentSelectionActions } from "@/components/comparison/comparison-actions";
import { AnimatedRatingValue } from "@/components/scoring/animated-rating-value";
import { formatProfileTimestamp } from "@/features/agents/format";
import type { AgentProfile } from "@/features/agents/model";
import {
  collectDeclaredCapabilities,
  formatCapabilityLabel,
} from "@/features/agents/presentation";
import { buildAgentProfileHref } from "@/features/agents/route";
import { shouldShowOtherCategory } from "@/features/categories/presentation";
import type {
  AgentReference,
  ContextualMatch,
} from "@/features/comparison/model";
import {
  formatAgentName,
  formatCategory,
  formatChainName,
  formatMetadataStatus,
  formatServiceType,
} from "@/features/discovery/format";
import {
  describeHealthOutcome,
  getHealthPresentation,
} from "@/features/health/presentation";
import {
  describeScoreConfidence,
  getAgentRating,
  isScoreStale,
  scoreComponentRows,
} from "@/features/scoring/presentation";
import { cn } from "@/lib/utils";

interface ComparisonSurfaceProps {
  agents: readonly AgentProfile[];
  contextualMatch: ContextualMatch | null;
  goal: string;
  references: readonly AgentReference[];
}

interface ComparisonRow {
  description: string;
  hasValue?(agent: AgentProfile): boolean;
  label: string;
  render(agent: AgentProfile): ReactNode;
}

interface ComparisonSection {
  description: string;
  label: string;
  rows: readonly ComparisonRow[];
}

function MissingValue({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p className="min-w-0 text-sm leading-6 font-medium text-muted-foreground [overflow-wrap:anywhere]">
      {children}
    </p>
  );
}

function ScoreValue({ agent }: Readonly<{ agent: AgentProfile }>) {
  const rating = getAgentRating(agent);
  const score = agent.score;

  return (
    <div>
      <p className="text-lg font-semibold text-foreground">
        <AnimatedRatingValue value={rating.value} />/100
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {rating.label} ·{" "}
        {rating.kind === "verified" && score
          ? `${describeScoreConfidence(score.confidence)} · ${rating.detail}`
          : rating.detail}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {score
          ? `${isScoreStale(score.calculatedAt) ? "Stale" : "Current"} · ${formatProfileTimestamp(score.calculatedAt)}`
          : "Calculated from the current published profile"}
      </p>
    </div>
  );
}

function ScoreBreakdownValue({ agent }: Readonly<{ agent: AgentProfile }>) {
  if (!agent.score) {
    const rating = getAgentRating(agent);
    return (
      <div className="text-sm leading-6">
        <p className="font-semibold text-foreground">{rating.label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {rating.detail}. This rating uses profile quality and published service
          information only.
        </p>
      </div>
    );
  }

  return (
    <details>
      <summary className="cursor-pointer rounded-sm text-sm font-semibold text-brand outline-none focus-visible:ring-3 focus-visible:ring-ring/30">
        View six components
      </summary>
      <dl className="mt-3 grid gap-2 text-xs">
        {scoreComponentRows(agent.score).map((row) => (
          <div key={row.key} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-mono text-foreground">
              {row.value === null ? "Not available" : `${row.value}/100`}
            </dd>
          </div>
        ))}
      </dl>
      <dl className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        <div>
          <dt>Health source</dt>
          <dd className="mt-0.5 text-foreground">
            {formatProfileTimestamp(agent.score.sourceFreshness.healthAt)}
          </dd>
        </div>
        <div className="mt-2">
          <dt>Profile source</dt>
          <dd className="mt-0.5 text-foreground">
            {formatProfileTimestamp(agent.score.sourceFreshness.metadataAt)}
          </dd>
        </div>
        <div className="mt-2">
          <dt>Reputation source</dt>
          <dd className="mt-0.5 text-foreground">
            {formatProfileTimestamp(agent.score.sourceFreshness.reputationAt)}
          </dd>
        </div>
      </dl>
    </details>
  );
}

function ReputationValue({ agent }: Readonly<{ agent: AgentProfile }>) {
  const reputation = agent.reputation;

  if (!reputation) {
    return <MissingValue>No reputation data available.</MissingValue>;
  }

  return (
    <div className="text-sm leading-6">
      <p className="font-semibold text-foreground">
        {reputation.reputationScore === null
          ? "Score unavailable"
          : `Recorded score ${reputation.reputationScore}`}
      </p>
      <p className="text-xs text-muted-foreground">
        {reputation.feedbackCount === null
          ? "Feedback not reported"
          : `${reputation.feedbackCount} feedback records`}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Source: {reputation.source ?? "Not available"} · checked{" "}
        {formatProfileTimestamp(reputation.sourceObservedAt)}
      </p>
    </div>
  );
}

function HealthValue({ agent }: Readonly<{ agent: AgentProfile }>) {
  const health = agent.health;
  const presentation = getHealthPresentation(health, agent.services);

  if (!health) {
    return <MissingValue>{presentation.detail}</MissingValue>;
  }

  return (
    <div className="text-sm leading-6">
      <p className="inline-flex items-center gap-2 font-semibold text-foreground">
        <RadioTower className="size-4 text-brand" aria-hidden="true" />
        {presentation.label}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {describeHealthOutcome(health.outcome)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Checked {formatProfileTimestamp(health.lastCheckedAt)}
      </p>
    </div>
  );
}

function CategoriesValue({ agent }: Readonly<{ agent: AgentProfile }>) {
  if (shouldShowOtherCategory(agent.categories)) {
    return (
      <div>
        <span className="rounded-full border border-border bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">
          Other
        </span>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          This agent does not match a supported Sift category.
        </p>
      </div>
    );
  }

  return agent.categories.length > 0 ? (
    <div className="flex flex-wrap gap-1.5">
      {agent.categories.map((category) => (
        <span
          key={category}
          className="rounded-full border border-brand/20 bg-brand/8 px-2 py-1 text-xs font-medium text-brand"
        >
          {formatCategory(category)}
        </span>
      ))}
      <p className="w-full text-xs leading-5 text-muted-foreground">
        {agent.categorySource === "deterministic-rule"
          ? "Suggested from the agent's verified profile data."
          : "Published in the agent's verified profile."}
      </p>
      {agent.categoryEvidence[0] ? (
        <p className="w-full text-xs leading-5 text-muted-foreground">
          {Math.round(agent.categoryEvidence[0].confidence * 100)}% match
          confidence · {agent.categoryEvidence[0].ruleVersion} · checked{" "}
          {formatProfileTimestamp(agent.categoryEvidence[0].observedAt)}
        </p>
      ) : null}
    </div>
  ) : (
    <MissingValue>No supported category listed.</MissingValue>
  );
}

function CapabilityValue({ agent }: Readonly<{ agent: AgentProfile }>) {
  const capabilities = collectDeclaredCapabilities(agent.services);

  return capabilities.length > 0 ? (
    <ul className="grid min-w-0 gap-2 text-sm text-foreground">
      {capabilities.slice(0, 8).map((capability) => (
        <li key={capability} className="flex min-w-0 items-start gap-2">
          <span
            className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60"
            aria-hidden="true"
          />
          <span className="min-w-0 leading-5 [overflow-wrap:anywhere]">
            {formatCapabilityLabel(capability)}
          </span>
        </li>
      ))}
    </ul>
  ) : (
    <MissingValue>No capabilities listed.</MissingValue>
  );
}

function CategoryFactsValue({ agent }: Readonly<{ agent: AgentProfile }>) {
  const facts = agent.categoryEvidence.flatMap((evidence) => evidence.facts);

  return facts.length > 0 ? (
    <dl className="grid gap-2 text-xs">
      {facts.slice(0, 12).map((fact) => (
        <div key={`${fact.key}:${fact.value}`} className="border-b border-border pb-2 last:border-0">
          <dt className="text-muted-foreground">{fact.label}</dt>
          <dd className="mt-0.5 min-w-0 font-medium text-foreground [overflow-wrap:anywhere]">
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  ) : (
    <MissingValue>No additional category details available.</MissingValue>
  );
}

function ExternalCrossCheckValue({ agent }: Readonly<{ agent: AgentProfile }>) {
  const evidence = agent.externalEvidence;

  return evidence ? (
    <div className="text-xs leading-5">
      <p className="font-semibold capitalize text-foreground">{evidence.availability.replaceAll("-", " ")}</p>
      <p className="mt-1 text-muted-foreground">8004scan · checked {formatProfileTimestamp(evidence.observedAt)}</p>
      {evidence.conflictFields.length > 0 ? (
        <p className="mt-1 text-amber-200">Conflict: {evidence.conflictFields.join(", ")}</p>
      ) : null}
    </div>
  ) : (
    <MissingValue>No 8004scan comparison available.</MissingValue>
  );
}

function ServicesValue({ agent }: Readonly<{ agent: AgentProfile }>) {
  return agent.services.length > 0 ? (
    <ul className="grid gap-2 text-sm">
      {agent.services.map((service, index) => (
        <li key={`${service.serviceType}:${service.version ?? ""}:${index}`}>
          <span className="font-semibold text-foreground">
            {formatServiceType(service.serviceType)}
          </span>
          <span className="block text-xs text-muted-foreground">
            Version {service.version ?? "not listed"}
          </span>
        </li>
      ))}
    </ul>
  ) : (
    <MissingValue>No services listed.</MissingValue>
  );
}

function ActivityValue({ agent }: Readonly<{ agent: AgentProfile }>) {
  const reputation = agent.reputation;

  if (
    !reputation ||
    (reputation.successfulJobs === null && reputation.failedJobs === null)
  ) {
    return (
      <MissingValue>No task history available.</MissingValue>
    );
  }

  return (
    <dl className="grid gap-1 text-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">Successful</dt>
        <dd className="font-semibold text-foreground">
          {reputation.successfulJobs ?? "Not reported"}
        </dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">Failed</dt>
        <dd className="font-semibold text-foreground">
          {reputation.failedJobs ?? "Not reported"}
        </dd>
      </div>
      <div className="mt-1 border-t border-border pt-2 text-xs text-muted-foreground">
        Last activity {formatProfileTimestamp(reputation.lastActivityAt)}
      </div>
    </dl>
  );
}

function ProtocolValue({ agent }: Readonly<{ agent: AgentProfile }>) {
  const protocols = [
    "ERC-8004",
    ...new Set(agent.services.map((service) => formatServiceType(service.serviceType))),
    agent.x402Supported === true ? "x402 supported" : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <div>
      <ul className="grid min-w-0 gap-1.5 text-sm text-foreground [overflow-wrap:anywhere]">
        {protocols.map((protocol) => (
          <li key={protocol} className="flex min-w-0 items-start gap-2">
            <span
              className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60"
              aria-hidden="true"
            />
            <span className="min-w-0 leading-5 [overflow-wrap:anywhere]">
              {protocol}
            </span>
          </li>
        ))}
      </ul>
      {agent.x402Supported === null ? (
        <p className="mt-2 text-xs text-muted-foreground">
          x402 support is not declared.
        </p>
      ) : agent.x402Supported === false ? (
        <p className="mt-2 text-xs text-muted-foreground">
          x402 support is not listed.
        </p>
      ) : null}
    </div>
  );
}

function LastVerifiedValue({ agent }: Readonly<{ agent: AgentProfile }>) {
  return (
    <dl className="grid gap-2 text-xs">
      <div>
        <dt className="text-muted-foreground">Profile verified</dt>
        <dd className="mt-0.5 text-foreground">
          {formatProfileTimestamp(agent.metadataVerifiedAt)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Last updated</dt>
        <dd className="mt-0.5 text-foreground">
          {formatProfileTimestamp(agent.lastSyncedAt)}
        </dd>
      </div>
    </dl>
  );
}

const comparisonSections: readonly ComparisonSection[] = [
  {
    description: "The signals most useful when choosing an agent.",
    label: "Decision overview",
    rows: [
      {
        description: "Rating, evidence level, and last update.",
        label: "Agent rating",
        render: (agent) => <ScoreValue agent={agent} />,
      },
      {
        description: "Latest service health check.",
        hasValue: (agent) => agent.health !== null,
        label: "Health",
        render: (agent) => <HealthValue agent={agent} />,
      },
      {
        description: "Published or suggested agent categories.",
        label: "Categories",
        render: (agent) => <CategoriesValue agent={agent} />,
      },
      {
        description: "Published service types and versions.",
        hasValue: (agent) => agent.services.length > 0,
        label: "Services",
        render: (agent) => <ServicesValue agent={agent} />,
      },
    ],
  },
  {
    description:
      "Supporting information behind each agent's headline signals.",
    label: "Evidence and activity",
    rows: [
      {
        description: "How the available rating factors contribute.",
        label: "Rating evidence",
        render: (agent) => <ScoreBreakdownValue agent={agent} />,
      },
      {
        description: "Reputation, feedback, source, and update time.",
        hasValue: (agent) => agent.reputation !== null,
        label: "Reputation",
        render: (agent) => <ReputationValue agent={agent} />,
      },
      {
        description: "Capabilities published by the agent.",
        hasValue: (agent) =>
          collectDeclaredCapabilities(agent.services).length > 0,
        label: "Capabilities",
        render: (agent) => <CapabilityValue agent={agent} />,
      },
      {
        description: "Details related to the selected category.",
        hasValue: (agent) =>
          agent.categoryEvidence.some((evidence) => evidence.facts.length > 0),
        label: "Category details",
        render: (agent) => <CategoryFactsValue agent={agent} />,
      },
      {
        description: "Reported successful and failed tasks.",
        hasValue: (agent) =>
          agent.reputation !== null &&
          (agent.reputation.successfulJobs !== null ||
            agent.reputation.failedJobs !== null),
        label: "Task history",
        render: (agent) => <ActivityValue agent={agent} />,
      },
    ],
  },
  {
    description: "Protocols, external checks, freshness, cost, and risk.",
    label: "Technical details",
    rows: [
      {
        description: "Agent, service, and payment protocols.",
        label: "Protocols",
        render: (agent) => <ProtocolValue agent={agent} />,
      },
      {
        description: "Agent details compared with 8004scan.",
        hasValue: (agent) => agent.externalEvidence !== null,
        label: "8004scan comparison",
        render: (agent) => <ExternalCrossCheckValue agent={agent} />,
      },
      {
        description: "Profile verification and latest directory update.",
        hasValue: (agent) =>
          agent.metadataVerifiedAt !== null || agent.lastSyncedAt !== null,
        label: "Updates",
        render: (agent) => <LastVerifiedValue agent={agent} />,
      },
      {
        description: "Recorded pricing or cost information.",
        hasValue: () => false,
        label: "Known cost",
        render: () => (
          <MissingValue>No cost information available.</MissingValue>
        ),
      },
      {
        description: "Recorded agent risk information.",
        hasValue: () => false,
        label: "Risk rating",
        render: () => (
          <MissingValue>No risk rating available.</MissingValue>
        ),
      },
    ],
  },
];

function isMatch(agent: AgentProfile, match: ContextualMatch | null): boolean {
  return Boolean(
    match &&
      match.agent.chainId === agent.chainId &&
      match.agent.agentId === agent.agentId,
  );
}

function AgentColumnHeader({
  agent,
  contextualMatch,
  goal,
  references,
}: Readonly<{
  agent: AgentProfile;
  contextualMatch: ContextualMatch | null;
  goal: string;
  references: readonly AgentReference[];
}>) {
  const name = formatAgentName(agent.name, agent.agentId);
  const profileHref = buildAgentProfileHref(agent.chainId, agent.agentId);
  const highlighted = isMatch(agent, contextualMatch);
  const rating = getAgentRating(agent);

  return (
    <div className="min-w-0">
      <div className="flex items-start gap-3">
        <AgentAvatar
          agentId={agent.agentId}
          imageUrl={agent.imageUrl}
          name={name}
        />
        <div className="min-w-0">
          {highlighted ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-brand/25 bg-brand/10 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-brand">
              <Sparkles className="size-3" aria-hidden="true" />
              Contextual match
            </span>
          ) : null}
          <h2
            className={cn(
              "line-clamp-2 text-lg font-semibold leading-6 text-foreground",
              highlighted && "mt-2",
            )}
          >
            {profileHref ? (
              <Link
                href={profileHref}
                className="rounded-sm outline-none hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                {name}
              </Link>
            ) : (
              name
            )}
          </h2>
          <p className="mt-1 font-mono text-[0.68rem] font-semibold text-brand">
            {formatChainName(agent.chainId)} · Agent #{agent.agentId}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[0.68rem]">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-muted-foreground">
          {agent.metadataStatus === "valid" ? (
            <BadgeCheck className="size-3 text-emerald-300" aria-hidden="true" />
          ) : (
            <CircleAlert className="size-3 text-amber-300" aria-hidden="true" />
          )}
          {formatMetadataStatus(agent.metadataStatus)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-muted-foreground">
          <Gauge className="size-3 text-brand" aria-hidden="true" />
          <AnimatedRatingValue value={rating.value} />/100 · {rating.label}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <BookmarkToggle agent={agent} variant="compact" />
        <AgentSelectionActions
          className="mt-0"
          goal={goal}
          reference={{ agentId: agent.agentId, chainId: agent.chainId }}
          references={references}
        />
      </div>
    </div>
  );
}

export function ComparisonSurface({
  agents,
  contextualMatch,
  goal,
  references,
}: ComparisonSurfaceProps) {
  const visibleSections = comparisonSections
    .map((section) => ({
      ...section,
      rows: section.rows.filter(
        (row) => !row.hasValue || agents.some((agent) => row.hasValue?.(agent)),
      ),
    }))
    .filter((section) => section.rows.length > 0);

  return (
    <>
      <div className="grid gap-5 lg:hidden">
        {agents.map((agent) => (
          <article
            key={`${agent.chainId}:${agent.agentId}`}
            className={cn(
              "overflow-hidden rounded-2xl border bg-card shadow-[0_18px_45px_rgba(0,0,0,0.12)]",
              isMatch(agent, contextualMatch)
                ? "border-brand/50 shadow-lg shadow-brand/5"
                : "border-border",
            )}
          >
            <header className="border-b border-border bg-[radial-gradient(circle_at_100%_0%,rgba(240,185,11,0.12),transparent_16rem)] p-4 sm:p-5">
              <AgentColumnHeader
                agent={agent}
                contextualMatch={contextualMatch}
                goal={goal}
                references={references}
              />
            </header>
            <div className="divide-y divide-border">
              {visibleSections.map((section, sectionIndex) => (
                <details
                  key={section.label}
                  open={sectionIndex === 0}
                  className="group/section"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 outline-none marker:hidden focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/30 sm:px-5 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">
                        {section.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                        {section.description}
                      </span>
                    </span>
                    <ChevronDown
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-open/section:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <dl className="border-t border-border bg-background/30">
                    {section.rows.map((row) => (
                      <div
                        key={row.label}
                        className="grid gap-3 border-b border-border p-4 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:p-5"
                      >
                        <dt>
                          <p className="text-sm font-semibold text-foreground">
                            {row.label}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {row.description}
                          </p>
                        </dt>
                        <dd className="min-w-0 [overflow-wrap:anywhere]">
                          {row.render(agent)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_55px_rgba(0,0,0,0.14)] lg:block">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[64rem] table-fixed border-collapse">
            <caption className="sr-only">
              Side-by-side comparison of selected agents
            </caption>
            <thead className="relative z-20">
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-30 w-56 border-r border-b border-border bg-background p-5 text-left align-top"
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Comparison
                  </span>
                </th>
                {agents.map((agent) => (
                  <th
                    key={`${agent.chainId}:${agent.agentId}`}
                    scope="col"
                    className={cn(
                      "min-w-0 border-r border-b border-border bg-card p-5 text-left align-top [overflow-wrap:anywhere] last:border-r-0",
                      isMatch(agent, contextualMatch) && "bg-brand/[0.045]",
                    )}
                  >
                    <AgentColumnHeader
                      agent={agent}
                      contextualMatch={contextualMatch}
                      goal={goal}
                      references={references}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleSections.flatMap((section) => [
                <tr key={`${section.label}:section`}>
                  <th
                    colSpan={agents.length + 1}
                    className="border-b border-border bg-secondary/70 px-5 py-3 text-left"
                  >
                    <span className="text-[0.68rem] font-semibold tracking-[0.13em] text-brand uppercase">
                      {section.label}
                    </span>
                    <span className="ml-3 text-xs font-normal text-muted-foreground">
                      {section.description}
                    </span>
                  </th>
                </tr>,
                ...section.rows.map((row) => (
                  <tr key={`${section.label}:${row.label}`}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-r border-b border-border bg-background p-5 text-left align-top"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {row.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {row.description}
                      </p>
                    </th>
                    {agents.map((agent) => (
                      <td
                        key={`${agent.chainId}:${agent.agentId}`}
                        className={cn(
                          "min-w-0 whitespace-normal border-r border-b border-border bg-card p-5 align-top [overflow-wrap:anywhere] last:border-r-0",
                          isMatch(agent, contextualMatch) && "bg-brand/[0.035]",
                        )}
                      >
                        {row.render(agent)}
                      </td>
                    ))}
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
