import type {
  AgentProfile,
  AgentProfileService,
} from "@/features/agents/model";
import type {
  CategorySource,
  DiscoveryCategory,
} from "@/features/discovery/model";
import { classifyAgentCategories } from "@/features/categories/taxonomy";
import type { Json } from "@/lib/db/database.types";
import type { MetadataStatus } from "@/lib/db/validation";

function isRecord(value: Json): value is Readonly<Record<string, Json | undefined>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function capabilityLabel(value: Json): string | null {
  if (typeof value === "string") {
    const label = value.trim();
    return label.length > 0 && label.length <= 100 ? label : null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const candidate =
    typeof value.name === "string"
      ? value.name
      : typeof value.id === "string"
        ? value.id
        : null;
  const label = candidate?.trim() ?? "";

  return label.length > 0 && label.length <= 100 ? label : null;
}

export function resolveProfileCategories(
  category: DiscoveryCategory | null,
  name: string | null,
  description: string | null,
  services: readonly AgentProfileService[],
): Readonly<{
  categories: readonly DiscoveryCategory[];
  categorySource: CategorySource;
}> {
  const evidence = classifyAgentCategories({
    declaredCategories: category ? [category] : [],
    description,
    name,
    observedAt: "2000-01-01T00:00:00.000Z",
    services,
  });
  const categories = evidence.map((item) => item.category);

  return {
    categories,
    categorySource: evidence[0]?.source ?? null,
  };
}

export function collectDeclaredCapabilities(
  services: readonly AgentProfileService[],
): readonly string[] {
  const labels = services.flatMap((service) => {
    const metadata = service.metadata;

    if (!isRecord(metadata)) {
      return [];
    }

    return ["skills", "capabilities", "domains", "tags"].flatMap((key) => {
      const value = metadata[key];

      if (!Array.isArray(value)) {
        return [];
      }

      return value.flatMap((entry) => {
        const label = capabilityLabel(entry);
        return label ? [label] : [];
      });
    });
  });

  return [...new Set(labels)].slice(0, 24);
}

export function describeDeclaredService(
  service: AgentProfileService,
): string | null {
  if (!service.metadata || !isRecord(service.metadata)) {
    return null;
  }

  const value = service.metadata.description;

  if (typeof value !== "string") {
    return null;
  }

  const description = value.replace(/\s+/g, " ").trim();

  return description.length > 0 && description.length <= 500
    ? description
    : null;
}

export type ProfileProvenance = Readonly<{
  description: string;
  isStale: boolean;
  label: string;
  tone: "good" | "caution" | "neutral";
}>;

export function describeProfileProvenance(
  metadataStatus: MetadataStatus,
  hasRetainedMetadata: boolean,
  metadataVerifiedAt: string | null,
): ProfileProvenance {
  if (metadataStatus === "valid") {
    return {
      description: metadataVerifiedAt
        ? "The agent's profile data passed the latest validation check."
        : "The profile data is valid, but the verification time is unavailable.",
      isStale: false,
      label: "Profile verified",
      tone: "good",
    };
  }

  if (metadataStatus === "pending") {
    return {
      description:
        "The agent is listed, but its profile data is still being checked.",
      isStale: false,
      label: "Profile verification pending",
      tone: "neutral",
    };
  }

  if (hasRetainedMetadata) {
    return {
      description: metadataVerifiedAt
        ? "The latest check failed. The last verified profile data is shown."
        : "The latest check failed. Earlier profile data is shown, but its verification time is unavailable.",
      isStale: true,
      label: "Last verified profile",
      tone: "caution",
    };
  }

  return {
    description:
      "The agent is listed, but verified profile data is unavailable.",
    isStale: false,
    label:
      metadataStatus === "invalid"
        ? "Invalid profile data"
        : "Profile unavailable",
    tone: "caution",
  };
}

export function hasHumanReadableMetadata(
  profile: Pick<AgentProfile, "description" | "imageUrl" | "name" | "services">,
): boolean {
  return Boolean(
    profile.name ||
      profile.description ||
      profile.imageUrl ||
      profile.services.length > 0,
  );
}
