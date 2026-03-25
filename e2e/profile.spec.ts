import { test, expect } from "@playwright/test"
import { loginAsAlice } from "./helpers/auth"

test.describe("Profile", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAlice(page)
  })

  test("navigate to own profile", async ({ page }) => {
    await page.goto("/profile/alice")
    await expect(page.getByText("alice")).toBeVisible()
  })

  test("profile shows books tab link", async ({ page }) => {
    await page.goto("/profile/alice")
    const booksLink = page.getByRole("link", { name: /books/i })
    await expect(booksLink).toBeVisible()
  })

  test("books page loads", async ({ page }) => {
    await page.goto("/profile/alice/books")
    // Should show BookShelf or "My Books" heading
    await expect(page.getByText(/books/i).first()).toBeVisible({ timeout: 8_000 })
  })

  test("movies page loads", async ({ page }) => {
    await page.goto("/profile/alice/movies")
    await expect(page.getByText(/watchlist|movies/i).first()).toBeVisible({ timeout: 8_000 })
  })

  test("places page loads", async ({ page }) => {
    await page.goto("/profile/alice/places")
    await expect(page.getByText(/places/i).first()).toBeVisible({ timeout: 8_000 })
  })

  test("goals page loads", async ({ page }) => {
    await page.goto("/profile/alice/goals")
    await expect(page.getByText(/goals/i).first()).toBeVisible({ timeout: 8_000 })
  })

  test("add a goal", async ({ page }) => {
    await page.goto("/profile/alice/goals")

    const addButton = page.getByRole("button", { name: /add a goal/i })
    await expect(addButton).toBeVisible({ timeout: 8_000 })
    await addButton.click()

    // Modal should open
    await expect(page.getByRole("heading", { name: /add a goal/i })).toBeVisible()

    // Fill form
    await page.getByPlaceholder(/run a marathon|e.g\./i).fill("Complete E2E test suite")
    await page.getByRole("button", { name: /add goal/i }).click()

    // Goal should appear
    await expect(page.getByText("Complete E2E test suite")).toBeVisible({ timeout: 5_000 })
  })

  test("add a place (without Mapbox)", async ({ page }) => {
    await page.goto("/profile/alice/places")

    const addButton = page.getByRole("button", { name: /add a place/i })
    await expect(addButton).toBeVisible({ timeout: 8_000 })
    await addButton.click()

    await expect(page.getByRole("heading", { name: /add a place/i })).toBeVisible()

    // Cancel button should work
    await page.getByRole("button", { name: /cancel/i }).click()
    await expect(page.getByRole("heading", { name: /add a place/i })).not.toBeVisible()
  })
})
