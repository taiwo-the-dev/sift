import { expect, test } from "@playwright/test";

test("the wallet chooser shows one option per announced wallet identity", async ({
  isMobile,
  page,
}) => {
  test.skip(
    isMobile,
    "Injected browser-extension wallets are not offered by RainbowKit on mobile.",
  );

  const duplicateKeyWarnings: string[] = [];

  page.on("console", (message) => {
    if (message.text().includes("children with the same key")) {
      duplicateKeyWarnings.push(message.text());
    }
  });

  await page.addInitScript(() => {
    const provider = {
      on() {
        return provider;
      },
      removeListener() {
        return provider;
      },
      async request({ method }: { method: string }) {
        if (method === "eth_chainId") {
          return "0x38";
        }

        return [];
      },
    };
    const icon =
      "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'></svg>";

    window.addEventListener("eip6963:requestProvider", () => {
      for (const uuid of [
        "00000000-0000-4000-8000-000000000001",
        "00000000-0000-4000-8000-000000000002",
      ]) {
        window.dispatchEvent(
          new CustomEvent("eip6963:announceProvider", {
            detail: {
              info: {
                icon,
                name: "Plug",
                rdns: "ooo.plugwallet",
                uuid,
              },
              provider,
            },
          }),
        );
      }
    });
  });

  await page.goto("/");

  await page
    .getByRole("button", { name: "Connect Wallet", exact: true })
    .last()
    .click();

  await expect(page.getByRole("button", { name: "Plug", exact: true })).toHaveCount(
    1,
  );
  expect(duplicateKeyWarnings).toEqual([]);
});
