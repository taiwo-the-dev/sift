import type { NextRequest } from "next/server";

import { AgentImageError, fetchAgentImage } from "@/lib/images/agent-image";

export const runtime = "nodejs";

function failureResponse(error: unknown): Response {
  const status =
    error instanceof AgentImageError && error.code === "too-large" ? 413 : 404;

  return new Response(null, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: NextRequest): Promise<Response> {
  const source = request.nextUrl.searchParams.get("url");

  if (!source) {
    return failureResponse(new AgentImageError("invalid-source"));
  }

  try {
    const image = await fetchAgentImage(source);

    return new Response(image.body, {
      headers: {
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        "Content-Type": image.contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failureResponse(error);
  }
}
