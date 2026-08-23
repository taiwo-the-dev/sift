export type SavedHiringResume = Readonly<{
  id: string;
  idempotencyKey: string;
  resumeToken: string;
}>;

export function hiringResumeStorageKey(chainId: number, agentId: string): string {
  return `sift:hiring:${chainId}:${agentId}`;
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

