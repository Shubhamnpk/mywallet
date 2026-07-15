import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("loads and renders the app shell", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    const title = await page.title();
    expect(title).not.toBe("");
  });

  test("responds with 200", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });
});
