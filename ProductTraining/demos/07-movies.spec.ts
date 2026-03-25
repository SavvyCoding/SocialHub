import { test } from "@playwright/test"
import { login, pause, scrollDown } from "./helpers"

test("Feature 07: Movies and Watchlist", async ({ page }) => {
  await login(page, "alice")
  await page.goto("/profile/alice/movies")
  await pause(page, 3)

  // Filter by Movies type
  const moviesFilter = page.getByRole("button", { name: /^movies$/i })
  if (await moviesFilter.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await moviesFilter.click()
    await pause(page, 2)
  }

  // Filter by TV Shows type
  const tvFilter = page.getByRole("button", { name: /tv shows/i })
  if (await tvFilter.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await tvFilter.click()
    await pause(page, 2)
  }

  // Back to All type
  const allType = page.getByRole("button", { name: /^all$/i }).first()
  if (await allType.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await allType.click()
    await pause(page, 1)
  }

  // Status tabs
  for (const status of ["Watching", "Want to Watch", "Watched", "Dropped"]) {
    const tab = page.getByRole("button", { name: new RegExp(`^${status}$`, "i") })
    if (await tab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await tab.click()
      await pause(page, 2)
    }
  }

  // Open add movie dialog
  const addBtn = page.getByRole("button", { name: /add a movie or show/i }).or(page.getByText(/add a movie or show/i))
  if (await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await addBtn.click()
    await pause(page, 2)

    const searchInput = page.getByPlaceholder(/search/i).first()
    if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await searchInput.type("Breaking Bad", { delay: 80 })
      await pause(page, 3)
    }
  }

  await pause(page, 2)
})
