import { test } from "@playwright/test"
import { login, pause, scrollDown } from "./helpers"

test("Feature 05: User Profile and Showcase Tabs", async ({ page }) => {
  await login(page, "alice")

  // Visit own profile
  await page.goto("/profile/alice")
  await pause(page, 3)
  await scrollDown(page, 300)

  // Click through each tab
  const booksLink = page.getByRole("link", { name: /books/i })
  if (await booksLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await booksLink.click()
    await pause(page, 2)
  }

  await page.goto("/profile/alice")
  await pause(page, 1)
  const moviesLink = page.getByRole("link", { name: /movies|watchlist/i })
  if (await moviesLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await moviesLink.click()
    await pause(page, 2)
  }

  await page.goto("/profile/alice")
  await pause(page, 1)
  const placesLink = page.getByRole("link", { name: /places/i })
  if (await placesLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await placesLink.click()
    await pause(page, 2)
  }

  await page.goto("/profile/alice")
  await pause(page, 1)
  const goalsLink = page.getByRole("link", { name: /goals/i })
  if (await goalsLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await goalsLink.click()
    await pause(page, 2)
  }

  // View another user's profile
  await page.goto("/profile/bob")
  await pause(page, 3)
})
