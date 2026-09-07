import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { maximumBookmarkedAgents } from "../../features/bookmarks/model";
import {
  createBookmarkedAgent,
  parseBookmarkedAgents,
} from "../../features/bookmarks/storage";

const validBookmark = {
  agentId: "42",
  categories: ["grid-trading"],
  chainId: 56,
  description: "A registered trading agent.",
  imageUrl: "https://example.org/agent.png",
  metadataStatus: "valid",
  name: "Grid Agent",
  savedAt: "2026-09-07T10:00:00.000Z",
  version: 1,
} as const;

describe("agent bookmark storage", () => {
  it("restores valid real-agent summaries and removes duplicate identities", () => {
    const bookmarks = parseBookmarkedAgents([
      validBookmark,
      { ...validBookmark, name: "Duplicate snapshot" },
    ]);

    assert.equal(bookmarks.length, 1);
    assert.equal(bookmarks[0]?.name, "Grid Agent");
    assert.deepEqual(bookmarks[0]?.categories, ["grid-trading"]);
  });

  it("rejects malformed identities and unsupported bookmark versions", () => {
    assert.deepEqual(
      parseBookmarkedAgents([
        { ...validBookmark, agentId: "not-an-agent" },
        { ...validBookmark, version: 2 },
      ]),
      [],
    );
  });

  it("caps browser storage without inventing additional agents", () => {
    const bookmarks = parseBookmarkedAgents(
      Array.from({ length: maximumBookmarkedAgents + 10 }, (_, index) => ({
        ...validBookmark,
        agentId: String(index + 1),
      })),
    );

    assert.equal(bookmarks.length, maximumBookmarkedAgents);
    assert.equal(bookmarks.at(-1)?.agentId, String(maximumBookmarkedAgents));
  });

  it("records only the supplied agent summary and bookmark time", () => {
    const savedAt = new Date("2026-09-07T12:30:00.000Z");
    const bookmark = createBookmarkedAgent(validBookmark, savedAt);

    assert.equal(bookmark.savedAt, savedAt.toISOString());
    assert.equal(bookmark.version, 1);
    assert.equal(bookmark.agentId, validBookmark.agentId);
  });
});
