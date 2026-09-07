import { parseAgentProfileIdentity } from "@/features/agents/route";
import {
  discoveryCategorySlugs,
  type DiscoveryCategory,
} from "@/features/discovery/model";
import {
  maximumBookmarkedAgents,
  type BookmarkableAgent,
  type BookmarkedAgent,
} from "@/features/bookmarks/model";
import type { MetadataStatus } from "@/lib/db/validation";

export const bookmarkStorageKey = "sift:bookmarked-agents:v1";

const metadataStatuses = new Set<MetadataStatus>([
  "invalid",
  "pending",
  "unavailable",
  "valid",
]);
const categorySlugs = new Set<string>(discoveryCategorySlugs);

function boundedNullableString(
  value: unknown,
  maximumLength: number,
): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > maximumLength) {
    return undefined;
  }
  return value;
}

function parseBookmarkedAgent(value: unknown): BookmarkedAgent | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<Record<keyof BookmarkedAgent, unknown>>;
  const identity = parseAgentProfileIdentity(
    typeof candidate.chainId === "number" ? String(candidate.chainId) : "",
    typeof candidate.agentId === "string" ? candidate.agentId : "",
  );
  const name = boundedNullableString(candidate.name, 256);
  const description = boundedNullableString(candidate.description, 1_000);
  const imageUrl = boundedNullableString(candidate.imageUrl, 2_048);
  const savedAt =
    typeof candidate.savedAt === "string" ? new Date(candidate.savedAt) : null;

  if (
    candidate.version !== 1 ||
    !identity ||
    name === undefined ||
    description === undefined ||
    imageUrl === undefined ||
    !metadataStatuses.has(candidate.metadataStatus as MetadataStatus) ||
    !savedAt ||
    Number.isNaN(savedAt.getTime()) ||
    !Array.isArray(candidate.categories)
  ) {
    return null;
  }

  const categories = candidate.categories.filter(
    (category): category is DiscoveryCategory =>
      typeof category === "string" && categorySlugs.has(category),
  );

  return {
    agentId: identity.agentId,
    categories: [...new Set(categories)],
    chainId: identity.chainId,
    description,
    imageUrl,
    metadataStatus: candidate.metadataStatus as MetadataStatus,
    name,
    savedAt: savedAt.toISOString(),
    version: 1,
  };
}

export function bookmarkIdentityKey(
  agent: Pick<BookmarkableAgent, "agentId" | "chainId">,
): string {
  return `${agent.chainId}:${agent.agentId}`;
}

export function parseBookmarkedAgents(value: unknown): readonly BookmarkedAgent[] {
  if (!Array.isArray(value)) return [];

  const bookmarks: BookmarkedAgent[] = [];
  const seen = new Set<string>();

  for (const valueItem of value) {
    const bookmark = parseBookmarkedAgent(valueItem);
    if (!bookmark) continue;

    const key = bookmarkIdentityKey(bookmark);
    if (seen.has(key)) continue;

    seen.add(key);
    bookmarks.push(bookmark);

    if (bookmarks.length >= maximumBookmarkedAgents) break;
  }

  return bookmarks;
}

export function createBookmarkedAgent(
  agent: BookmarkableAgent,
  savedAt = new Date(),
): BookmarkedAgent {
  return {
    agentId: agent.agentId,
    categories: [...agent.categories],
    chainId: agent.chainId,
    description: agent.description?.slice(0, 1_000) ?? null,
    imageUrl:
      agent.imageUrl && agent.imageUrl.length <= 2_048 ? agent.imageUrl : null,
    metadataStatus: agent.metadataStatus,
    name: agent.name?.slice(0, 256) ?? null,
    savedAt: savedAt.toISOString(),
    version: 1,
  };
}
