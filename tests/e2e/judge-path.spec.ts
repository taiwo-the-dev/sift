import { expect, test, type Page } from "@playwright/test";

const categories = [
  "yield-optimisation",
  "grid-trading",
  "health-factor-monitoring",
  "liquidity-rebalancing",
] as const;

function recordPageErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  return errors;
}

async function expectNoPageErrors(errors: readonly Error[]): Promise<void> {
  expect(errors.map((error) => error.message)).toEqual([]);
}

async function expectNoViewportOverflow(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasOverflow).toBe(false);
}

async function openNetworkSelector(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }

  await page
    .getByRole("combobox", { name: /Browsing BSC Mainnet\. Change network/i })
    .click();
}

test("a visitor understands Sift and can search the mainnet catalogue", async ({
  page,
}) => {
  const errors = recordPageErrors(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /find the right ai agent for the job/i,
    }),
  ).toBeVisible();
  const search = page.getByRole("searchbox", {
    name: "What do you need an agent to do?",
  });
  await expect(search).toBeVisible();
  await search.fill("monitor my lending position");
  await page.getByRole("button", { name: "Search agents" }).click();

  await expect(page).toHaveURL(/\/discover\?q=monitor(?:\+|%20)my(?:\+|%20)lending/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Find the right agent for your task.",
    }),
  ).toBeVisible();
  await expect(page.getByText(/agents?(?: on this page)?$/i).first()).toBeVisible();
  await expectNoViewportOverflow(page);
  await expectNoPageErrors(errors);
});

test("all four required category routes return real mainnet results", async ({
  page,
}) => {
  const errors = recordPageErrors(page);

  for (const category of categories) {
    await page.goto(`/discover?category=${category}`);
    await expect(page.getByLabel("Agent directory status", { exact: true })).toContainText(
      "BSC Mainnet",
    );
    await expect(page.getByText(/agents?(?: on this page)?$/i).first()).toBeVisible();
    await expect(page.getByText("We couldn’t load the indexed catalogue")).toHaveCount(0);
  }

  await expectNoViewportOverflow(page);
  await expectNoPageErrors(errors);
});

test("a visitor can switch between isolated Testnet and Mainnet catalogues", async ({
  page,
  isMobile,
}) => {
  const errors = recordPageErrors(page);
  await page.goto("/discover");

  await openNetworkSelector(page, isMobile);
  await page.getByRole("option", { name: /BSC Testnet/i }).click();

  await expect(page).toHaveURL(/\/discover\?network=bsc-testnet/);
  await expect(page.getByLabel("Agent directory status", { exact: true })).toContainText(
    "BSC Testnet",
  );
  await expect(page.locator('a[href^="/agents/97/"]').first()).toBeVisible();

  await page
    .getByRole("combobox", { name: /Browsing BSC Testnet\. Change network/i })
    .click();
  await page.getByRole("option", { name: /BSC Mainnet/i }).click();

  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.getByLabel("Agent directory status", { exact: true })).toContainText(
    "BSC Mainnet",
  );
  await expect(page.locator('a[href^="/agents/56/"]').first()).toBeVisible();
  await expectNoViewportOverflow(page);
  await expectNoPageErrors(errors);
});

test("a real shortlisted agent opens and two real agents compare", async ({
  page,
}) => {
  const errors = recordPageErrors(page);
  await page.goto("/agents/56/326106");

  await expect(page.getByText("ERC-8004 #326106", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Agent profile" })).toBeVisible();

  await page.goto(
    "/compare?agent=56%3A326106&agent=56%3A322046&goal=compare+yield+capabilities",
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Evaluate agents against your task.",
    }),
  ).toBeVisible();
  await expect(page.getByText("2 selected agents", { exact: true })).toBeVisible();
  await expectNoViewportOverflow(page);
  await expectNoPageErrors(errors);
});

test("comparison controls preserve a valid shareable selection", async ({
  page,
}) => {
  const errors = recordPageErrors(page);
  await page.goto(
    "/compare?agent=56%3A326106&agent=56%3A322046&goal=compare+yield+capabilities",
  );

  await page.getByRole("button", { name: "Remove", exact: true }).first().click();
  await expect(page.getByText("1 selected agent", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/agent=56%3A322046/);
  await expect(page).not.toHaveURL(/agent=56%3A326106/);

  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(page).toHaveURL(/\/compare$/);
  await expect(
    page.getByRole("heading", { name: "Start with two real agents" }),
  ).toBeVisible();
  await expectNoViewportOverflow(page);
  await expectNoPageErrors(errors);
});

test("Available leads to a recently checked action route", async ({ page }) => {
  const errors = recordPageErrors(page);
  await page.goto("/discover?availability=ready");

  await expect(page.getByLabel("Remove Available filter")).toBeVisible();
  const action = page
    .getByRole("link", {
      name: /^(hire agent|send task|run tool|view paid access)$/i,
    })
    .first();
  await expect(action).toBeVisible();
  await action.click();
  await expect(page).toHaveURL(/\/(?:hire|start)\/56\/\d+$/);
  await expectNoViewportOverflow(page);
  await expectNoPageErrors(errors);
});

test("the disconnected dashboard explains the wallet boundary", async ({ page }) => {
  const errors = recordPageErrors(page);
  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Follow every job from payment to completion.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Connect your hiring wallet" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect wallet" }).last()).toBeVisible();
  await expectNoViewportOverflow(page);
  await expectNoPageErrors(errors);
});

test("navigation and primary search remain keyboard accessible", async ({
  page,
  isMobile,
}) => {
  const errors = recordPageErrors(page);
  await page.goto("/");

  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Close navigation" }).click();
  }

  const search = page.getByRole("searchbox", {
    name: "What do you need an agent to do?",
  });
  await search.focus();
  await expect(search).toBeFocused();
  await expectNoViewportOverflow(page);
  await expectNoPageErrors(errors);
});
