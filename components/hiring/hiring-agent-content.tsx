import { CircleAlert, CircleCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HiringFlow } from "@/components/hiring/hiring-flow";
import { buttonVariants } from "@/components/ui/button";
import type { AgentProfileIdentity } from "@/features/agents/route";
import { getAgentProfile } from "@/features/agents/service";
import {
  assessHiringCompatibility,
  toHiringAgentSummary,
} from "@/features/hiring/compatibility";
import { cn } from "@/lib/utils";

export async function HiringAgentContent({
  identity,
}: Readonly<{ identity: AgentProfileIdentity }>) {
  const profile = await getAgentProfile(identity.chainId, identity.agentId);

  if (!profile) notFound();

  const compatibility = assessHiringCompatibility(profile);
  const alternativeParams = new URLSearchParams({
    metadata: "valid",
    network: "bsc-testnet",
    q: "ERC-8183",
  });
  const firstCategory = profile.categories[0];

  if (firstCategory) {
    alternativeParams.set("category", firstCategory);
  }

  return (
    <div className="sift-data-arrival mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {compatibility.compatibility ? (
        <HiringFlow agent={toHiringAgentSummary(profile)} />
      ) : (
        <section className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-7 text-center sm:p-10">
          <div className="mx-auto grid size-14 place-items-center rounded-full border border-amber-400/25 bg-amber-400/8 text-amber-300">
            <CircleAlert className="size-6" aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-foreground">
            {compatibility.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {compatibility.explanation} No quote or transaction is created
            unless these checks pass.
          </p>
          <ul className="mx-auto mt-6 max-w-lg space-y-2 text-left">
            {compatibility.checks.map((item) => (
              <li
                key={item.key}
                className="flex items-start gap-2 rounded-lg border border-border bg-background/45 px-3 py-2.5 text-xs leading-5 text-muted-foreground"
              >
                {item.status === "pass" ? (
                  <CircleCheck
                    className="mt-0.5 size-3.5 shrink-0 text-emerald-300"
                    aria-hidden="true"
                  />
                ) : (
                  <CircleAlert
                    className="mt-0.5 size-3.5 shrink-0 text-amber-300"
                    aria-hidden="true"
                  />
                )}
                <span>
                  <strong className="font-semibold text-foreground">
                    {item.label}:
                  </strong>{" "}
                  {item.detail}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={`/agents/${profile.chainId}/${profile.agentId}?tab=services`}
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Review published services
              <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href={`/discover?${alternativeParams.toString()}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
              )}
            >
              Find other ERC-8183 agents
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
