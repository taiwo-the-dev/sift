import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createPageMetadata,
  resolveSiteUrl,
} from "../../lib/metadata";

describe("production metadata", () => {
  it("builds canonical and social metadata without changing page copy", () => {
    const metadata = createPageMetadata({
      description: "A real page description.",
      path: "/discover",
      title: "Discover AI agents",
    });

    assert.deepEqual(metadata.alternates, { canonical: "/discover" });
    assert.equal(metadata.openGraph?.title, "Discover AI agents");
    assert.equal(metadata.openGraph?.url, "/discover");
    assert.ok(metadata.twitter && "card" in metadata.twitter);
    assert.equal(metadata.twitter.card, "summary_large_image");
    assert.equal(metadata.robots, undefined);
  });

  it("marks private product routes as noindex", () => {
    const metadata = createPageMetadata({
      description: "Wallet-scoped records.",
      noIndex: true,
      path: "/dashboard",
      title: "Dashboard",
    });

    assert.deepEqual(metadata.robots, { follow: false, index: false });
  });

  it("accepts HTTPS configuration and Vercel origins but rejects unsafe public HTTP", () => {
    assert.equal(
      resolveSiteUrl({ SIFT_SITE_URL: "https://sift.example/path" }).origin,
      "https://sift.example",
    );
    assert.equal(
      resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "sift.vercel.app" }).origin,
      "https://sift.vercel.app",
    );
    assert.throws(
      () => resolveSiteUrl({ SIFT_SITE_URL: "http://public.example" }),
      /absolute HTTPS origin/,
    );
  });
});
