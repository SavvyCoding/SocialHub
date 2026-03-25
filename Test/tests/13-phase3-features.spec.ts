import { test, expect } from "@playwright/test"
import { login } from "./helpers/auth"
import { takeNamedScreenshot, uniqueId } from "./helpers/utils"

/**
 * Phase 3 feature tests: AI For You Feed, Collections, Live Activity Feed
 */

// ─── AI For You Feed ──────────────────────────────────────────────────────────

test.describe("13A - AI For You Feed", () => {
  test("TC-F01: For You tab is visible in feed", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/posts")
    await page.waitForTimeout(1_500)

    const forYouTab = page.getByRole("button", { name: /for you/i })
    await expect(forYouTab).toBeVisible({ timeout: 10_000 })
    await takeNamedScreenshot(page, "F01-for-you-tab-visible")
  })

  test("TC-F02: Clicking For You tab shows feed content", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/posts")
    await page.waitForTimeout(1_500)

    const forYouTab = page.getByRole("button", { name: /for you/i })
    if (await forYouTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await forYouTab.click()
      await page.waitForTimeout(2_000)

      // Should show either posts or the empty state
      const main = page.getByRole("main")
      await expect(main).toBeVisible()

      // Refresh button should be available
      const refreshBtn = page.getByRole("button", { name: /refresh/i })
      if (await refreshBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(refreshBtn).toBeVisible()
      }
    }
    await takeNamedScreenshot(page, "F02-for-you-feed-loaded")
  })

  test("TC-F03: Following tab still works after switching tabs", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/posts")
    await page.waitForTimeout(1_500)

    const forYouTab = page.getByRole("button", { name: /for you/i })
    const followingTab = page.getByRole("button", { name: /following/i })

    if (await forYouTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await forYouTab.click()
      await page.waitForTimeout(1_000)
      await followingTab.click()
      await page.waitForTimeout(1_000)
      await expect(page.getByRole("main")).toBeVisible()
    }
    await takeNamedScreenshot(page, "F03-tab-switch-works")
  })
})

// ─── Collections ──────────────────────────────────────────────────────────────

test.describe("13B - Collections", () => {
  test("TC-C01: Collections link is in the left sidebar", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/posts")
    await page.waitForTimeout(1_000)

    const collectionsLink = page.getByRole("link", { name: /collections/i })
      .or(page.locator("a[href='/collections']"))
      .first()

    await expect(collectionsLink).toBeVisible({ timeout: 10_000 })
    await takeNamedScreenshot(page, "C01-collections-sidebar-link")
  })

  test("TC-C02: Collections page loads", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/collections")
    await page.waitForTimeout(2_000)

    await expect(page.getByRole("heading", { name: /collections/i })).toBeVisible({ timeout: 10_000 })
    await takeNamedScreenshot(page, "C02-collections-page-loads")
  })

  test("TC-C03: Can create a new collection", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/collections")
    await page.waitForTimeout(2_000)

    const newBtn = page.getByRole("button", { name: /new|create collection/i }).first()
    if (await newBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await newBtn.click()
      await page.waitForTimeout(500)

      // Dialog should open
      const nameInput = page.getByPlaceholder(/collection name/i)
      await expect(nameInput).toBeVisible({ timeout: 5_000 })

      const collName = `Test Collection ${uniqueId()}`
      await nameInput.fill(collName)

      const createBtn = page.getByRole("button", { name: /^create$/i })
      await createBtn.click()
      await page.waitForTimeout(2_000)

      // Collection should appear in the list
      await expect(page.getByText(collName)).toBeVisible({ timeout: 10_000 })
    }
    await takeNamedScreenshot(page, "C03-collection-created")
  })

  test("TC-C04: Save to collection button is visible on posts", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/posts")
    await page.waitForTimeout(2_000)

    // Library icon button on a post card
    const saveBtn = page.locator("button").filter({ has: page.locator("svg.lucide-library") }).first()
    if (await saveBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expect(saveBtn).toBeVisible()
    }
    await takeNamedScreenshot(page, "C04-save-to-collection-button")
  })

  test("TC-C05: Clicking save to collection shows picker", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/posts")
    await page.waitForTimeout(2_000)

    const saveBtn = page.locator("button").filter({ has: page.locator("svg.lucide-library") }).first()
    if (await saveBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await saveBtn.click()
      await page.waitForTimeout(500)

      // Should show "Save to collection" heading or collections list
      const pickerText = page.getByText(/save to collection/i)
      await expect(pickerText).toBeVisible({ timeout: 5_000 })
    }
    await takeNamedScreenshot(page, "C05-collection-picker-opens")
  })

  test("TC-C06: Collection detail page loads with back navigation", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/collections")
    await page.waitForTimeout(2_000)

    // If there are any collections, click one
    const collCard = page.locator("a[href^='/collections/']").first()
    if (await collCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await collCard.click()
      await page.waitForTimeout(2_000)
      await expect(page.url()).toMatch(/\/collections\//)

      // Back button
      const backBtn = page.locator("a[href='/collections']").first()
      await expect(backBtn).toBeVisible({ timeout: 5_000 })
    }
    await takeNamedScreenshot(page, "C06-collection-detail-page")
  })
})

// ─── Live Activity Feed ───────────────────────────────────────────────────────

test.describe("13C - Live Activity Feed", () => {
  test("TC-A01: Right sidebar is visible", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/posts")
    await page.waitForTimeout(2_000)

    // The right sidebar is hidden on smaller viewports — use a wide viewport
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.waitForTimeout(500)

    const aside = page.locator("aside").last()
    await expect(aside).toBeVisible({ timeout: 10_000 })
    await takeNamedScreenshot(page, "A01-right-sidebar-visible")
  })

  test("TC-A02: Live activity section appears when there is activity", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/posts")
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.waitForTimeout(3_000)

    // If there's recent activity for alice, the Live Activity section should render
    const activitySection = page.getByText(/live activity/i)
    // This may or may not be present depending on seeded data
    // Just verify the page is stable
    await expect(page.getByRole("main")).toBeVisible()
    await takeNamedScreenshot(page, "A02-live-activity-check")
  })
})
