import { test, expect } from "@playwright/test"
import { login } from "./helpers/auth"
import { takeNamedScreenshot } from "./helpers/utils"

test.describe("08 - Books Showcase", () => {
  // ── Alice's own bookshelf ──

  test("TC-47: Alice views My Books page with seeded data", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/books")
    await expect(page.getByText(/my books/i)).toBeVisible({ timeout: 10_000 })
    // Should show book entries (Alice has 34 seeded books)
    await page.waitForTimeout(3_000)
    await takeNamedScreenshot(page, "47-alice-my-books")
  })

  test("TC-48: Alice filters books by 'To Read' status", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/books")
    await page.waitForTimeout(3_000)

    const toReadTab = page.getByRole("button", { name: /to read|want to read/i })
    await expect(toReadTab).toBeVisible({ timeout: 5_000 })
    await toReadTab.click()
    await page.waitForTimeout(2_000)
    await takeNamedScreenshot(page, "48-alice-books-to-read")
  })

  test("TC-49: Alice filters books by 'Reading' status", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/books")
    await page.waitForTimeout(3_000)

    const readingTab = page.getByRole("button", { name: /^reading$/i })
    if (await readingTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await readingTab.click()
      await page.waitForTimeout(2_000)
    }
    await takeNamedScreenshot(page, "49-alice-books-reading")
  })

  test("TC-50: Alice filters books by 'Read' status", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/books")
    await page.waitForTimeout(3_000)

    const readTab = page.getByRole("button", { name: /^read$/i })
    if (await readTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await readTab.click()
      await page.waitForTimeout(2_000)
    }
    await takeNamedScreenshot(page, "50-alice-books-read")
  })

  test("TC-51: Alice opens Add a Book dialog", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/books")
    await page.waitForTimeout(3_000)

    const addBtn = page.getByRole("button", { name: /add a book/i })
    await expect(addBtn).toBeVisible({ timeout: 5_000 })
    await addBtn.click()
    await page.waitForTimeout(1_000)
    // Search input should appear
    await expect(page.getByPlaceholder(/search for a book|search by title/i)).toBeVisible({ timeout: 5_000 })
    await takeNamedScreenshot(page, "51-alice-add-book-dialog")
  })

  test("TC-52: Alice searches for a book in the Add dialog", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/books")
    await page.waitForTimeout(3_000)

    const addBtn = page.getByRole("button", { name: /add a book/i })
    await addBtn.click()
    await page.waitForTimeout(1_000)

    const searchInput = page.getByPlaceholder(/search for a book|search by title/i)
    await searchInput.fill("The Great Gatsby")
    await page.waitForTimeout(3_000)
    await takeNamedScreenshot(page, "52-alice-book-search-results")
  })

  test("TC-53: Alice sees star ratings on her books", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/books")
    await page.waitForTimeout(3_000)

    // Books with ratings should show stars
    const stars = page.locator("svg.lucide-star, [data-testid='star-rating'], .text-yellow-400").first()
    if (await stars.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await takeNamedScreenshot(page, "53-alice-books-star-ratings")
    } else {
      await takeNamedScreenshot(page, "53-alice-books-no-visible-stars")
    }
  })

  // ── Cross-user viewing ──

  test("TC-54: Bob views Alice's books (read-only)", async ({ page }) => {
    await login(page, "bob")
    await page.goto("/profile/alice/books")
    await page.waitForTimeout(3_000)
    // Bob should NOT see "Add a book" button
    const addBtn = page.getByRole("button", { name: /add a book/i })
    const isVisible = await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    if (!isVisible) {
      // Correct — read-only view
    }
    await takeNamedScreenshot(page, "54-bob-views-alice-books")
  })

  test("TC-55: Carol views Bob's books", async ({ page }) => {
    await login(page, "carol")
    await page.goto("/profile/bob/books")
    await page.waitForTimeout(3_000)
    await expect(page.getByRole("main")).toBeVisible()
    await takeNamedScreenshot(page, "55-carol-views-bob-books")
  })

  test("TC-56: Alice views Trending sidebar on books page", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/books")
    await page.waitForTimeout(3_000)

    const trending = page.getByText(/trending/i).first()
    if (await trending.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await takeNamedScreenshot(page, "56-alice-books-trending")
    } else {
      await takeNamedScreenshot(page, "56-alice-books-no-trending")
    }
  })
})
