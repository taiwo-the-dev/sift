import { ExternalLink, Fingerprint, RadioTower } from "lucide-react";

import { CopyButton } from "@/components/agents/copy-button";
import { ProfileSection } from "@/components/agents/profile-section";
import { formatAddress, formatProfileTimestamp } from "@/features/agents/format";
import {
  buildExplorerAddressHref,
  buildExplorerBlockHref,
  normalizeExternalHref,
} from "@/features/agents/links";
import type { AgentProfile } from "@/features/agents/model";
import {
  formatChainName,
  formatMetadataStatus,
  formatServiceType,
} from "@/features/discovery/format";

interface ProfileTechnicalProps {
  profile: AgentProfile;
}

interface TechnicalFieldProps {
  copyLabel?: string;
  copyValue?: string;
  href?: string | null;
  label: string;
  value: string;
}

function TechnicalField({
  copyLabel,
  copyValue,
  href,
  label,
  value,
}: TechnicalFieldProps) {
  return (
    <div className="grid gap-2 border-b border-border py-4 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-mono text-xs leading-5 text-foreground">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex max-w-full items-center gap-1.5 rounded-sm text-brand outline-none hover:text-brand-hover focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <span className="truncate">{value}</span>
            <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
          </a>
        ) : (
          value
        )}
      </dd>
      {copyValue && copyLabel ? (
        <CopyButton value={copyValue} label={copyLabel} />
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
}

function summarizeAgentUri(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  if (value.startsWith("data:")) {
    return `Embedded registration data (${value.length.toLocaleString("en")} characters)`;
  }

  return value.length > 240 ? `${value.slice(0, 237)}…` : value;
}

export function ProfileTechnical({ profile }: ProfileTechnicalProps) {
  const ownerHref = buildExplorerAddressHref(
    profile.chainId,
    profile.ownerAddress,
  );
  const registryHref = buildExplorerAddressHref(
    profile.chainId,
    profile.registryAddress,
  );
  const blockHref = buildExplorerBlockHref(
    profile.chainId,
    profile.registeredBlock,
  );
  const agentUriHref = normalizeExternalHref(profile.agentUri);
  const copyableAgentUri =
    profile.agentUri &&
    profile.agentUri.length <= 2_048 &&
    !profile.agentUri.startsWith("data:")
      ? profile.agentUri
      : undefined;

  return (
    <ProfileSection
      id="technical"
      eyebrow="05 · Technical"
      title="Identity and source details"
      description="Raw identifiers are kept here so the main profile stays understandable while the underlying ERC-8004 provenance remains auditable."
    >
      <div className="grid gap-8">
        <div>
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            <Fingerprint className="size-4 text-brand" aria-hidden="true" />
            On-chain identity
          </h3>
          <dl className="mt-3 border-y border-border">
            <TechnicalField
              label="Network"
              value={`${formatChainName(profile.chainId)} (chain ${profile.chainId})`}
              copyLabel="chain ID"
              copyValue={String(profile.chainId)}
            />
            <TechnicalField
              label="Agent ID"
              value={profile.agentId}
              copyLabel="agent ID"
              copyValue={profile.agentId}
            />
            <TechnicalField
              label="Registry"
              value={profile.registryAddress}
              href={registryHref}
              copyLabel="registry address"
              copyValue={profile.registryAddress}
            />
            <TechnicalField
              label="Owner"
              value={formatAddress(profile.ownerAddress)}
              href={ownerHref}
              copyLabel={profile.ownerAddress ? "owner address" : undefined}
              copyValue={profile.ownerAddress ?? undefined}
            />
            <TechnicalField
              label="Registration block"
              value={
                profile.registeredBlock === null
                  ? "Not available"
                  : String(profile.registeredBlock)
              }
              href={blockHref}
              copyLabel={
                profile.registeredBlock === null
                  ? undefined
                  : "registration block"
              }
              copyValue={
                profile.registeredBlock === null
                  ? undefined
                  : String(profile.registeredBlock)
              }
            />
          </dl>
        </div>

        <div>
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            <RadioTower className="size-4 text-brand" aria-hidden="true" />
            Indexed metadata
          </h3>
          <dl className="mt-3 border-y border-border">
            <TechnicalField
              label="Metadata status"
              value={formatMetadataStatus(profile.metadataStatus)}
            />
            <TechnicalField
              label="Last verified"
              value={formatProfileTimestamp(profile.metadataVerifiedAt)}
            />
            <TechnicalField
              label="Last indexed"
              value={formatProfileTimestamp(profile.lastSyncedAt)}
            />
            <TechnicalField
              label="Agent URI"
              value={summarizeAgentUri(profile.agentUri)}
              href={agentUriHref}
              copyLabel={copyableAgentUri ? "agent URI" : undefined}
              copyValue={copyableAgentUri}
            />
            <TechnicalField
              label="ERC standard"
              value="ERC-8004 identity registration"
            />
            <TechnicalField
              label="x402"
              value={
                profile.x402Supported === null
                  ? "Not available"
                  : profile.x402Supported
                    ? "Declared supported"
                    : "Not declared"
              }
            />
          </dl>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Declared service endpoints
          </h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Endpoints are untrusted metadata. Only public HTTPS targets are
            clickable; other values remain inert and copyable.
          </p>
          {profile.services.some((service) => service.endpoint) ? (
            <dl className="mt-3 border-y border-border">
              {profile.services.flatMap((service, index) =>
                service.endpoint
                  ? [
                      <TechnicalField
                        key={`${service.serviceType}:${service.endpoint}:${index}`}
                        label={formatServiceType(service.serviceType)}
                        value={service.endpoint}
                        href={normalizeExternalHref(service.endpoint)}
                        copyLabel={`${formatServiceType(service.serviceType)} endpoint`}
                        copyValue={service.endpoint}
                      />,
                    ]
                  : [],
              )}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Not available</p>
          )}
        </div>
      </div>
    </ProfileSection>
  );
}
