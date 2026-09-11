const requestTimeoutMs = 20_000;

const categoryRoutes = [
  "/discover?category=yield-optimisation",
  "/discover?category=grid-trading",
  "/discover?category=health-factor-monitoring",
  "/discover?category=liquidity-rebalancing",
] as const;

interface PageResult {
  body: string;
  response: Response;
}

function deploymentOrigin(input: string | undefined): URL {
  if (!input) {
    throw new Error(
      "Pass the deployment origin, for example: npm run release:smoke -- https://sift.example",
    );
  }

  const url = new URL(input);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";

  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) {
    throw new Error(
      "The release origin must use HTTPS (HTTP is allowed only for localhost).",
    );
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      "The release origin must not contain credentials, a query, or a fragment.",
    );
  }

  return new URL(url.origin);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function pass(label: string): void {
  process.stdout.write(`[PASS] ${label}\n`);
}

async function request(origin: URL, path: string): Promise<PageResult> {
  const response = await fetch(new URL(path, origin), {
    headers: { "user-agent": "Sift release verifier/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  return { body: await response.text(), response };
}

function requireStatus(result: PageResult, expected: number, label: string): void {
  assert(
    result.response.status === expected,
    `${label} returned ${result.response.status}; expected ${expected}.`,
  );
  pass(`${label} returned ${expected}`);
}

function requireText(result: PageResult, text: string, label: string): void {
  assert(result.body.includes(text), `${label} did not contain “${text}”.`);
  pass(`${label} contains the expected release content`);
}

async function verify(): Promise<void> {
  const origin = deploymentOrigin(process.argv[2]);
  process.stdout.write(`Verifying ${origin.origin}\n`);

  const home = await request(origin, "/");
  requireStatus(home, 200, "Landing page");
  requireText(home, "Find the right", "Landing page");
  assert(
    home.body.includes('rel="canonical"'),
    "Landing page has no canonical link.",
  );
  assert(
    home.body.includes('property="og:title"'),
    "Landing page has no OpenGraph title.",
  );
  assert(
    home.body.includes('name="twitter:card"'),
    "Landing page has no Twitter card.",
  );
  pass("Canonical, OpenGraph, and Twitter metadata are present");

  const securityHeaders = [
    ["content-security-policy", "frame-ancestors 'none'"],
    ["referrer-policy", "strict-origin-when-cross-origin"],
    ["x-content-type-options", "nosniff"],
    ["x-frame-options", "DENY"],
  ] as const;

  for (const [name, expected] of securityHeaders) {
    assert(
      home.response.headers.get(name)?.includes(expected),
      `Landing response is missing the expected ${name} value.`,
    );
  }
  assert(
    !home.response.headers.has("x-powered-by"),
    "x-powered-by must be disabled.",
  );
  if (origin.protocol === "https:") {
    assert(
      home.response.headers.get("strict-transport-security")?.includes("max-age="),
      "HTTPS deployment is missing HSTS.",
    );
  }
  pass("Production security headers are present");

  const discover = await request(origin, "/discover");
  requireStatus(discover, 200, "Discovery page");
  requireText(discover, "ERC-8004 agents on BNB Chain", "Discovery page");

  const agentPaths = [
    ...new Set(
      [...discover.body.matchAll(/href="(\/agents\/56\/\d+)"/g)].map(
        (match) => match[1],
      ),
    ),
  ];
  const profilePath = agentPaths[0];
  assert(profilePath, "Discovery returned no agent profile links.");
  pass(`Discovery exposes real agent profile routes (${agentPaths.length} found)`);

  for (const path of categoryRoutes) {
    const category = await request(origin, path);
    requireStatus(category, 200, `Category route ${path}`);
    requireText(category, "ERC-8004 agents on BNB Chain", `Category route ${path}`);
  }

  const categoryCoverage = await request(
    origin,
    `/api/reports/category-coverage?release-check=${Date.now()}`,
  );
  requireStatus(categoryCoverage, 200, "Category coverage report");
  requireText(categoryCoverage, '"status":"pass"', "Category coverage report");

  const profile = await request(origin, profilePath);
  requireStatus(profile, 200, `Agent profile ${profilePath}`);
  assert(
    profile.body.includes("ERC-8004") && profile.body.includes("Sift Score"),
    "Agent profile is missing ERC-8004 or Sift Score information.",
  );
  pass("Agent profile shows ERC-8004 and Sift Score information");

  const comparisonParameters = new URLSearchParams();
  for (const path of agentPaths.slice(0, 3)) {
    const [, , chainId, agentId] = path.split("/");
    assert(chainId && agentId, `Could not parse agent profile path ${path}.`);
    comparisonParameters.append("agent", `${chainId}:${agentId}`);
  }
  const comparisonPath = `/compare?${comparisonParameters.toString()}`;
  const comparison = await request(origin, comparisonPath);
  requireStatus(comparison, 200, "Comparison page");
  requireText(comparison, "Evaluate agents against your task", "Comparison page");

  const dashboard = await request(origin, "/dashboard");
  requireStatus(dashboard, 200, "Dashboard");
  requireText(
    dashboard,
    "Follow every job from payment to completion.",
    "Dashboard",
  );
  assert(dashboard.body.includes("noindex"), "Dashboard must remain noindex.");
  pass("Dashboard privacy metadata is present");

  const missing = await request(origin, "/m12-release-route-that-does-not-exist");
  requireStatus(missing, 404, "Not-found route");
  requireText(missing, "Page not found", "Not-found route");

  const assets = [
    ["/icon", "image/"],
    ["/apple-icon", "image/"],
    ["/opengraph-image", "image/"],
    ["/manifest.webmanifest", "application/manifest+json"],
    ["/robots.txt", "text/plain"],
  ] as const;

  for (const [path, contentType] of assets) {
    const asset = await request(origin, path);
    requireStatus(asset, 200, path);
    assert(
      asset.response.headers.get("content-type")?.startsWith(contentType),
      `${path} has an unexpected content type.`,
    );
  }
  pass("Icons, OpenGraph image, manifest, and robots are reachable");

  process.stdout.write(`Release smoke verification passed for ${origin.origin}.\n`);
}

verify().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "Unknown release verification failure.";
  process.stderr.write(`[FAIL] ${message}\n`);
  process.exitCode = 1;
});
