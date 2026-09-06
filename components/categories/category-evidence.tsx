import { BadgeCheck, Clock3, ExternalLink, ScanSearch, Tags } from "lucide-react";

import {
  formatAddress,
  formatIdentifierCount,
  formatProfileTimestamp,
} from "@/features/agents/format";
import type { AgentProfile } from "@/features/agents/model";
import { formatCategory } from "@/features/discovery/format";

export function CategoryEvidencePanel({ profile }: Readonly<{ profile: AgentProfile }>) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
      <article className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg border border-brand/20 bg-brand/8 text-brand">
            <Tags className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Why this category?</h3>
            <p className="text-xs text-muted-foreground">Based on the agent’s profile</p>
          </div>
        </div>

        {profile.categoryEvidence.length > 0 ? (
          <div className="mt-5 grid gap-4">
            {profile.categoryEvidence.map((evidence) => (
              <section key={evidence.category} className="border-t border-border pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{formatCategory(evidence.category)}</span>
                  <span className="rounded-full border border-brand/20 bg-brand/8 px-2 py-0.5 text-[0.68rem] font-semibold text-brand">
                    {evidence.source === "declared-metadata" ? "Listed by agent" : "Suggested by Sift"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(evidence.confidence * 100)}% match confidence
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Matched words: {evidence.matchedTerms.join(", ")} · checked {formatProfileTimestamp(evidence.observedAt)}
                </p>
                {evidence.facts.length > 0 ? (
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                    {evidence.facts.map((fact) => (
                      <div key={`${fact.key}:${fact.value}`} className="rounded-lg border border-border bg-background/60 px-3 py-2.5">
                        <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{fact.label}</dt>
                        <dd className="mt-1 text-sm font-medium text-foreground">{fact.value}</dd>
                        <p className="mt-1 truncate text-[0.65rem] text-muted-foreground" title={fact.sourceField}>{fact.sourceField}</p>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">No additional category details are available.</p>
                )}
              </section>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            No supported category is listed for this agent.
          </p>
        )}
      </article>

      <article className="rounded-xl border border-border bg-[linear-gradient(145deg,rgba(240,185,11,0.07),transparent_60%)] p-5 sm:p-6">
        <span className="grid size-10 place-items-center rounded-lg border border-sky-400/20 bg-sky-400/8 text-sky-200">
          <ScanSearch className="size-4" aria-hidden="true" />
        </span>
        <h3 className="mt-5 text-lg font-semibold text-foreground">8004scan comparison</h3>
        {profile.externalEvidence ? (
          <div className="mt-3 text-sm leading-6 text-muted-foreground">
            <p className="flex items-center gap-2 font-semibold capitalize text-foreground">
              {profile.externalEvidence.availability === "available" ? <BadgeCheck className="size-4 text-emerald-300" aria-hidden="true" /> : null}
              {profile.externalEvidence.availability.replaceAll("-", " ")}
            </p>
            <p className="mt-2">Compares the agent ID, owner, network, capabilities, and reputation with 8004scan.</p>
            <dl className="mt-4 grid gap-2 border-t border-border pt-3 text-xs">
              <div className="flex justify-between gap-3">
                <dt>Agent</dt>
                <dd className="font-medium text-foreground">
                  {profile.externalEvidence.identity
                    ? `${profile.externalEvidence.identity.chainId}:${profile.externalEvidence.identity.agentId}`
                    : "Not available"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Owner</dt>
                <dd className="font-medium text-foreground">{formatAddress(profile.externalEvidence.ownerAddress)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Network</dt>
                <dd className="font-medium capitalize text-foreground">{profile.externalEvidence.network ?? "Not available"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Feedback records</dt>
                <dd className="font-medium text-foreground">{formatIdentifierCount(profile.externalEvidence.feedbackCount)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Validations</dt>
                <dd className="font-medium text-foreground">{formatIdentifierCount(profile.externalEvidence.validationCount)}</dd>
              </div>
            </dl>
            {profile.externalEvidence.feedbackCount === 0 ? (
              <p className="mt-3 text-xs">No feedback records were reported. This does not imply a positive reputation.</p>
            ) : null}
            {profile.externalEvidence.conflictFields.length > 0 ? (
              <p className="mt-3 text-xs text-amber-200">Conflicting fields: {profile.externalEvidence.conflictFields.join(", ")}</p>
            ) : null}
            <p className="mt-3 flex items-center gap-2 text-xs"><Clock3 className="size-3.5" aria-hidden="true" />Checked {formatProfileTimestamp(profile.externalEvidence.observedAt)}</p>
            <a href={profile.externalEvidence.sourceReference} target="_blank" rel="noreferrer noopener" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline">
              View source <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            No 8004scan comparison is available for this agent.
          </p>
        )}
      </article>
    </div>
  );
}
