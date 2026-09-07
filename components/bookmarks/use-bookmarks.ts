"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  maximumBookmarkedAgents,
  type BookmarkableAgent,
  type BookmarkedAgent,
} from "@/features/bookmarks/model";
import {
  bookmarkIdentityKey,
  bookmarkStorageKey,
  createBookmarkedAgent,
  parseBookmarkedAgents,
} from "@/features/bookmarks/storage";

type BookmarkSnapshot = Readonly<{
  agents: readonly BookmarkedAgent[];
  ready: boolean;
}>;

const serverSnapshot: BookmarkSnapshot = Object.freeze({
  agents: Object.freeze([]),
  ready: false,
});
const listeners = new Set<() => void>();
let currentSnapshot = serverSnapshot;
let storageLoaded = false;

function readStoredBookmarks(): readonly BookmarkedAgent[] {
  try {
    const stored = window.localStorage.getItem(bookmarkStorageKey);
    return stored ? parseBookmarkedAgents(JSON.parse(stored)) : [];
  } catch {
    return [];
  }
}

function ensureStorageLoaded(): void {
  if (!storageLoaded && typeof window !== "undefined") {
    currentSnapshot = { agents: readStoredBookmarks(), ready: true };
    storageLoaded = true;
  }
}

function getSnapshot(): BookmarkSnapshot {
  ensureStorageLoaded();
  return currentSnapshot;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function writeBookmarks(agents: readonly BookmarkedAgent[]): void {
  currentSnapshot = { agents, ready: true };
  storageLoaded = true;

  try {
    window.localStorage.setItem(bookmarkStorageKey, JSON.stringify(agents));
  } catch {
    // Keep the current in-memory selection when browser storage is unavailable.
  }

  emit();
}

function subscribe(listener: () => void): () => void {
  ensureStorageLoaded();
  listeners.add(listener);

  function onStorage(event: StorageEvent): void {
    if (event.key !== bookmarkStorageKey) return;
    currentSnapshot = { agents: readStoredBookmarks(), ready: true };
    emit();
  }

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useBookmarks() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);

  const isBookmarked = useCallback(
    (agent: Pick<BookmarkableAgent, "agentId" | "chainId">) => {
      const key = bookmarkIdentityKey(agent);
      return snapshot.agents.some(
        (bookmark) => bookmarkIdentityKey(bookmark) === key,
      );
    },
    [snapshot.agents],
  );

  const remove = useCallback(
    (agent: Pick<BookmarkableAgent, "agentId" | "chainId">) => {
      const key = bookmarkIdentityKey(agent);
      writeBookmarks(
        getSnapshot().agents.filter(
          (bookmark) => bookmarkIdentityKey(bookmark) !== key,
        ),
      );
    },
    [],
  );

  const toggle = useCallback((agent: BookmarkableAgent) => {
    const current = getSnapshot().agents;
    const key = bookmarkIdentityKey(agent);
    const existing = current.some(
      (bookmark) => bookmarkIdentityKey(bookmark) === key,
    );

    if (existing) {
      writeBookmarks(
        current.filter((bookmark) => bookmarkIdentityKey(bookmark) !== key),
      );
      return;
    }

    if (current.length >= maximumBookmarkedAgents) return;
    writeBookmarks([createBookmarkedAgent(agent), ...current]);
  }, []);

  return {
    agents: snapshot.agents,
    count: snapshot.agents.length,
    isBookmarked,
    isFull: snapshot.agents.length >= maximumBookmarkedAgents,
    ready: snapshot.ready,
    remove,
    toggle,
  } as const;
}
