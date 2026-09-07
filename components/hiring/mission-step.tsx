"use client";

import { ArrowRight, LoaderCircle, ShieldAlert } from "lucide-react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import type { HiringMissionInput } from "@/features/hiring/model";
import {
  getErc8183Deployment,
  type HiringChainId,
} from "@/features/hiring/protocol";
import { hiringDurations } from "@/features/hiring/validation";
import { formatDuration } from "@/features/hiring/review";

interface MissionStepProps {
  chainId: HiringChainId;
  error: string | null;
  mission: HiringMissionInput;
  notice?: string | null;
  onChange: (mission: HiringMissionInput) => void;
  onSubmit: () => void;
  pending: boolean;
}

const fieldClassName =
  "mt-2 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/65 focus:border-brand focus:ring-3 focus:ring-brand/10";

export function MissionStep({
  chainId,
  error,
  mission,
  notice,
  onChange,
  onSubmit,
  pending,
}: MissionStepProps) {
  const deployment = getErc8183Deployment(chainId);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          Step 1 · Define task
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          What should this agent deliver?
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          These terms are sent to the agent for a signed quote and recorded in
          the public ERC-8183 job description.
        </p>
      </div>

      <label className="block text-sm font-semibold text-foreground">
        Task description
        <textarea
          className={`${fieldClassName} min-h-32 resize-y`}
          maxLength={1_500}
          minLength={20}
          name="mission"
          onChange={(event) => onChange({ ...mission, mission: event.target.value })}
          placeholder="Monitor this public BNB Chain position and report material liquidation risk."
          required
          value={mission.mission}
        />
        <span className="mt-1.5 block text-xs font-normal text-muted-foreground">
          {mission.mission.length}/1,500 characters
        </span>
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block text-sm font-semibold text-foreground">
          Required deliverable
          <textarea
            className={`${fieldClassName} min-h-28 resize-y`}
            maxLength={700}
            minLength={10}
            onChange={(event) =>
              onChange({ ...mission, deliverables: event.target.value })
            }
            placeholder="A concise report with the observed health factor and risk flags."
            required
            value={mission.deliverables}
          />
        </label>
        <label className="block text-sm font-semibold text-foreground">
          Quality standard
          <textarea
            className={`${fieldClassName} min-h-28 resize-y`}
            maxLength={700}
            minLength={10}
            onChange={(event) =>
              onChange({ ...mission, qualityStandards: event.target.value })
            }
            placeholder="Use public blockchain data and clearly mark anything that cannot be verified."
            required
            value={mission.qualityStandards}
          />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block text-sm font-semibold text-foreground">
          Maximum spend ({deployment.tokenSymbol})
          <input
            className={fieldClassName}
            inputMode="decimal"
            onChange={(event) => onChange({ ...mission, maxSpend: event.target.value })}
            placeholder="1"
            required
            value={mission.maxSpend}
          />
          <span className="mt-1.5 block text-xs font-normal text-muted-foreground">
            The signed agent quote must be at or below this cap.
            {deployment.isMainnet ? " Mainnet tokens can have real value." : " Testnet tokens have no monetary value."}
          </span>
        </label>
        <label className="block text-sm font-semibold text-foreground">
          Execution expiry
          <select
            className={fieldClassName}
            onChange={(event) =>
              onChange({ ...mission, durationSeconds: Number(event.target.value) })
            }
            value={mission.durationSeconds}
          >
            {hiringDurations.map((duration) => (
              <option key={duration} value={duration}>
                {formatDuration(duration)}
              </option>
            ))}
          </select>
          <span className="mt-1.5 block text-xs font-normal text-muted-foreground">
            Escrow becomes refundable after this deadline.
          </span>
        </label>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/7 px-4 py-3 text-xs leading-5 text-amber-100">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Do not put private keys, credentials, personal data, or confidential
        instructions in the task description. The signed terms become public
        blockchain data.
      </div>

      {notice ? (
        <p aria-live="polite" className="rounded-xl border border-sky-400/20 bg-sky-400/7 px-4 py-3 text-sm leading-6 text-sky-100">
          {notice}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending} className="min-w-48">
          {pending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Requesting quote
            </>
          ) : (
            <>
              Request signed quote
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
