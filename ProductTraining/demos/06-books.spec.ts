import { test } from "@playwright/test"
import { login, pause, scrollDown } from "./helpers"

test("Feature 06: Books Showcase", async ({ page }) => {
  await login(page, "alice")
  await page.goto("/profile/alice/books")
  await pause(page, 3)

  // Scroll through book collection
  await scrollDown(page, 400)
  await scrollDown(page, 400)

  // Scroll back up
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }))
  await pause(page, 2)

  // Filter by Reading
  const readingTab = page.getByRole("button", { name: /reading/i }).first()
  if (await readingTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await readingTab.click()
    await pause(page, 2)
  }

  // Filter by Want to Read
  const toReadTab = page.getByRole("button", { name: /want to read/i })
  if (await toReadTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await toReadTab.click()
    await pause(page, 2)
  }

  // Filter by Read
  const readTab = page.getByRole("button", { name: /^read/i }).first()
  if (await readTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await readTab.click()
    await pause(page, 2)
  }

  // Open add book search
  const addBtn = page.getByRole("button", { name: /add a book/i })
  if (await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await addBtn.click()
    await pause(page, 1.5)

    const searchInput = page.getByPlaceholder(/search for a book/i)
    if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await searchInput.type("Atomic Habits", { delay: 80 })
      await pause(page, 3)
    }

    // Close search
    const closeBtn = page.getByRole("button", { name: /close search/i })
    if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await closeBtn.click()
      await pause(page, 1)
    }
  }

  // Show all books again
  const allTab = page.getByRole("button", { name: /^all/i }).first()
  if (await allTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await allTab.click()
    await pause(page, 2)
  }
})
