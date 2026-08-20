import "server-only";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type { Database } from "@/lib/db/database.types";
import { getSupabaseServerConfig } from "@/lib/db/env";

let cachedClient: SupabaseClient<Database> | undefined;

export function getSupabaseServerClient(): SupabaseClient<Database> {
  if (cachedClient) {
    return cachedClient;
  }

  const { secretKey, url } = getSupabaseServerConfig();

  cachedClient = createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    db: {
      schema: "public",
    },
  });

  return cachedClient;
}
