import { test } from "@playwright/test"
import { login, pause, scrollDown } from "./helpers"

test("Feature 03: Post Interactions - Like, Comment, Bookmark, Share", async ({ page }) => {
  await login(page, "alice")
  await pause(page, 2)

  // Like a post
  const likeBtn = page.locator("button").filter({ has: page.locator("svg.lucide-heart") }).first()
  if (await likeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await likeBtn.click()
    await pause(page, 2)
  }

  // Comment on a post
  const commentBtn = page.locator("button").filter({ has: page.locator("svg.lucide-message-circle, svg.lucide-message-square") }).first()
  if (await commentBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await commentBtn.click()
    await pause(page, 1.5)

    const commentInput = page.getByPlaceholder(/comment/i).first().or(page.locator("input, textarea").last())
    if (await commentInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await commentInput.type("Great post! Really insightful.", { delay: 60 })
      await pause(page, 1)
      await commentInput.press("Enter")
      await pause(page, 2)
    }
  }

  // Bookmark a post
  const bookmarkBtn = page.locator("button").filter({ has: page.locator("svg.lucide-bookmark") }).first()
  if (await bookmarkBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await bookmarkBtn.click()
    await pause(page, 2)
  }

  // Share a post
  const shareBtn = page.locator("button").filter({ has: page.locator("svg.lucide-repeat-2, svg.lucide-share") }).first()
  if (await shareBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await shareBtn.click()
    await pause(page, 2)
  }

  // Visit bookmarks page
  await page.goto("/bookmarks")
  await pause(page, 3)
})
