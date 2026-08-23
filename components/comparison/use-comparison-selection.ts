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

type SelectionSnapshot = Readonly<{
  goal: string;
  references: readonly AgentReference[];
}>;

const storageKey = "sift:comparison-selection:v1";
const emptySnapshot: SelectionSnapshot = Object.freeze({
  goal: "",
  references: Object.freeze([]),
});
const listeners = new Set<() => void>();
let currentSnapshot = emptySnapshot;
let storageLoaded = false;

function readStoredSnapshot(): SelectionSnapshot {
  try {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return emptySnapshot;
    }

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

    return {
      goal: selection.goal,
      references: selection.references,
    };
  } catch {
    return emptySnapshot;
  }
}

function ensureStorageLoaded() {
  if (!storageLoaded && typeof window !== "undefined") {
    currentSnapshot = readStoredSnapshot();
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
      storageKey,
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
    if (event.key === storageKey) {
      currentSnapshot = readStoredSnapshot();
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
) {
  const selection = parseComparisonSelection(
    references.map(serializeAgentReference),
    goal,
  );

  writeSnapshot({
    goal: selection.goal,
    references: selection.references,
  });
}

export function useComparisonSelection() {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const add = useCallback((reference: AgentReference, goal?: string) => {
    const current = getSnapshot();

    if (
      current.references.some((candidate) => sameReference(candidate, reference)) ||
      current.references.length >= maximumComparisonAgents
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
