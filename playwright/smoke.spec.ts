import { expect, test } from "@playwright/test";

test("results site home loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/galaxy-brain/i);
});
