import { CircleHelp, Gauge, History } from "lucide-react";

import { AnimatedRatingValue } from "@/components/scoring/animated-rating-value";
import { ScoreCriteriaTooltip } from "@/components/scoring/score-criteria-tooltip";
import { formatProfileTimestamp } from "@/features/agents/format";
import type { AgentProfile } from "@/features/agents/model";
import { SIFT_SCORE_VERSION } from "@/features/scoring/formula";
import type { PersistedSiftScore } from "@/features/scoring/model";
import {
  describeScoreConfidence,
  getAgentRating,
  isScoreStale,
  scoreComponentRowsFromComponents,
} from "@/features/scoring/presentation";

interface ScoreExplanationProps {
  profile: Pick<
    AgentProfile,
    | "active"
    | "description"
    | "health"
    | "imageUrl"
    | "lastSyncedAt"
    | "metadataStatus"
    | "metadataVerifiedAt"
    | "name"
    | "ownerAddress"
    | "reputation"
    | "services"
    | "x402Supported"
  >;
  score: PersistedSiftScore | null;
}

export function ScoreExplanation({ profile, score }: ScoreExplanationProps) {
  const rating = getAgentRating({ ...profile, score });
  const rows = scoreComponentRowsFromComponents(rating.components);
  const missingRows = rows.filter((row) => row.value === null);
  const stale = score ? isScoreStale(score.calculatedAt) : false;
  const assessmentVersion = score?.version.startsWith("sift-evidence-v2.")
    ? score.version
    : SIFT_SCORE_VERSION;

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid gap-6 bg-[radial-gradient(circle_at_90%_0%,rgba(240,185,11,0.14),transparent_22rem)] p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-6">
        <span className="grid size-12 place-items-center rounded-xl border border-brand/25 bg-brand/8 text-brand">
          <Gauge className="size-5" aria-hidden="true" />
        </span>
        <div>
          <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span>{rating.label} · {assessmentVersion}</span>
            <ScoreCriteriaTooltip
              components={rating.components}
              className="text-muted-foreground"
            />
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
              <AnimatedRatingValue value={rating.value} />/100
            </p>
            <span className="text-sm font-medium text-brand">
              {rating.kind === "stale"
                ? "Update required"
                : describeScoreConfidence(rating.coverage)}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {rating.detail}. The six earned point values add directly to this
            score.
          </p>
        </div>
        <div className="text-xs text-muted-foreground sm:text-right">
          <p className="inline-flex items-center gap-1.5 sm:justify-end">
            <History className="size-3.5" aria-hidden="true" />
            {stale || rating.kind === "stale" ? "Update needed" : "Up to date"}
          </p>
          <p className="mt-1">
            {score
              ? formatProfileTimestamp(score.calculatedAt)
              : "Calculated for this view"}
          </p>
        </div>
      </div>

      <details className="group border-t border-border">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-foreground outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/30 sm:px-6">
          <span className="inline-flex items-center gap-2">
            <CircleHelp className="size-4 text-brand" aria-hidden="true" />
            Why this score?
          </span>
        </summary>
        <div className="border-t border-border px-5 py-6 sm:px-6">
          <div className="grid gap-4">
            {rows.map((row) => (
              <div key={row.key}>
                <div className="flex items-start justify-between gap-5 text-sm">
                  <div>
                    <p className="font-semibold text-foreground">{row.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {row.description}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-foreground">
                    {row.value === null
                      ? `0/${row.weight} points · no evidence`
                      : `${row.contribution}/${row.weight} points · ${row.value}% result`}
                  </span>
                </div>
                {row.value !== null ? (
                  <div
                    role="progressbar"
                    aria-label={`${row.label}: ${row.value} out of 100`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={row.value}
                    className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"
                  >
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{ width: `${row.value}%` }}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <p className="text-xs font-semibold text-foreground">
              Source updates
            </p>
            <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              <div>
                <dt>Health check</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {formatProfileTimestamp(
                    score?.sourceFreshness.healthAt ??
                      profile.health?.lastCheckedAt ??
                      null,
                  )}
                </dd>
              </div>
              <div>
                <dt>Profile verified</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {formatProfileTimestamp(
                    score?.sourceFreshness.metadataAt ??
                      profile.metadataVerifiedAt ??
                      profile.lastSyncedAt,
                  )}
                </dd>
              </div>
              <div>
                <dt>Reputation checked</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {formatProfileTimestamp(
                    score?.sourceFreshness.reputationAt ??
                      profile.reputation?.sourceObservedAt ??
                      null,
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-6 border-l-2 border-brand/50 bg-background px-4 py-3">
            <p className="text-xs font-semibold text-foreground">Limitations</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {missingRows.length > 0
                ? `${missingRows.map((row) => row.label).join(", ")} ${
                    missingRows.length === 1 ? "is" : "are"
                  } earning no points because the data is missing or outdated.`
                : "All six scoring factors have current data."}
              {" "}Evidence coverage distinguishes missing evidence from poor
              results. This score supports comparison; it does not certify agent
              safety, performance, or suitability.
            </p>
          </div>
        </div>
      </details>
    </article>
  );
}
