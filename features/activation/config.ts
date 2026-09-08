export type ActivationCheckConfig = Readonly<{
  concurrency: number;
  intervalHours: number;
  limit: number;
  maxBytes: number;
  timeoutMs: number;
}>;

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

function integer(
  source: EnvironmentSource,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const raw = source[name]?.trim();
  const value = raw ? Number(raw) : fallback;
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
}

export function parseActivationCheckConfig(
  source: EnvironmentSource,
): ActivationCheckConfig {
  return Object.freeze({
    concurrency: integer(source, "ACTIVATION_CHECK_CONCURRENCY", 3, 1, 5),
    intervalHours: integer(source, "ACTIVATION_CHECK_INTERVAL_HOURS", 6, 1, 24),
    limit: integer(source, "ACTIVATION_CHECK_LIMIT", 25, 1, 100),
    maxBytes: integer(source, "ACTIVATION_CHECK_MAX_BYTES", 65_536, 4_096, 262_144),
    timeoutMs: integer(source, "ACTIVATION_CHECK_TIMEOUT_MS", 6_000, 1_000, 12_000),
  });
}
