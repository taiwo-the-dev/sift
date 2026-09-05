import type { HiringMissionInput } from "@/features/hiring/model";

export type SavedHiringResume = Readonly<{
  id: string;
  idempotencyKey: string;
  resumeToken: string;
}>;

export type SavedHiringDraft = Readonly<{
  mission: HiringMissionInput;
  version: 1;
}>;

const supportedDraftDurations = new Set([7_200, 86_400, 604_800, 2_592_000]);

export function hiringResumeStorageKey(chainId: number, agentId: string): string {
  return `sift:hiring:${chainId}:${agentId}`;
}

export function hiringDraftStorageKey(chainId: number, agentId: string): string {
  return `sift:hiring-draft:${chainId}:${agentId}`;
}

export function parseSavedHiringDraft(value: unknown): SavedHiringDraft | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Readonly<{
    mission?: Partial<HiringMissionInput>;
    version?: unknown;
  }>;
  const mission = candidate.mission;

  if (
    candidate.version !== 1 ||
    !mission ||
    typeof mission.deliverables !== "string" ||
    typeof mission.durationSeconds !== "number" ||
    !supportedDraftDurations.has(mission.durationSeconds) ||
    typeof mission.maxSpend !== "string" ||
    typeof mission.mission !== "string" ||
    typeof mission.qualityStandards !== "string" ||
    mission.deliverables.length > 700 ||
    mission.maxSpend.length > 80 ||
    mission.mission.length > 1_500 ||
    mission.qualityStandards.length > 700
  ) {
    return null;
  }

  return {
    mission: {
      deliverables: mission.deliverables,
      durationSeconds: mission.durationSeconds,
      maxSpend: mission.maxSpend,
      mission: mission.mission,
      qualityStandards: mission.qualityStandards,
    },
    version: 1,
  };
}

export function readHiringDraft(key: string): SavedHiringDraft | null {
  try {
    const value = localStorage.getItem(key);
    return value ? parseSavedHiringDraft(JSON.parse(value)) : null;
  } catch {
    return null;
  }
}

export function writeHiringDraft(key: string, mission: HiringMissionInput): void {
  const draft: SavedHiringDraft = { mission, version: 1 };
  localStorage.setItem(key, JSON.stringify(draft));
}

export function clearHiringDraft(key: string): void {
  localStorage.removeItem(key);
}

export function readHiringResume(key: string): SavedHiringResume | null {
  try {
    const value = localStorage.getItem(key);

    if (!value) {
      return null;
    }

    const parsed = JSON.parse(value) as Partial<SavedHiringResume>;

    return typeof parsed.id === "string" &&
      typeof parsed.idempotencyKey === "string" &&
      typeof parsed.resumeToken === "string"
      ? {
          id: parsed.id,
          idempotencyKey: parsed.idempotencyKey,
          resumeToken: parsed.resumeToken,
        }
      : null;
  } catch {
    return null;
  }
}

export function writeHiringResume(key: string, value: SavedHiringResume): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function clearHiringResume(key: string): void {
  localStorage.removeItem(key);
}
