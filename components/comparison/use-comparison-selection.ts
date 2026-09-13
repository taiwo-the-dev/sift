"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  maximumComparisonAgents,
  type AgentReference,
} from "@/features/comparison/model";
import {
  buildComparisonHref,
  normalizeComparisonGoal,
  parseComparisonSelection,
  serializeAgentReference,
} from "@/features/comparison/query";
import {
  catalogueChainId,
  catalogueNetworkCookie,
  defaultCatalogueNetwork,
  parseCatalogueNetwork,
} from "@/features/network/selection";

type SelectionSnapshot = Readonly<{
  goal: string;
  references: readonly AgentReference[];
}>;

type ComparisonChainId = 56 | 97;

const legacyStorageKey = "sift:comparison-selection:v1";
const storageKeyPrefix = "sift:comparison-selection:v2";
const emptySnapshot: SelectionSnapshot = Object.freeze({
  goal: "",
  references: Object.freeze([]),
});
const listeners = new Set<() => void>();
let currentSnapshot = emptySnapshot;
let activeChainId: ComparisonChainId = catalogueChainId(
  defaultCatalogueNetwork,
);
let storageLoaded = false;

function comparisonStorageKey(chainId: ComparisonChainId): string {
  return `${storageKeyPrefix}:${chainId}`;
}

function supportedComparisonChainId(value: number): ComparisonChainId | null {
  return value === 56 || value === 97 ? value : null;
}

function readSelectedChainId(): ComparisonChainId {
  const selectedCookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${catalogueNetworkCookie}=`))
    ?.slice(catalogueNetworkCookie.length + 1);

  return catalogueChainId(
    parseCatalogueNetwork(selectedCookie) ?? defaultCatalogueNetwork,
  );
}

function parseStoredSnapshot(
  raw: string,
  chainId: ComparisonChainId,
): SelectionSnapshot {
  const parsed = JSON.parse(raw) as Readonly<{
    goal?: unknown;
    references?: unknown;
  }>;
  const references = Array.isArray(parsed.references)
    ? parsed.references.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const selection = parseComparisonSelection(
    references,
    typeof parsed.goal === "string" ? parsed.goal : "",
  );
  const networkReferences = selection.references.filter(
    (reference) => reference.chainId === chainId,
  );

  return networkReferences.length > 0
    ? {
        goal: selection.goal,
        references: networkReferences,
      }
    : emptySnapshot;
}

function readStoredSnapshot(chainId: ComparisonChainId): SelectionSnapshot {
  try {
    const raw = window.localStorage.getItem(comparisonStorageKey(chainId));

    if (raw) {
      return parseStoredSnapshot(raw, chainId);
    }

    const legacyRaw = window.localStorage.getItem(legacyStorageKey);

    return legacyRaw
      ? parseStoredSnapshot(legacyRaw, chainId)
      : emptySnapshot;
  } catch {
    return emptySnapshot;
  }
}

function ensureStorageLoaded() {
  if (!storageLoaded && typeof window !== "undefined") {
    activeChainId = readSelectedChainId();
    currentSnapshot = readStoredSnapshot(activeChainId);
    storageLoaded = true;
  }
}

function getSnapshot(): SelectionSnapshot {
  ensureStorageLoaded();
  return currentSnapshot;
}

function getServerSnapshot(): SelectionSnapshot {
  return emptySnapshot;
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function writeSnapshot(snapshot: SelectionSnapshot) {
  currentSnapshot = snapshot;
  storageLoaded = true;

  try {
    window.localStorage.setItem(
      comparisonStorageKey(activeChainId),
      JSON.stringify({
        goal: snapshot.goal,
        references: snapshot.references.map(serializeAgentReference),
      }),
    );
  } catch {
    // The URL remains the canonical shareable state when storage is unavailable.
  }

  emit();
}

function subscribe(listener: () => void): () => void {
  ensureStorageLoaded();
  listeners.add(listener);

  function onStorage(event: StorageEvent) {
    if (
      event.key === comparisonStorageKey(activeChainId) ||
      event.key === legacyStorageKey
    ) {
      currentSnapshot = readStoredSnapshot(activeChainId);
      emit();
    }
  }

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function sameReference(
  left: AgentReference,
  right: AgentReference,
): boolean {
  return left.chainId === right.chainId && left.agentId === right.agentId;
}

export function replaceComparisonSelection(
  references: readonly AgentReference[],
  goal = "",
  chainId?: ComparisonChainId,
) {
  const selection = parseComparisonSelection(
    references.map(serializeAgentReference),
    goal,
  );
  const selectedChainId =
    chainId ??
    supportedComparisonChainId(selection.references[0]?.chainId ?? -1);

  if (selectedChainId) {
    switchComparisonSelectionChain(selectedChainId);
  } else {
    ensureStorageLoaded();
  }

  writeSnapshot({
    goal: selection.goal,
    references: selection.references.filter(
      (reference) => reference.chainId === activeChainId,
    ),
  });
}

export function switchComparisonSelectionChain(
  chainId: ComparisonChainId,
): SelectionSnapshot {
  ensureStorageLoaded();

  if (chainId === activeChainId) {
    return currentSnapshot;
  }

  activeChainId = chainId;
  currentSnapshot = readStoredSnapshot(activeChainId);
  emit();
  return currentSnapshot;
}

export function useComparisonSelection() {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const add = useCallback((reference: AgentReference, goal?: string) => {
    const chainId = supportedComparisonChainId(reference.chainId);

    if (!chainId) {
      return;
    }

    const current = switchComparisonSelectionChain(chainId);

    if (
      current.references.some((candidate) =>
        sameReference(candidate, reference),
      ) || current.references.length >= maximumComparisonAgents
    ) {
      return;
    }

    writeSnapshot({
      goal: normalizeComparisonGoal(goal) || current.goal,
      references: [...current.references, reference],
    });
  }, []);

  const remove = useCallback((reference: AgentReference) => {
    const current = getSnapshot();
    writeSnapshot({
      ...current,
      references: current.references.filter(
        (candidate) => !sameReference(candidate, reference),
      ),
    });
  }, []);

  const clear = useCallback(() => writeSnapshot(emptySnapshot), []);
  const replace = useCallback(
    (references: readonly AgentReference[], goal = "") =>
      replaceComparisonSelection(references, goal),
    [],
  );
  const isSelected = useCallback(
    (reference: AgentReference) =>
      snapshot.references.some((candidate) =>
        sameReference(candidate, reference),
      ),
    [snapshot.references],
  );

  return {
    add,
    clear,
    goal: snapshot.goal,
    href: buildComparisonHref(snapshot.references, snapshot.goal),
    isFull: snapshot.references.length >= maximumComparisonAgents,
    isSelected,
    references: snapshot.references,
    remove,
    replace,
  } as const;
}
