const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const resumeTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function isHiringIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function isHiringResumeToken(value: unknown): value is string {
  return typeof value === "string" && resumeTokenPattern.test(value);
}

export function createHiringResumeToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

