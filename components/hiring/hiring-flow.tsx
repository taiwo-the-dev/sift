"use client";

import { ArrowLeft, BadgeCheck, CircleAlert, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { z } from "zod";

import { AgentAvatar } from "@/components/discovery/agent-avatar";
import { ConfirmationStep } from "@/components/hiring/confirmation-step";
import { HiringStepper } from "@/components/hiring/hiring-stepper";
import { MissionStep } from "@/components/hiring/mission-step";
import { PermissionsStep } from "@/components/hiring/permissions-step";
import { ReviewStep } from "@/components/hiring/review-step";
import { WalletStep } from "@/components/hiring/wallet-step";
import {
  createRemoteHiringIntent,
  loadRemoteHiringIntent,
  requestHiringQuote,
} from "@/features/hiring/client-api";
import {
  assertActivationBinding,
  quoteRequiresRefreshForWallet,
} from "@/features/hiring/binding";
import {
  clearHiringResume,
  clearHiringDraft,
  hiringDraftStorageKey,
  hiringResumeStorageKey,
  readHiringDraft,
  readHiringResume,
  writeHiringDraft,
  writeHiringResume,
  type SavedHiringResume,
} from "@/features/hiring/client-storage";
import { createHiringResumeToken } from "@/features/hiring/idempotency";
import type {
  HiringAgentSummary,
  HiringFlowStep,
  HiringIntentSnapshot,
  HiringMissionInput,
  HiringQuote,
} from "@/features/hiring/model";
import { HIRING_CHAIN_ID } from "@/features/hiring/protocol";
import { parseHiringMission } from "@/features/hiring/validation";

const initialMission: HiringMissionInput = {
  deliverables: "",
  durationSeconds: 86_400,
  maxSpend: "1",
  mission: "",
  qualityStandards: "",
};

export function HiringFlow({ agent }: Readonly<{ agent: HiringAgentSummary }>) {
  const account = useAccount();
  const switchChain = useSwitchChain();
  const [step, setStep] = useState<HiringFlowStep>("mission");
  const [mission, setMission] = useState<HiringMissionInput>(initialMission);
  const [quote, setQuote] = useState<HiringQuote | null>(null);
  const [quoteWallet, setQuoteWallet] = useState<string | null>(null);
  const [intent, setIntent] = useState<HiringIntentSnapshot | null>(null);
  const [resume, setResume] = useState<SavedHiringResume | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);
  const storageKey = hiringResumeStorageKey(agent.chainId, agent.agentId);
  const draftKey = hiringDraftStorageKey(agent.chainId, agent.agentId);

  useEffect(() => {
    let active = true;
    const draft = readHiringDraft(draftKey);
    const saved = readHiringResume(storageKey);

    if (draft) {
      queueMicrotask(() => {
        if (!active) return;
        setMission(draft.mission);
        setRecoveryNotice("Your saved task was restored on this device. No quote, signature, approval, or wallet session was reused.");
      });
    }

    if (!saved) {
      queueMicrotask(() => {
        if (active) setRestoring(false);
      });
      return () => {
        active = false;
      };
    }

    loadRemoteHiringIntent(saved.id, saved.resumeToken)
      .then((snapshot) => {
        if (!active) return;
        setResume(saved);
        setIntent(snapshot);
        setMission({
          deliverables: snapshot.deliverables,
          durationSeconds: snapshot.durationSeconds,
          maxSpend: snapshot.maxSpend,
          mission: snapshot.mission,
          qualityStandards: snapshot.qualityStandards,
        });
        setStep(snapshot.status === "confirmed" ? "confirmation" : "wallet");
      })
      .catch(() => {
        if (!active) return;
        clearHiringResume(storageKey);
      })
      .finally(() => {
        if (active) setRestoring(false);
      });

    return () => {
      active = false;
    };
  }, [draftKey, storageKey]);

  useEffect(() => {
    if (!restoring) {
      writeHiringDraft(draftKey, mission);
    }
  }, [draftKey, mission, restoring]);

  async function negotiate(): Promise<void> {
    setPending(true);
    setError(null);
    setRecoveryNotice(null);

    try {
      const normalized = parseHiringMission(mission);
      const nextQuote = await requestHiringQuote(
        { agentId: agent.agentId, chainId: agent.chainId },
        normalized,
      );
      setMission(normalized);
      setQuote(nextQuote);
      setQuoteWallet(account.address?.toLowerCase() ?? null);
      setStep("permissions");
    } catch (caught) {
      setError(
        caught instanceof z.ZodError
          ? caught.issues[0]?.message ?? "Review the task fields."
          : caught instanceof Error
            ? caught.message
            : "Sift could not request a signed quote.",
      );
    } finally {
      setPending(false);
    }
  }

  async function createIntent(): Promise<void> {
    const connectedWallet = account.address?.toLowerCase() ?? null;

    if (quote && quoteRequiresRefreshForWallet(quoteWallet, connectedWallet)) {
      setQuote(null);
      setQuoteWallet(null);
      setStep("mission");
      setRecoveryNotice("Your wallet changed. Your task was kept, but the previous quote was cleared so the new wallet starts from a fresh review.");
      return;
    }

    if (!quote || !account.address || account.chainId !== HIRING_CHAIN_ID) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      assertActivationBinding({
        agent,
        mission,
        quote,
        walletAddress: account.address,
      });
      const saved: SavedHiringResume = {
        id: "",
        idempotencyKey: crypto.randomUUID(),
        resumeToken: createHiringResumeToken(),
      };
      const snapshot = await createRemoteHiringIntent({
        agentId: agent.agentId,
        chainId: agent.chainId,
        deliverables: mission.deliverables,
        durationSeconds: mission.durationSeconds,
        idempotencyKey: saved.idempotencyKey,
        maxSpend: mission.maxSpend,
        mission: mission.mission,
        qualityStandards: mission.qualityStandards,
        quote,
        resumeToken: saved.resumeToken,
        walletAddress: account.address,
      });
      const completeResume = { ...saved, id: snapshot.id };
      writeHiringResume(storageKey, completeResume);
      setResume(completeResume);
      setIntent(snapshot);
      setStep("wallet");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Sift could not save the hiring request.",
      );
    } finally {
      setPending(false);
    }
  }

  function updateIntent(snapshot: HiringIntentSnapshot): void {
    setIntent(snapshot);
    if (snapshot.status === "confirmed") {
      clearHiringDraft(draftKey);
      setStep("confirmation");
    }
  }

  function restartHiringFlow(): void {
    clearHiringResume(storageKey);
    setIntent(null);
    setResume(null);
    setQuote(null);
    setQuoteWallet(null);
    setError(null);
    setRecoveryNotice("Your task was kept. Request a fresh signed quote before continuing with the connected wallet.");
    setStep("mission");
  }

  if (restoring) {
    return (
      <div className="grid min-h-[28rem] place-items-center rounded-2xl border border-border bg-card p-8">
        <div className="text-center">
          <LoaderCircle className="mx-auto size-6 animate-spin text-brand" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">Checking for a saved hiring session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
      <aside className="rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
        <Link
          href={agent.profileHref}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Agent profile
        </Link>
        <Link
          href="/discover?network=bsc-testnet&q=ERC-8183&metadata=valid"
          className="ml-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Replace agent
        </Link>
        <div className="mt-6 flex items-center gap-3">
          <AgentAvatar
            agentId={agent.agentId}
            imageUrl={agent.imageUrl}
            name={agent.name}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{agent.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">ERC-8004 #{agent.agentId}</p>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/7 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
            <BadgeCheck className="size-3.5" aria-hidden="true" />
            Compatible service found
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            Registration and endpoint checks passed. The provider signature,
            contracts, and quote are checked before wallet approval.
          </p>
        </div>
        <div className="mt-5 flex items-start gap-2 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-300" aria-hidden="true" />
          BSC Testnet only. Test tokens have no monetary value.
        </div>
      </aside>

      <div className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-7 lg:p-8">
        <HiringStepper current={step} />
        <div className="mt-8 border-t border-border pt-7">
          {step === "mission" ? (
            <MissionStep
              error={error}
              mission={mission}
              notice={recoveryNotice}
              onChange={setMission}
              onSubmit={negotiate}
              pending={pending}
            />
          ) : null}

          {step === "permissions" && quote ? (
            <PermissionsStep
              agent={agent}
              mission={mission}
              onBack={() => {
                setError(null);
                setStep("mission");
              }}
              onContinue={() => setStep("review")}
              quote={quote}
            />
          ) : null}

          {step === "review" && quote ? (
            <ReviewStep
              address={account.address}
              agent={agent}
              chainId={account.chainId}
              error={error}
              mission={mission}
              onBack={() => {
                setError(null);
                setStep("permissions");
              }}
              onContinue={createIntent}
              onSwitchNetwork={() => switchChain.switchChain({ chainId: HIRING_CHAIN_ID })}
              pending={pending}
              quote={quote}
              switching={switchChain.isPending}
            />
          ) : null}

          {step === "wallet" && intent && resume ? (
            <WalletStep
              agent={agent}
              intent={intent}
              onIntentChange={updateIntent}
              onRestart={restartHiringFlow}
              resume={resume}
            />
          ) : null}

          {step === "confirmation" && intent ? (
            <ConfirmationStep agent={agent} intent={intent} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
