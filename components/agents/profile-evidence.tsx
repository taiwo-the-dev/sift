import { Activity, MessageSquareText, ShieldQuestion } from "lucide-react";

import { ProfileSection } from "@/components/agents/profile-section";
import { ScoreExplanation } from "@/components/scoring/score-explanation";
import {
  formatIdentifierCount,
  formatProfileTimestamp,
  formatResponseTime,
} from "@/features/agents/format";
import type { AgentProfile } from "@/features/agents/model";
import {
  describeHealthOutcome,
  isHealthStale,
} from "@/features/health/presentation";

interface ProfileEvidenceProps {
  profile: AgentProfile;
}

function EvidenceUnavailable({
  description,
  title,
}: Readonly<{ description: string; title: string }>) {
  return (
    <div className="border-l-2 border-border bg-card px-5 py-6 sm:px-6">
      <ShieldQuestion className="size-5 text-muted-foreground" aria-hidden="true" />
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function ProfileEvidence({ profile }: ProfileEvidenceProps) {
  return (
    <ProfileSection
      id="evidence"
      eyebrow="03 · Evidence"
      title="What Sift can independently show"
      description="Persisted observations appear only when a verifiable source has supplied them. Missing evidence is never replaced with estimates."
    >
      <ScoreExplanation score={profile.score} />

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {profile.health ? (
          <article className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <span className="grid size-10 place-items-center rounded-lg border border-sky-400/20 bg-sky-400/8 text-sky-200">
                <Activity className="size-4" aria-hidden="true" />
              </span>
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold capitalize text-foreground">
                {isHealthStale(profile.health) ? "Stale" : "Observed"}{" "}
                {profile.health.status}
              </span>
            </div>
            <h3 className="mt-5 text-lg font-semibold text-foreground">
              Latest persisted health observation
            </h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              This is a timestamped observation, not a guarantee of current
              availability.
            </p>
            <dl className="mt-5 grid gap-3 border-t border-border pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Latest outcome</dt>
                <dd className="max-w-56 text-right font-medium text-foreground">
                  {describeHealthOutcome(profile.health.outcome)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Response time</dt>
                <dd className="font-medium text-foreground">
                  {formatResponseTime(profile.health.responseTimeMs)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Observed checks</dt>
                <dd className="font-medium text-foreground">
                  {formatIdentifierCount(profile.health.successCount)} successful
                  of {formatIdentifierCount(profile.health.checkCount)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  Consecutive failures
                </dt>
                <dd className="font-medium text-foreground">
                  {formatIdentifierCount(profile.health.failureCount)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Checked</dt>
                <dd className="text-right font-medium text-foreground">
                  {formatProfileTimestamp(profile.health.lastCheckedAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Last success</dt>
                <dd className="text-right font-medium text-foreground">
                  {formatProfileTimestamp(profile.health.lastSuccessAt)}
                </dd>
              </div>
            </dl>
          </article>
        ) : (
          <EvidenceUnavailable
            title="Health evidence not available"
            description="Sift has no persisted endpoint-health observation for this agent yet, so no online or reliability claim is shown."
          />
        )}

        {profile.reputation ? (
          <article className="rounded-xl border border-border bg-[linear-gradient(145deg,rgba(240,185,11,0.07),transparent_55%)] p-5 sm:p-6">
            <span className="grid size-10 place-items-center rounded-lg border border-brand/20 bg-brand/8 text-brand">
              <MessageSquareText className="size-4" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-foreground">
              Persisted reputation evidence
            </h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Values are displayed as stored and enter the versioned Sift Score
              only when explicit source, range, and freshness requirements are
              satisfied.
            </p>
            <dl className="mt-5 grid gap-3 border-t border-border pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Source</dt>
                <dd className="max-w-56 text-right font-medium text-foreground">
                  {profile.reputation.source ?? "Not available"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Reputation score</dt>
                <dd className="font-medium text-foreground">
                  {profile.reputation.reputationScore ?? "Not available"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Feedback records</dt>
                <dd className="font-medium text-foreground">
                  {formatIdentifierCount(profile.reputation.feedbackCount)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Successful jobs</dt>
                <dd className="font-medium text-foreground">
                  {formatIdentifierCount(profile.reputation.successfulJobs)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Failed jobs</dt>
                <dd className="font-medium text-foreground">
                  {formatIdentifierCount(profile.reputation.failedJobs)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Source observed</dt>
                <dd className="text-right font-medium text-foreground">
                  {formatProfileTimestamp(
                    profile.reputation.sourceObservedAt,
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Evidence updated</dt>
                <dd className="text-right font-medium text-foreground">
                  {formatProfileTimestamp(profile.reputation.updatedAt)}
                </dd>
              </div>
            </dl>
          </article>
        ) : (
          <EvidenceUnavailable
            title="Reputation evidence not available"
            description="No persisted reputation, feedback, or job evidence is available for this identity. Sift does not infer a rating."
          />
        )}
      </div>
    </ProfileSection>
  );
}
