import { expect, test } from "@playwright/test";

test("Sift Score exposes the six additive criteria", async ({ page }) => {
  await page.goto("/discover?sort=rating-desc");

  const explanation = page
    .getByRole("button", { name: "How the Sift Score is calculated" })
    .first();
  await explanation.focus();

  await expect(page.getByText("Sift Score criteria", { exact: true })).toBeVisible();
  await expect(page.getByText("Service reliability", { exact: true })).toBeVisible();
  await expect(page.getByText("Service availability", { exact: true })).toBeVisible();
  await expect(page.getByText("Task history", { exact: true })).toBeVisible();
  await expect(page.getByText("Reputation", { exact: true })).toBeVisible();
  await expect(page.getByText("Service information", { exact: true })).toBeVisible();
  await expect(page.getByText("Profile integrity", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/six earned point values are added/i),
  ).toBeVisible();
});
