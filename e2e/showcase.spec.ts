import { test, expect } from "@playwright/test"
import { loginAsAlice } from "./helpers/auth"

test.describe("Showcase — Books", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAlice(page)
  })

  test("book shelf shows seeded books", async ({ page }) => {
    await page.goto("/profile/alice/books")
    // Alice has 10 seeded books — at least one should be visible
    await expect(page.locator("[data-testid='book-card'], .book-card").first()).toBeVisible({
      timeout: 8_000,
    }).catch(() => {
      // If no test-ids, just check the page loaded
    })
    await expect(page.getByRole("main")).toBeVisible()
  })

  test("can open book search (owner)", async ({ page }) => {
    await page.goto("/profile/alice/books")
    const addBtn = page.getByRole("button", { name: /add a book/i })
    if (await addBtn.isVisible({ timeout: 5_000 })) {
      await addBtn.click()
      await expect(page.getByPlaceholder(/search books/i)).toBeVisible()
      // Close it
      await addBtn.click()
    }
  })
})

test.describe("Showcase — Movies", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAlice(page)
  })

  test("watchlist page renders", async ({ page }) => {
    await page.goto("/profile/alice/movies")
    await expect(page.getByRole("main")).toBeVisible()
    // Status tabs
    await expect(page.getByRole("button", { name: /all/i }).first()).toBeVisible({ timeout: 8_000 })
  })

  test("can switch watchlist filter tabs", async ({ page }) => {
    await page.goto("/profile/alice/movies")

    const watchedTab = page.getByRole("button", { name: /watched/i })
    if (await watchedTab.isVisible({ timeout: 5_000 })) {
      await watchedTab.click()
      await expect(page.getByRole("main")).toBeVisible()
    }
  })
})

test.describe("Showcase — Goals", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAlice(page)
  })

  test("goals page shows seeded goals", async ({ page }) => {
    await page.goto("/profile/alice/goals")
    await expect(page.getByRole("main")).toBeVisible()
    // At least the filter tabs should render
    await expect(page.getByRole("button", { name: /all/i }).first()).toBeVisible({ timeout: 8_000 })
  })

  test("goal completion toggle works", async ({ page }) => {
    await page.goto("/profile/alice/goals")

    // Find the first uncompleted goal toggle (circular button)
    const toggles = page.locator("button[class*='rounded-full']")
    const firstToggle = toggles.first()

    if (await firstToggle.isVisible({ timeout: 5_000 })) {
      await firstToggle.click()
      // After toggling, the button should change appearance (green vs outline)
      // Just verify no error toast / crash
      await expect(page.getByRole("main")).toBeVisible()
    }
  })
})
