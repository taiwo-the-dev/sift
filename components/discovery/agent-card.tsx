import {
  BadgeCheck,
  Blocks,
  CalendarDays,
  CircleAlert,
  Database,
} from "lucide-react";

import {
  formatAgentDescription,
  formatAgentName,
  formatCategory,
  formatChainName,
  formatMetadataStatus,
  formatRegistrationDate,
  formatServiceType,
} from "@/features/discovery/format";
import type { DiscoveryAgent } from "@/features/discovery/model";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  agent: DiscoveryAgent;
}

const metadataStatusStyles = {
  invalid: "border-amber-400/20 bg-amber-400/8 text-amber-200",
  pending: "border-sky-400/20 bg-sky-400/8 text-sky-200",
  unavailable: "border-border bg-secondary text-muted-foreground",
  valid: "border-emerald-400/20 bg-emerald-400/8 text-emerald-200",
} as const;

export function AgentCard({ agent }: AgentCardProps) {
  const visibleServices = [
    ...new Set(agent.services.map((service) => formatServiceType(service.serviceType))),
  ].slice(0, 4);
  const hiddenServiceCount = Math.max(0, agent.services.length - visibleServices.length);

  return (
    <article className="group flex min-h-96 flex-col overflow-hidden rounded-xl border border-border bg-card transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-input motion-reduce:transform-none">
      <div className="h-1 bg-gradient-to-r from-brand via-brand/35 to-transparent" />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold",
              metadataStatusStyles[agent.metadataStatus],
            )}
          >
            {agent.metadataStatus === "valid" ? (
              <BadgeCheck className="size-3" aria-hidden="true" />
            ) : (
              <CircleAlert className="size-3" aria-hidden="true" />
            )}
            {formatMetadataStatus(agent.metadataStatus)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[0.7rem] font-medium text-muted-foreground">
            <Blocks className="size-3" aria-hidden="true" />
            ERC-8004 identity
          </span>
        </div>

        <div className="mt-5 flex items-start gap-4">
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-lg border border-brand/25 bg-brand/8 text-sm font-semibold text-brand"
          >
            {formatAgentName(agent.name, agent.agentId).slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-[-0.025em] text-foreground">
              {formatAgentName(agent.name, agent.agentId)}
            </h2>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Agent #{agent.agentId}
            </p>
          </div>
        </div>

        <p className="mt-5 line-clamp-3 text-sm leading-6 text-muted-foreground">
          {formatAgentDescription(agent.description)}
        </p>

        <div className="mt-5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Category match
          </p>
          {agent.categories.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {agent.categories.slice(0, 2).map((category) => (
                <span
                  key={category}
                  title={
                    agent.categorySource === "deterministic-keyword"
                      ? "Deterministically matched from indexed metadata keywords"
                      : "Category supplied by indexed metadata"
                  }
                  className="rounded-md bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand"
                >
                  {formatCategory(category)}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Not available</p>
          )}
        </div>

        <div className="mt-5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Declared services
          </p>
          {visibleServices.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {visibleServices.map((service) => (
                <span
                  key={service}
                  className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  {service}
                </span>
              ))}
              {hiddenServiceCount > 0 ? (
                <span className="px-1 py-1 text-xs text-muted-foreground">
                  +{hiddenServiceCount} more
                </span>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Not available</p>
          )}
        </div>

        <div className="mt-auto grid grid-cols-1 gap-2 border-t border-border pt-5 text-xs text-muted-foreground sm:grid-cols-2">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="size-3.5 text-brand" aria-hidden="true" />
            {formatRegistrationDate(agent.registeredAt)}
          </span>
          <span className="inline-flex items-center gap-2 sm:justify-self-end">
            <Database className="size-3.5 text-brand" aria-hidden="true" />
            {formatChainName(agent.chainId)}
          </span>
        </div>
      </div>
    </article>
  );
}
