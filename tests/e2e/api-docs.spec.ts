import { expect, test } from "@playwright/test";

test("API documentation is readable and the public contract is reachable", async ({
  page,
}) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/docs");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Build with Sift agent data.",
    }),
  ).toBeVisible();
  await expect(page.getByText("API v1", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "How the Sift Score works" }),
  ).toBeVisible();
  await expect(page.getByText("Service reliability", { exact: true })).toBeVisible();
  await expect(page.getByText("Task history", { exact: true })).toBeVisible();

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasOverflow).toBe(false);
  expect(pageErrors.map((error) => error.message)).toEqual([]);

  const categories = await page.request.get("/api/v1/categories");
  expect(categories.status()).toBe(200);
  expect(categories.headers()["access-control-allow-origin"]).toBe("*");
  const payload = await categories.json();
  expect(payload.meta.apiVersion).toBe("v1");
  expect(payload.data).toHaveLength(4);
});
