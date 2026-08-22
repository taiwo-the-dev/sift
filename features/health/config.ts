export type HealthCheckConfig = Readonly<{
  concurrency: number;
  intervalHours: number;
  limit: number;
  maxBytes: number;
  retries: number;
  timeoutMs: number;
}>;

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

function readInteger(
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

export function parseHealthCheckConfig(
  source: EnvironmentSource,
): HealthCheckConfig {
  return Object.freeze({
    concurrency: readInteger(
      source,
      "HEALTH_CHECK_CONCURRENCY",
      3,
      1,
      5,
    ),
    intervalHours: readInteger(
      source,
      "HEALTH_CHECK_INTERVAL_HOURS",
      6,
      1,
      24,
    ),
    limit: readInteger(source, "HEALTH_CHECK_LIMIT", 20, 1, 50),
    maxBytes: readInteger(
      source,
      "HEALTH_CHECK_MAX_BYTES",
      65_536,
      1_024,
      262_144,
    ),
    retries: readInteger(source, "HEALTH_CHECK_RETRIES", 1, 0, 1),
    timeoutMs: readInteger(
      source,
      "HEALTH_CHECK_TIMEOUT_MS",
      5_000,
      1_000,
      10_000,
    ),
  });
}
