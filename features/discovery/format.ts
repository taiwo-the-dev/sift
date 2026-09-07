import {
  discoveryCategories,
  discoveryHealthStatuses,
  discoveryMetadataStatuses,
} from "@/features/discovery/model";
import type { MetadataStatus } from "@/lib/db/validation";
import type { HealthStatus } from "@/features/health/model";

const registrationDateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatAgentName(name: string | null, agentId: string): string {
  return name?.trim() || `Agent #${agentId}`;
}

export function formatAgentDescription(description: string | null): string {
  return (
    description?.trim() ||
    "No description is available for this agent."
  );
}

export function formatCategory(category: string): string {
  return (
    discoveryCategories.find((option) => option.slug === category)?.label ??
    "Other"
  );
}

export function formatMetadataStatus(status: MetadataStatus): string {
  return (
    discoveryMetadataStatuses.find((option) => option.value === status)?.label ??
    "Unknown profile status"
  );
}

export function formatHealthStatus(status: HealthStatus): string {
  return (
    discoveryHealthStatuses.find((option) => option.value === status)?.label ??
    "Unknown health status"
  );
}

export function formatServiceType(serviceType: string): string {
  const trimmed = serviceType.trim();

  if (!trimmed) {
    return "Unnamed service";
  }

  if (/^[A-Z0-9-]{2,}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatRegistrationDate(value: string | null): string {
  if (!value) {
    return "Registration time unavailable";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Registration time unavailable"
    : registrationDateFormatter.format(date);
}

export function formatChainName(chainId: number): string {
  if (chainId === 97) {
    return "BSC Testnet";
  }

  if (chainId === 56) {
    return "BSC Mainnet";
  }

  return `Chain ${chainId}`;
}
