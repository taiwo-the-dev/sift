import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DatabaseConfigError,
  parseSupabaseServerConfig,
} from "../../lib/db/config";

describe("parseSupabaseServerConfig", () => {
  it("accepts a server URL and secret without exposing a browser key", () => {
    const config = parseSupabaseServerConfig({
      SUPABASE_SECRET_KEY: "sb_secret_12345678901234567890",
      SUPABASE_URL: "https://example.supabase.co/",
    });

    assert.deepEqual(config, {
      secretKey: "sb_secret_12345678901234567890",
      url: "https://example.supabase.co",
    });
  });

  it("fails only when database configuration is parsed", () => {
    assert.throws(
      () => parseSupabaseServerConfig({}),
      (error: unknown) =>
        error instanceof DatabaseConfigError &&
        error.message.includes("SUPABASE_URL"),
    );
  });

  it("rejects a publishable key in the privileged server slot", () => {
    assert.throws(
      () =>
        parseSupabaseServerConfig({
          SUPABASE_SECRET_KEY: "sb_publishable_12345678901234567890",
          SUPABASE_URL: "http://127.0.0.1:54321",
        }),
      (error: unknown) =>
        error instanceof DatabaseConfigError &&
        error.message.includes("publishable"),
    );
  });
});
