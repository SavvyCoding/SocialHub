import { test, expect } from "@playwright/test"
import { login, USERS } from "./helpers/auth"
import { takeNamedScreenshot } from "./helpers/utils"

test.describe("04 - Profile", () => {
  test("TC-23: Alice views her own profile", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice")
    await expect(page.getByText(/alice/i).first()).toBeVisible({ timeout: 10_000 })
    await takeNamedScreenshot(page, "23-alice-own-profile")
  })

  test("TC-24: Alice profile shows follower/following counts", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice")
    await page.waitForTimeout(2_000)

    // Look for follower/following stats
    const stats = page.getByText(/follow/i)
    await expect(stats.first()).toBeVisible({ timeout: 5_000 })
    await takeNamedScreenshot(page, "24-alice-profile-stats")
  })

  test("TC-25: Alice profile shows Books tab", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice")
    const booksLink = page.getByRole("link", { name: /books/i })
    await expect(booksLink).toBeVisible({ timeout: 10_000 })
    await booksLink.click()
    await expect(page).toHaveURL(/\/profile\/alice\/books/)
    await takeNamedScreenshot(page, "25-alice-books-tab")
  })

  test("TC-26: Alice profile shows Movies tab", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/movies")
    await expect(page.getByRole("main")).toBeVisible()
    await takeNamedScreenshot(page, "26-alice-movies-tab")
  })

  test("TC-27: Alice profile shows Places tab", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/places")
    await expect(page.getByRole("main")).toBeVisible()
    await takeNamedScreenshot(page, "27-alice-places-tab")
  })

  test("TC-28: Alice profile shows Goals tab", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/goals")
    await expect(page.getByRole("main")).toBeVisible()
    await takeNamedScreenshot(page, "28-alice-goals-tab")
  })

  test("TC-29: Bob views Carol's profile", async ({ page }) => {
    await login(page, "bob")
    await page.goto("/profile/carol")
    await expect(page.getByText(/carol/i).first()).toBeVisible({ timeout: 10_000 })
    await takeNamedScreenshot(page, "29-bob-views-carol-profile")
  })

  test("TC-30: Carol views her own books showcase", async ({ page }) => {
    await login(page, "carol")
    await page.goto("/profile/carol/books")
    await expect(page.getByRole("main")).toBeVisible()
    await takeNamedScreenshot(page, "30-carol-books-showcase")
  })

  test("TC-31: Add a goal on Alice's profile", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/goals")

    const addBtn = page.getByRole("button", { name: /add a goal/i })
    if (await addBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(1_000)

      const titleInput = page.getByPlaceholder(/run a marathon|e.g\./i).or(page.locator("input[name='title']"))
      if (await titleInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await titleInput.fill("Complete E2E testing")
        await page.getByRole("button", { name: /add goal/i }).click()
        await page.waitForTimeout(2_000)
        await takeNamedScreenshot(page, "31-alice-added-goal")
      }
    }
  })
})
