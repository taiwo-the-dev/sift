export type SupabaseServerConfig = Readonly<{
  secretKey: string;
  url: string;
}>;

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export class DatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

function readRequiredValue(
  source: EnvironmentSource,
  variableName: "SUPABASE_SECRET_KEY" | "SUPABASE_URL",
): string {
  const value = source[variableName]?.trim();

  if (!value) {
    throw new DatabaseConfigError(
      `Missing ${variableName}. Copy .env.example to .env.local and configure the database integration.`,
    );
  }

  return value;
}

function validateSupabaseUrl(value: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new DatabaseConfigError(
      "SUPABASE_URL must be a valid HTTP or HTTPS URL.",
    );
  }

  if (url.protocol !== "https:") {
    throw new DatabaseConfigError(
      "SUPABASE_URL must use HTTPS and point to the hosted Supabase project.",
    );
  }

  if (url.username || url.password) {
    throw new DatabaseConfigError(
      "SUPABASE_URL must not contain database credentials.",
    );
  }

  if (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]"
  ) {
    throw new DatabaseConfigError(
      "SUPABASE_URL must point to the hosted Supabase project, not a local service.",
    );
  }

  return url.toString().replace(/\/$/, "");
}

function validateSecretKey(value: string): string {
  if (value.startsWith("sb_publishable_")) {
    throw new DatabaseConfigError(
      "SUPABASE_SECRET_KEY must contain a server secret key, not a publishable key.",
    );
  }

  if (value.length < 20) {
    throw new DatabaseConfigError(
      "SUPABASE_SECRET_KEY does not look like a valid server credential.",
    );
  }

  return value;
}

export function parseSupabaseServerConfig(
  source: EnvironmentSource,
): SupabaseServerConfig {
  const url = validateSupabaseUrl(readRequiredValue(source, "SUPABASE_URL"));
  const secretKey = validateSecretKey(
    readRequiredValue(source, "SUPABASE_SECRET_KEY"),
  );

  return Object.freeze({ secretKey, url });
}
