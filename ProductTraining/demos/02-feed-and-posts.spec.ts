import { test } from "@playwright/test"
import { login, pause, scrollDown } from "./helpers"

test("Feature 02: Feed and Creating Posts", async ({ page }) => {
  await login(page, "alice")

  // Show the home feed
  await pause(page, 3)

  // Scroll through feed
  await scrollDown(page, 300)
  await scrollDown(page, 300)

  // Click Tweet button to compose
  const tweetBtn = page.getByRole("button", { name: /tweet/i }).or(page.getByRole("link", { name: /tweet/i }))
  await tweetBtn.click()
  await pause(page, 2)

  // Type a post
  const textarea = page.locator("textarea").first()
  await textarea.type("Just shipped a new feature! Loving the development process. #coding #productivity", { delay: 50 })
  await pause(page, 2)

  // Submit
  await page.getByRole("button", { name: /post|publish|tweet/i }).last().click()
  await pause(page, 3)

  // Show explore tab
  const exploreTab = page.getByRole("button", { name: /explore/i }).or(page.getByRole("tab", { name: /explore/i }))
  if (await exploreTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await exploreTab.click()
    await pause(page, 3)
  }
})
