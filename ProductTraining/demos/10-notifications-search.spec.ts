import { test } from "@playwright/test"
import { login, pause } from "./helpers"

test("Feature 10: Notifications and Search", async ({ page }) => {
  await login(page, "alice")

  // Show notifications
  await page.goto("/notifications")
  await pause(page, 4)

  // Navigate to search
  await page.goto("/search")
  await pause(page, 2)

  // Search for a user
  const searchInput = page.getByPlaceholder(/search/i).first().or(page.locator("input[type='search'], input[type='text']").first())
  if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await searchInput.type("carol", { delay: 100 })
    await searchInput.press("Enter")
    await pause(page, 3)

    // Clear and search by hashtag
    await searchInput.clear()
    await searchInput.type("coding", { delay: 100 })
    await searchInput.press("Enter")
    await pause(page, 3)
  }

  await pause(page, 2)
})
