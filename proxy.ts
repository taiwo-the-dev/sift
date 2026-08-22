import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { parseAgentProfileIdentity } from "@/features/agents/route";
import { indexedAgentExists } from "@/lib/db/profile-existence";

function notFoundRewrite(request: NextRequest): NextResponse {
  return NextResponse.rewrite(
    new URL("/agents/profile-not-found", request.url),
    { status: 404 },
  );
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }

  const segments = request.nextUrl.pathname.split("/");
  const identity = parseAgentProfileIdentity(segments[2] ?? "", segments[3] ?? "");

  if (!identity) {
    return notFoundRewrite(request);
  }

  try {
    if (!(await indexedAgentExists(identity.chainId, identity.agentId))) {
      return notFoundRewrite(request);
    }
  } catch {
    // Let the profile route render its guarded error state when the data source
    // is unavailable or inconsistent rather than masking that failure as a 404.
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/agents/:chainId/:agentId",
};
