import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/database.types";
import { parseSupabaseServerConfig } from "@/lib/db/config";
import { DatabaseOperationError } from "@/lib/db/errors";

export async function indexedAgentExists(
  chainId: number,
  agentId: string,
): Promise<boolean> {
  const { secretKey, url } = parseSupabaseServerConfig(process.env);
  const client = createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    db: { schema: "public" },
  });
  const { data, error } = await client
    .from("agents")
    .select("id")
    .eq("chain_id", chainId)
    .eq("agent_id", agentId)
    .limit(2);

  if (error) {
    throw new DatabaseOperationError("check indexed agent route", error);
  }

  if (data.length > 1) {
    throw new DatabaseOperationError(
      "check indexed agent route",
      new Error("Multiple registry records map to the requested profile route."),
    );
  }

  return data.length === 1;
}
