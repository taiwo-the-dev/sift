import { Activity, MessageSquareText, ShieldQuestion } from "lucide-react";

import { ProfileSection } from "@/components/agents/profile-section";
import { CategoryEvidencePanel } from "@/components/categories/category-evidence";
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
      eyebrow="03 · Trust"
      title="Health and reputation"
      description="See the agent's health checks, reputation, and Sift Score."
    >
      <CategoryEvidencePanel profile={profile} />

      <div className="mt-4">
      <ScoreExplanation profile={profile} score={profile.score} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {profile.health ? (
          <article className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <span className="grid size-10 place-items-center rounded-lg border border-sky-400/20 bg-sky-400/8 text-sky-200">
                <Activity className="size-4" aria-hidden="true" />
              </span>
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold capitalize text-foreground">
                {isHealthStale(profile.health) ? "Out of date" : "Checked"}{" "}
                {profile.health.status}
              </span>
            </div>
            <h3 className="mt-5 text-lg font-semibold text-foreground">
              Latest health check
            </h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              A point-in-time check, not a guarantee of current availability.
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
                <dt className="text-muted-foreground">Service checks</dt>
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
            title="Health check not available"
            description="Sift has not checked this agent's service yet."
          />
        )}

        {profile.reputation ? (
          <article className="rounded-xl border border-border bg-[linear-gradient(145deg,rgba(240,185,11,0.07),transparent_55%)] p-5 sm:p-6">
            <span className="grid size-10 place-items-center rounded-lg border border-brand/20 bg-brand/8 text-brand">
              <MessageSquareText className="size-4" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-foreground">
              Reputation data
            </h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Reputation contributes to Sift Score only when its source and
              update time meet the scoring requirements.
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
                <dt className="text-muted-foreground">Successful tasks</dt>
                <dd className="font-medium text-foreground">
                  {formatIdentifierCount(profile.reputation.successfulJobs)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Failed tasks</dt>
                <dd className="font-medium text-foreground">
                  {formatIdentifierCount(profile.reputation.failedJobs)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Source checked</dt>
                <dd className="text-right font-medium text-foreground">
                  {formatProfileTimestamp(
                    profile.reputation.sourceObservedAt,
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Last updated</dt>
                <dd className="text-right font-medium text-foreground">
                  {formatProfileTimestamp(profile.reputation.updatedAt)}
                </dd>
              </div>
            </dl>
          </article>
        ) : (
          <EvidenceUnavailable
            title="Reputation not available"
            description="No reputation or feedback data has been recorded for this agent."
          />
        )}
      </div>
    </ProfileSection>
  );
}
