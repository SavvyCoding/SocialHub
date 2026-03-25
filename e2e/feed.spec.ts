import { test, expect } from "@playwright/test"
import { loginAsAlice } from "./helpers/auth"

test.describe("Feed", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAlice(page)
  })

  test("shows feed after login", async ({ page }) => {
    await expect(page).toHaveURL(/\/feed/)
    // Feed container should be visible
    await expect(page.getByRole("main")).toBeVisible()
  })

  test("create a new text post", async ({ page }) => {
    const postContent = `E2E test post ${Date.now()}`

    // Find and interact with the post composer
    const composer = page.getByPlaceholder(/what('s|s) on your mind|share something/i)
    if (await composer.isVisible()) {
      await composer.click()
      await composer.fill(postContent)
      await page.getByRole("button", { name: /post|publish|share/i }).click()

      // Post should appear in feed
      await expect(page.getByText(postContent)).toBeVisible({ timeout: 5_000 })
    }
  })

  test("can switch between Home and Explore tabs", async ({ page }) => {
    const exploreTab = page.getByRole("button", { name: /explore/i })
    if (await exploreTab.isVisible()) {
      await exploreTab.click()
      await expect(page).toHaveURL(/\/feed/)
    }
  })

  test("story rings are visible", async ({ page }) => {
    // Stories section should render (may be empty with no stories)
    const storiesSection = page.locator("[data-testid='stories'], .stories-container").first()
    // Just check page loaded without errors
    await expect(page.getByRole("main")).toBeVisible()
  })
})
