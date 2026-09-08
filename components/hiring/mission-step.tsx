"use client";

import {
  ArrowRight,
  CircleDollarSign,
  ClipboardPenLine,
  Clock3,
  FileCheck2,
  LoaderCircle,
  ShieldAlert,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import type { HiringMissionInput } from "@/features/hiring/model";
import {
  getErc8183Deployment,
  type HiringChainId,
} from "@/features/hiring/protocol";
import { formatDuration } from "@/features/hiring/review";
import { hiringDurations } from "@/features/hiring/validation";
import { cn } from "@/lib/utils";

interface MissionStepProps {
  chainId: HiringChainId;
  error: string | null;
  mission: HiringMissionInput;
  notice?: string | null;
  onChange: (mission: HiringMissionInput) => void;
  onSubmit: () => void;
  pending: boolean;
}

interface FormSectionProps {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}

const fieldClassName =
  "mt-2 w-full rounded-xl border border-input bg-background/80 px-4 py-3 text-sm text-foreground outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/60 hover:border-muted-foreground/55 focus:border-brand focus:bg-background focus:ring-3 focus:ring-brand/10";

const durationOptions = hiringDurations.map((duration) => ({
  label: formatDuration(duration),
  value: duration,
}));

function FormSection({
  children,
  description,
  icon,
  title,
}: FormSectionProps) {
  return (
    <fieldset className="rounded-2xl border border-border bg-background/30 p-4 sm:p-5">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-start gap-3 border-b border-border pb-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-brand/20 bg-brand/8 text-brand">
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </fieldset>
  );
}

function CharacterCount({
  current,
  maximum,
}: Readonly<{ current: number; maximum: number }>) {
  return (
    <span className="font-mono text-[0.68rem] text-muted-foreground/75">
      {current.toLocaleString("en")}/{maximum.toLocaleString("en")}
    </span>
  );
}

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
    <form onSubmit={submit} className="space-y-7">
      <div className="border-b border-border pb-6">
        <p className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/8 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-brand">
          <span className="grid size-4 place-items-center rounded-full bg-brand text-[0.58rem] text-brand-foreground">
            1
          </span>
          Define task
        </p>
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
          What should this agent deliver?
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Give the agent enough detail to prepare a signed quote. These terms
          will become part of the public ERC-8183 job description.
        </p>
      </div>

      <FormSection
        title="Task scope"
        description="Describe the job, relevant protocol or position, and the outcome you need."
        icon={<ClipboardPenLine className="size-4" aria-hidden="true" />}
      >
        <label
          htmlFor="hiring-task-description"
          className="text-sm font-semibold text-foreground"
        >
          Task description
        </label>
        <textarea
          id="hiring-task-description"
          className={`${fieldClassName} min-h-36 resize-y leading-6`}
          maxLength={1_500}
          minLength={20}
          name="mission"
          onChange={(event) =>
            onChange({ ...mission, mission: event.target.value })
          }
          placeholder="Monitor this public BNB Chain position and report material liquidation risk."
          required
          value={mission.mission}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            Include only information that can be made public.
          </span>
          <CharacterCount current={mission.mission.length} maximum={1_500} />
        </div>
      </FormSection>

      <FormSection
        title="Delivery expectations"
        description="Define the output you expect and how the finished work should be evaluated."
        icon={<FileCheck2 className="size-4" aria-hidden="true" />}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="hiring-deliverable"
              className="text-sm font-semibold text-foreground"
            >
              Required deliverable
            </label>
            <textarea
              id="hiring-deliverable"
              className={`${fieldClassName} min-h-32 resize-y leading-6`}
              maxLength={700}
              minLength={10}
              name="deliverables"
              onChange={(event) =>
                onChange({ ...mission, deliverables: event.target.value })
              }
              placeholder="A concise report with the observed health factor and risk flags."
              required
              value={mission.deliverables}
            />
            <div className="mt-2 flex justify-end">
              <CharacterCount
                current={mission.deliverables.length}
                maximum={700}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="hiring-quality-standard"
              className="text-sm font-semibold text-foreground"
            >
              Quality standard
            </label>
            <textarea
              id="hiring-quality-standard"
              className={`${fieldClassName} min-h-32 resize-y leading-6`}
              maxLength={700}
              minLength={10}
              name="qualityStandards"
              onChange={(event) =>
                onChange({ ...mission, qualityStandards: event.target.value })
              }
              placeholder="Use public blockchain data and clearly mark anything that cannot be verified."
              required
              value={mission.qualityStandards}
            />
            <div className="mt-2 flex justify-end">
              <CharacterCount
                current={mission.qualityStandards.length}
                maximum={700}
              />
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Budget and deadline"
        description="Set the most you will pay and when unfinished work becomes refundable."
        icon={<CircleDollarSign className="size-4" aria-hidden="true" />}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="hiring-maximum-spend"
              className="text-sm font-semibold text-foreground"
            >
              Maximum spend
            </label>
            <div className="relative mt-2">
              <input
                id="hiring-maximum-spend"
                className={cn(fieldClassName, "mt-0 h-12 pr-20 font-mono")}
                inputMode="decimal"
                name="maxSpend"
                onChange={(event) =>
                  onChange({ ...mission, maxSpend: event.target.value })
                }
                placeholder="1"
                required
                value={mission.maxSpend}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <span className="rounded-md border border-border bg-card px-2 py-1 font-mono text-[0.68rem] font-semibold text-foreground">
                  {deployment.tokenSymbol}
                </span>
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              The signed quote must stay at or below this amount.
              {deployment.isMainnet
                ? " Mainnet tokens can have real value."
                : " Testnet tokens have no monetary value."}
            </p>
          </div>

          <div>
            <label
              id="hiring-expiry-label"
              className="text-sm font-semibold text-foreground"
            >
              Execution expiry
            </label>
            <SelectField
              aria-describedby="hiring-expiry-description"
              aria-labelledby="hiring-expiry-label"
              icon={Clock3}
              options={durationOptions}
              value={mission.durationSeconds}
              onValueChange={(durationSeconds) => {
                onChange({ ...mission, durationSeconds });
              }}
              triggerClassName="mt-2"
            />
            <p
              id="hiring-expiry-description"
              className="mt-2 text-xs leading-5 text-muted-foreground"
            >
              If the job is unfinished, escrow becomes refundable after this
              deadline.
            </p>
          </div>
        </div>
      </FormSection>

      <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/7 px-4 py-3 text-xs leading-5 text-amber-100">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          <strong className="font-semibold">Public job details.</strong> Do not
          include private keys, credentials, personal data, or confidential
          instructions. The signed terms become public blockchain data.
        </p>
      </div>

      {notice ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-sky-400/20 bg-sky-400/7 px-4 py-3 text-sm leading-6 text-sky-100"
        >
          {notice}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm leading-6 text-red-200"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-xs leading-5 text-muted-foreground">
          Nothing is paid at this step. You will review the signed quote before
          approving any wallet action.
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="min-w-48"
        >
          {pending ? (
            <>
              <LoaderCircle
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
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
