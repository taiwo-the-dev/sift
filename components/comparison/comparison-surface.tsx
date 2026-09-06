import {
  BadgeCheck,
  CircleAlert,
  Gauge,
  RadioTower,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AgentAvatar } from "@/components/discovery/agent-avatar";
import { AgentSelectionActions } from "@/components/comparison/comparison-actions";
import { formatProfileTimestamp } from "@/features/agents/format";
import type { AgentProfile } from "@/features/agents/model";
import { collectDeclaredCapabilities } from "@/features/agents/presentation";
import { buildAgentProfileHref } from "@/features/agents/route";
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
  isHealthStale,
} from "@/features/health/presentation";
import {
  describeScoreConfidence,
  formatScoreConfidence,
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
  label: string;
  render(agent: AgentProfile): ReactNode;
}

function UnknownValue({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="block text-sm leading-6 text-muted-foreground">
      <span className="font-medium text-foreground">Unknown</span>
      <span className="mt-1 block text-xs leading-5">{children}</span>
    </span>
  );
}

function ScoreValue({ agent }: Readonly<{ agent: AgentProfile }>) {
  const score = agent.score;

  if (!score) {
    return (
      <UnknownValue>Sift Score is not available for this agent.</UnknownValue>
    );
  }

  return (
    <div>
      <p className="text-lg font-semibold text-foreground">
        {score.score === null ? "Not enough data" : `${score.score}/100`}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {describeScoreConfidence(score.confidence)} ·{" "}
        {formatScoreConfidence(score.confidence)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {isScoreStale(score.calculatedAt) ? "Stale" : "Current"} ·{" "}
        {formatProfileTimestamp(score.calculatedAt)}
      </p>
    </div>
  );
}

function ScoreBreakdownValue({ agent }: Readonly<{ agent: AgentProfile }>) {
  if (!agent.score) {
    return <UnknownValue>Score details are not available.</UnknownValue>;
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
              {row.value === null ? "Unknown" : `${row.value}/100`}
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
    return <UnknownValue>No reputation data is available.</UnknownValue>;
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
          ? "Feedback count unknown"
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

  if (!health) {
    return <UnknownValue>No health check is available.</UnknownValue>;
  }

  return (
    <div className="text-sm leading-6">
      <p className="inline-flex items-center gap-2 font-semibold capitalize text-foreground">
        <RadioTower className="size-4 text-brand" aria-hidden="true" />
        {isHealthStale(health) ? "Stale " : ""}{health.status}
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
    <UnknownValue>No supported category is listed.</UnknownValue>
  );
}

function CapabilityValue({ agent }: Readonly<{ agent: AgentProfile }>) {
  const capabilities = collectDeclaredCapabilities(agent.services);

  return capabilities.length > 0 ? (
    <ul className="grid gap-1.5 text-sm text-foreground">
      {capabilities.slice(0, 8).map((capability) => (
        <li key={capability}>• {capability}</li>
      ))}
    </ul>
  ) : (
    <UnknownValue>No capabilities are listed.</UnknownValue>
  );
}

function CategoryFactsValue({ agent }: Readonly<{ agent: AgentProfile }>) {
  const facts = agent.categoryEvidence.flatMap((evidence) => evidence.facts);

  return facts.length > 0 ? (
    <dl className="grid gap-2 text-xs">
      {facts.slice(0, 12).map((fact) => (
        <div key={`${fact.key}:${fact.value}`} className="border-b border-border pb-2 last:border-0">
          <dt className="text-muted-foreground">{fact.label}</dt>
          <dd className="mt-0.5 font-medium text-foreground">{fact.value}</dd>
        </div>
      ))}
    </dl>
  ) : (
    <UnknownValue>No additional category details are available.</UnknownValue>
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
    <UnknownValue>No 8004scan comparison is available.</UnknownValue>
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
    <UnknownValue>No services are listed.</UnknownValue>
  );
}

function ActivityValue({ agent }: Readonly<{ agent: AgentProfile }>) {
  const reputation = agent.reputation;

  if (
    !reputation ||
    (reputation.successfulJobs === null && reputation.failedJobs === null)
  ) {
    return (
      <UnknownValue>No task history is available.</UnknownValue>
    );
  }

  return (
    <dl className="grid gap-1 text-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">Successful</dt>
        <dd className="font-semibold text-foreground">
          {reputation.successfulJobs ?? "Unknown"}
        </dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">Failed</dt>
        <dd className="font-semibold text-foreground">
          {reputation.failedJobs ?? "Unknown"}
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
      <ul className="grid gap-1.5 text-sm text-foreground">
        {protocols.map((protocol) => (
          <li key={protocol}>• {protocol}</li>
        ))}
      </ul>
      {agent.x402Supported === null ? (
        <p className="mt-2 text-xs text-muted-foreground">
          x402 support is unknown.
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

const comparisonRows: readonly ComparisonRow[] = [
  {
    description: "Score, confidence, available data, and last update.",
    label: "Sift Score",
    render: (agent) => <ScoreValue agent={agent} />,
  },
  {
    description: "How the six score factors contribute.",
    label: "Score breakdown",
    render: (agent) => <ScoreBreakdownValue agent={agent} />,
  },
  {
    description: "Reputation score, feedback, source, and update time.",
    label: "Reputation",
    render: (agent) => <ReputationValue agent={agent} />,
  },
  {
    description: "Latest service health check.",
    label: "Health",
    render: (agent) => <HealthValue agent={agent} />,
  },
  {
    description: "Published or suggested agent categories.",
    label: "Categories",
    render: (agent) => <CategoriesValue agent={agent} />,
  },
  {
    description: "Capabilities published by the agent.",
    label: "Capabilities",
    render: (agent) => <CapabilityValue agent={agent} />,
  },
  {
    description: "Additional details related to the selected category.",
    label: "Category details",
    render: (agent) => <CategoryFactsValue agent={agent} />,
  },
  {
    description: "Agent details compared with 8004scan.",
    label: "8004scan comparison",
    render: (agent) => <ExternalCrossCheckValue agent={agent} />,
  },
  {
    description: "Published service types and versions.",
    label: "Services",
    render: (agent) => <ServicesValue agent={agent} />,
  },
  {
    description: "Reported successful and failed tasks.",
    label: "Task history",
    render: (agent) => <ActivityValue agent={agent} />,
  },
  {
    description: "Agent, service, and payment protocols.",
    label: "Protocols",
    render: (agent) => <ProtocolValue agent={agent} />,
  },
  {
    description: "Profile verification and latest directory update.",
    label: "Updates",
    render: (agent) => <LastVerifiedValue agent={agent} />,
  },
  {
    description: "Recorded pricing or cost information.",
    label: "Known cost",
    render: () => (
      <UnknownValue>No cost information is available.</UnknownValue>
    ),
  },
  {
    description: "Recorded agent risk information.",
    label: "Risk rating",
    render: () => (
      <UnknownValue>
        No risk rating is available.
      </UnknownValue>
    ),
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

  return (
    <div>
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
          <h2 className={cn("text-lg font-semibold text-foreground", highlighted && "mt-2")}>
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
          {agent.score?.score === null || !agent.score
            ? "Score unavailable"
            : `${agent.score.score}/100`}
        </span>
      </div>
      <AgentSelectionActions
        goal={goal}
        reference={{ agentId: agent.agentId, chainId: agent.chainId }}
        references={references}
      />
    </div>
  );
}

export function ComparisonSurface({
  agents,
  contextualMatch,
  goal,
  references,
}: ComparisonSurfaceProps) {
  return (
    <>
      <div className="grid gap-4 lg:hidden">
        {agents.map((agent) => (
          <article
            key={`${agent.chainId}:${agent.agentId}`}
            className={cn(
              "overflow-hidden rounded-xl border bg-card",
              isMatch(agent, contextualMatch)
                ? "border-brand/50 shadow-lg shadow-brand/5"
                : "border-border",
            )}
          >
            <header className="border-b border-border p-4 sm:p-5">
              <AgentColumnHeader
                agent={agent}
                contextualMatch={contextualMatch}
                goal={goal}
                references={references}
              />
            </header>
            <dl>
              {comparisonRows.map((row) => (
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
                  <dd>{row.render(agent)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:block">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[64rem] table-fixed border-collapse">
            <caption className="sr-only">
              Side-by-side comparison of selected agents
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="w-56 border-b border-r border-border bg-background/80 p-5 text-left align-top"
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
                      "border-b border-r border-border p-5 text-left align-top last:border-r-0",
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
              {comparisonRows.map((row) => (
                <tr key={row.label}>
                  <th
                    scope="row"
                    className="border-b border-r border-border bg-background/55 p-5 text-left align-top"
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
                        "border-b border-r border-border p-5 align-top last:border-r-0",
                        isMatch(agent, contextualMatch) && "bg-brand/[0.035]",
                      )}
                    >
                      {row.render(agent)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
