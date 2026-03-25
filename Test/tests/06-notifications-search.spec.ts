import { test, expect } from "@playwright/test"
import { login, USERS } from "./helpers/auth"
import { takeNamedScreenshot } from "./helpers/utils"

test.describe("06 - Notifications", () => {
  test("TC-38: Alice opens notifications page", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/notifications")
    await expect(page.getByRole("main")).toBeVisible()
    await takeNamedScreenshot(page, "38-alice-notifications")
  })

  test("TC-39: Bob checks notifications (follow from Alice)", async ({ page }) => {
    await login(page, "bob")
    await page.goto("/notifications")
    await expect(page.getByRole("main")).toBeVisible()
    await page.waitForTimeout(2_000)
    await takeNamedScreenshot(page, "39-bob-notifications")
  })

  test("TC-40: Carol checks notifications", async ({ page }) => {
    await login(page, "carol")
    await page.goto("/notifications")
    await expect(page.getByRole("main")).toBeVisible()
    await page.waitForTimeout(2_000)
    await takeNamedScreenshot(page, "40-carol-notifications")
  })
})

test.describe("06 - Search", () => {
  test("TC-41: Alice opens search page", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/search")
    await expect(page.getByRole("main")).toBeVisible()
    await takeNamedScreenshot(page, "41-search-page")
  })

  test("TC-42: Alice searches for Bob", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/search")
    await page.waitForTimeout(2_000)

    const searchInput = page.getByPlaceholder(/search/i).first().or(page.locator("input[type='search'], input[type='text']").first())
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill("bob")
      await searchInput.press("Enter")
      await page.waitForTimeout(3_000)
      await takeNamedScreenshot(page, "42-alice-searched-bob")
    }
  })

  test("TC-43: Alice searches for a hashtag", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/search")
    await page.waitForTimeout(2_000)

    const searchInput = page.getByPlaceholder(/search/i).first().or(page.locator("input[type='search'], input[type='text']").first())
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill("testing")
      await searchInput.press("Enter")
      await page.waitForTimeout(3_000)
      await takeNamedScreenshot(page, "43-alice-searched-hashtag")
    }
  })
})
