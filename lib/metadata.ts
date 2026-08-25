import "server-only";

import type { Metadata } from "next";

const localSiteUrl = new URL("http://localhost:3000");
const socialImage = {
  alt: "Sift — Find the right AI agent for the job",
  height: 630,
  url: "/opengraph-image",
  width: 1_200,
} as const;

function parseSiteUrl(value: string | undefined): URL | null {
  const candidate = value?.trim();

  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    const localHostname = url.hostname === "localhost" || url.hostname === "127.0.0.1";

    if (url.protocol !== "https:" && !(url.protocol === "http:" && localHostname)) {
      return null;
    }

    return new URL(url.origin);
  } catch {
    return null;
  }
}

type SiteEnvironment = Readonly<{
  SIFT_SITE_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_URL?: string;
}>;

export function resolveSiteUrl(environment?: SiteEnvironment): URL {
  const source = environment ?? {
    SIFT_SITE_URL: process.env.SIFT_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL:
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  };
  const explicitSiteUrl = source.SIFT_SITE_URL?.trim();
  const configured = parseSiteUrl(explicitSiteUrl);

  if (configured) return configured;

  if (explicitSiteUrl) {
    throw new Error(
      "SIFT_SITE_URL must be an absolute HTTPS origin (HTTP is allowed only for localhost).",
    );
  }

  const vercelHostname =
    source.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    source.VERCEL_URL?.trim();
  const vercelUrl = vercelHostname
    ? parseSiteUrl(`https://${vercelHostname}`)
    : null;

  return vercelUrl ?? localSiteUrl;
}

interface PageMetadataInput {
  description: string;
  noIndex?: boolean;
  path: `/${string}` | "/";
  title: string;
}

export function createPageMetadata({
  description,
  noIndex = false,
  path,
  title,
}: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      images: [socialImage],
      siteName: "Sift",
      type: "website",
      url: path,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage.url],
    },
    ...(noIndex
      ? { robots: { follow: false, index: false } }
      : {}),
  };
}

export const siftSocialImage = socialImage;
