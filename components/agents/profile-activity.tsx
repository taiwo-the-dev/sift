import { BadgeCheck, Blocks, Database, ExternalLink } from "lucide-react";

import { ProfileSection } from "@/components/agents/profile-section";
import { formatProfileTimestamp } from "@/features/agents/format";
import { buildExplorerBlockHref } from "@/features/agents/links";
import type { AgentProfile } from "@/features/agents/model";
import { formatChainName } from "@/features/discovery/format";

interface ProfileActivityProps {
  profile: AgentProfile;
}

export function ProfileActivity({ profile }: ProfileActivityProps) {
  const blockHref = buildExplorerBlockHref(
    profile.chainId,
    profile.registeredBlock,
  );

  return (
    <ProfileSection
      id="activity"
      eyebrow="04 · Activity"
      title="Registration history"
      description="Registration and index history. This is separate from agent execution activity."
    >
      <ol className="relative ml-4 border-l border-border">
        <li className="relative pb-8 pl-8">
          <span className="absolute -left-4 top-0 grid size-8 place-items-center rounded-full border border-brand/30 bg-background text-brand">
            <Blocks className="size-3.5" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-foreground">
            Agent registered with ERC-8004
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {formatProfileTimestamp(profile.registeredAt)} on{" "}
            {formatChainName(profile.chainId)}
          </p>
          {blockHref && profile.registeredBlock !== null ? (
            <a
              href={blockHref}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-2 inline-flex items-center gap-1.5 rounded-sm text-xs font-semibold text-brand outline-none hover:text-brand-hover focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              View block {profile.registeredBlock}
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          ) : profile.registeredBlock !== null ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Block {profile.registeredBlock}
            </p>
          ) : null}
        </li>

        {profile.metadataVerifiedAt ? (
          <li className="relative pb-8 pl-8">
            <span className="absolute -left-4 top-0 grid size-8 place-items-center rounded-full border border-emerald-400/25 bg-background text-emerald-300">
              <BadgeCheck className="size-3.5" aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-foreground">
              Profile verified
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {formatProfileTimestamp(profile.metadataVerifiedAt)} · Sift profile check
            </p>
          </li>
        ) : null}

        <li className="relative pl-8">
          <span className="absolute -left-4 top-0 grid size-8 place-items-center rounded-full border border-border bg-background text-muted-foreground">
            <Database className="size-3.5" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-foreground">
            Agent record updated
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {formatProfileTimestamp(profile.lastSyncedAt)} · Sift update
          </p>
        </li>
      </ol>
    </ProfileSection>
  );
}
