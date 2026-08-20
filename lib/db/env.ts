import "server-only";

import {
  parseSupabaseServerConfig,
  type SupabaseServerConfig,
} from "@/lib/db/config";

let cachedConfig: SupabaseServerConfig | undefined;

export function getSupabaseServerConfig(): SupabaseServerConfig {
  cachedConfig ??= parseSupabaseServerConfig(process.env);
  return cachedConfig;
}
