import { test, expect } from "@playwright/test"
import { login } from "./helpers/auth"
import { takeNamedScreenshot } from "./helpers/utils"

test.describe("09 - Movies & Watchlist", () => {
  // ── Alice's watchlist ──

  test("TC-57: Alice views My Watchlist page", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/movies")
    await expect(page.getByText(/my watchlist/i)).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(3_000)
    await takeNamedScreenshot(page, "57-alice-my-watchlist")
  })

  test("TC-58: Alice filters by Movies only", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/movies")
    await page.waitForTimeout(3_000)

    const moviesFilter = page.getByRole("button", { name: /^movies$/i })
    await expect(moviesFilter).toBeVisible({ timeout: 5_000 })
    await moviesFilter.click()
    await page.waitForTimeout(2_000)
    await takeNamedScreenshot(page, "58-alice-watchlist-movies-only")
  })

  test("TC-59: Alice filters by TV Shows only", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/movies")
    await page.waitForTimeout(3_000)

    const tvFilter = page.getByRole("button", { name: /tv shows/i })
    await expect(tvFilter).toBeVisible({ timeout: 5_000 })
    await tvFilter.click()
    await page.waitForTimeout(2_000)
    await takeNamedScreenshot(page, "59-alice-watchlist-tv-shows")
  })

  test("TC-60: Alice filters by Watching status", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/movies")
    await page.waitForTimeout(3_000)

    const watchingTab = page.getByRole("button", { name: /^watching$/i })
    if (await watchingTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await watchingTab.click()
      await page.waitForTimeout(2_000)
    }
    await takeNamedScreenshot(page, "60-alice-watchlist-watching")
  })

  test("TC-61: Alice filters by Want to Watch status", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/movies")
    await page.waitForTimeout(3_000)

    const wantTab = page.getByRole("button", { name: /want to watch/i })
    if (await wantTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await wantTab.click()
      await page.waitForTimeout(2_000)
    }
    await takeNamedScreenshot(page, "61-alice-watchlist-want-to-watch")
  })

  test("TC-62: Alice filters by Watched status", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/movies")
    await page.waitForTimeout(3_000)

    const watchedTab = page.getByRole("button", { name: /^watched$/i })
    if (await watchedTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await watchedTab.click()
      await page.waitForTimeout(2_000)
    }
    await takeNamedScreenshot(page, "62-alice-watchlist-watched")
  })

  test("TC-63: Alice filters by Dropped status", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/movies")
    await page.waitForTimeout(3_000)

    const droppedTab = page.getByRole("button", { name: /^dropped$/i })
    if (await droppedTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await droppedTab.click()
      await page.waitForTimeout(2_000)
    }
    await takeNamedScreenshot(page, "63-alice-watchlist-dropped")
  })

  test("TC-64: Alice opens Add a movie or show dialog", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/movies")
    await page.waitForTimeout(3_000)

    const addBtn = page.getByRole("button", { name: /add a movie or show/i }).or(page.getByText(/add a movie or show/i))
    await expect(addBtn).toBeVisible({ timeout: 5_000 })
    await addBtn.click()
    await page.waitForTimeout(1_000)
    await takeNamedScreenshot(page, "64-alice-add-movie-dialog")
  })

  test("TC-65: Alice searches for a movie in the Add dialog", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/movies")
    await page.waitForTimeout(3_000)

    const addBtn = page.getByRole("button", { name: /add a movie or show/i }).or(page.getByText(/add a movie or show/i))
    await addBtn.click()
    await page.waitForTimeout(1_000)

    const searchInput = page.getByPlaceholder(/search movies|search by title|search/i).first()
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill("Inception")
      await page.waitForTimeout(3_000)
      await takeNamedScreenshot(page, "65-alice-movie-search-results")
    } else {
      await takeNamedScreenshot(page, "65-alice-movie-add-no-search")
    }
  })

  // ── Cross-user viewing ──

  test("TC-66: Bob views Alice's watchlist (read-only)", async ({ page }) => {
    await login(page, "bob")
    await page.goto("/profile/alice/movies")
    await page.waitForTimeout(3_000)
    await expect(page.getByRole("main")).toBeVisible()
    await takeNamedScreenshot(page, "66-bob-views-alice-watchlist")
  })

  test("TC-67: Carol views her own watchlist", async ({ page }) => {
    await login(page, "carol")
    await page.goto("/profile/carol/movies")
    await page.waitForTimeout(3_000)
    await expect(page.getByRole("main")).toBeVisible()
    await takeNamedScreenshot(page, "67-carol-own-watchlist")
  })
})
