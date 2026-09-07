import type { MetadataStatus } from "@/lib/db/validation";
import type { DiscoveryCategory } from "@/features/discovery/model";

export const maximumBookmarkedAgents = 50;

export type BookmarkableAgent = Readonly<{
  agentId: string;
  categories: readonly DiscoveryCategory[];
  chainId: number;
  description: string | null;
  imageUrl: string | null;
  metadataStatus: MetadataStatus;
  name: string | null;
}>;

export type BookmarkedAgent = BookmarkableAgent &
  Readonly<{
    savedAt: string;
    version: 1;
  }>;
