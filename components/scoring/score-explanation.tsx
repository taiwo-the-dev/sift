import { CircleHelp, Gauge, History } from "lucide-react";

import { formatProfileTimestamp } from "@/features/agents/format";
import type { PersistedSiftScore } from "@/features/scoring/model";
import {
  describeScoreConfidence,
  formatScoreConfidence,
  isScoreStale,
  scoreComponentRows,
} from "@/features/scoring/presentation";

interface ScoreExplanationProps {
  score: PersistedSiftScore | null;
}

export function ScoreExplanation({ score }: ScoreExplanationProps) {
  if (!score) {
    return (
      <article className="rounded-xl border border-dashed border-border bg-card px-5 py-7 sm:px-6">
        <CircleHelp className="size-5 text-muted-foreground" aria-hidden="true" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          Sift Score not calculated yet
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          No persisted M6 assessment exists for this identity. Sift does not
          substitute a placeholder rating.
        </p>
      </article>
    );
  }

  const rows = scoreComponentRows(score);
  const missingRows = rows.filter((row) => row.value === null);
  const stale = isScoreStale(score.calculatedAt);

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid gap-6 bg-[radial-gradient(circle_at_90%_0%,rgba(240,185,11,0.14),transparent_22rem)] p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-6">
        <span className="grid size-12 place-items-center rounded-xl border border-brand/25 bg-brand/8 text-brand">
          <Gauge className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Sift Score · {score.version}
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
              {score.score === null ? "Not enough evidence" : `${score.score}/100`}
            </p>
            <span className="text-sm font-medium text-brand">
              {describeScoreConfidence(score.confidence)}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {formatScoreConfidence(score.confidence)}. Missing signals lower
            confidence instead of becoming assumed values.
          </p>
        </div>
        <div className="text-xs text-muted-foreground sm:text-right">
          <p className="inline-flex items-center gap-1.5 sm:justify-end">
            <History className="size-3.5" aria-hidden="true" />
            {stale ? "Stale assessment" : "Current assessment"}
          </p>
          <p className="mt-1">{formatProfileTimestamp(score.calculatedAt)}</p>
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
                      ? "Unavailable"
                      : `${row.value}/100 · ${row.weight}% weight`}
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
              Evidence freshness
            </p>
            <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              <div>
                <dt>Health observed</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {formatProfileTimestamp(score.sourceFreshness.healthAt)}
                </dd>
              </div>
              <div>
                <dt>Metadata verified</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {formatProfileTimestamp(score.sourceFreshness.metadataAt)}
                </dd>
              </div>
              <div>
                <dt>Reputation observed</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {formatProfileTimestamp(score.sourceFreshness.reputationAt)}
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
                  } not included because current supported evidence is unavailable or stale.`
                : "All versioned formula components have supported current inputs."}
              {" "}A Sift Score is decision support—not proof that an agent is
              safe, suitable, or best for every task.
            </p>
          </div>
        </div>
      </details>
    </article>
  );
}
