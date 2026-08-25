import type { MetadataRoute } from "next";

import { resolveSiteUrl } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    host: resolveSiteUrl().origin,
    rules: {
      allow: "/",
      disallow: ["/api/", "/hire/", "/dashboard"],
      userAgent: "*",
    },
  };
}
