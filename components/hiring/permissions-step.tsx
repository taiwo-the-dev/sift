import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  Route,
  UserRoundCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  HiringAgentSummary,
  HiringMissionInput,
  HiringQuote,
} from "@/features/hiring/model";
import {
  buildTestnetAddressHref,
  erc8183Deployment,
} from "@/features/hiring/protocol";
import { hiringExpiryLabel } from "@/features/hiring/review";

interface PermissionsStepProps {
  agent: HiringAgentSummary;
  mission: HiringMissionInput;
  onBack: () => void;
  onContinue: () => void;
  quote: HiringQuote;
}

const restrictions = [
  {
    detail: "The signed quote and on-chain job use the agent's registered owner.",
    icon: UserRoundCheck,
    title: "Fixed provider",
  },
  {
    detail: "The ERC-8183 job budget is the provider's signed quote, never your higher spending cap.",
    icon: CircleDollarSign,
    title: "Exact budget",
  },
  {
    detail: "The escrow job has an on-chain deadline after which protocol recovery rules apply.",
    icon: CalendarClock,
    title: "Fixed deadline",
  },
  {
    detail: "Evaluation uses the verified optimistic policy approved by Sift.",
    icon: Route,
    title: "Verified evaluator",
  },
] as const;

export function PermissionsStep({
  agent,
  mission,
  onBack,
  onContinue,
  quote,
}: PermissionsStepProps) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          Step 2 · Limits and permissions
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Review what the protocol will allow.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          This flow grants no access to private data, arbitrary contracts, or
          unrestricted spending.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {restrictions.map((restriction) => {
          const Icon = restriction.icon;
          return (
            <article
              key={restriction.title}
              className="rounded-xl border border-border bg-background/45 p-4"
            >
              <Icon className="size-5 text-brand" aria-hidden="true" />
              <h3 className="mt-4 text-sm font-semibold text-foreground">
                {restriction.title}
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                {restriction.detail}
              </p>
            </article>
          );
        })}
      </div>

      <dl className="overflow-hidden rounded-xl border border-border bg-border text-sm">
        <div className="grid gap-px sm:grid-cols-3">
          <div className="bg-card p-4">
            <dt className="text-xs text-muted-foreground">Provider</dt>
            <dd className="mt-1.5 font-semibold text-foreground">{agent.name}</dd>
          </div>
          <div className="bg-card p-4">
            <dt className="text-xs text-muted-foreground">Exact quoted budget</dt>
            <dd className="mt-1.5 font-semibold text-foreground">
              {quote.budgetDisplay} {quote.tokenSymbol}
            </dd>
          </div>
          <div className="bg-card p-4">
            <dt className="text-xs text-muted-foreground">On-chain expiry</dt>
            <dd className="mt-1.5 font-semibold text-foreground">
              {hiringExpiryLabel(quote.expiresAt)}
            </dd>
          </div>
        </div>
      </dl>

      <p className="text-xs leading-5 text-muted-foreground">
        Your maximum was {mission.maxSpend} {quote.tokenSymbol}; the agent signed
        a quote for {quote.budgetDisplay} {quote.tokenSymbol}. Transactions target
        only the verified testnet deployment at{" "}
        <a
          className="font-medium text-foreground underline decoration-border underline-offset-4 hover:text-brand"
          href={buildTestnetAddressHref(erc8183Deployment.commerce)}
          rel="noreferrer noopener"
          target="_blank"
        >
          Agentic Commerce
        </a>
        .
      </p>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" size="lg" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Edit task
        </Button>
        <Button type="button" size="lg" onClick={onContinue}>
          Review hiring details
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
