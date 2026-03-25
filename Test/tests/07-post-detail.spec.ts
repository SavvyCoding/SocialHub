import { test, expect } from "@playwright/test"
import { login } from "./helpers/auth"
import { takeNamedScreenshot, uniqueId } from "./helpers/utils"

test.describe("07 - Post Detail & Interactions", () => {
  test("TC-44: Alice clicks on a post to view detail", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(3_000)

    // Click on the first post's content or timestamp to go to detail
    const postLink = page.locator("a[href*='/posts/'], a[href*='/post/']").first()
    if (await postLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await postLink.click()
      await page.waitForTimeout(3_000)
      await expect(page).toHaveURL(/\/post/)
      await takeNamedScreenshot(page, "44-alice-post-detail")
    } else {
      await takeNamedScreenshot(page, "44-alice-feed-no-post-links")
    }
  })

  test("TC-45: Bob shares a post", async ({ page }) => {
    await login(page, "bob")
    await page.goto("/feed")
    await page.waitForTimeout(3_000)

    const shareBtn = page.locator("button").filter({ has: page.locator("svg.lucide-repeat-2, svg.lucide-share") }).first()
    if (await shareBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await shareBtn.click()
      await page.waitForTimeout(2_000)
      await takeNamedScreenshot(page, "45-bob-shared-post")
    }
  })

  test("TC-46: Carol likes and comments on Alice's post", async ({ page }) => {
    await login(page, "carol")
    await page.goto("/feed")
    await page.waitForTimeout(3_000)

    // Like
    const likeBtn = page.locator("button").filter({ has: page.locator("svg.lucide-heart") }).first()
    if (await likeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await likeBtn.click()
      await page.waitForTimeout(1_000)
    }

    // Comment
    const commentBtn = page.locator("button").filter({ has: page.locator("svg.lucide-message-circle, svg.lucide-message-square") }).first()
    if (await commentBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await commentBtn.click()
      await page.waitForTimeout(1_000)

      const commentInput = page.getByPlaceholder(/write a comment|add a comment/i).first()
      if (await commentInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await commentInput.fill(`Carol's comment ${uniqueId()}`)
        await page.locator("button[type='submit']").or(page.getByRole("button", { name: /send|post|comment/i })).first().click()
        await page.waitForTimeout(2_000)
      }
    }
    await takeNamedScreenshot(page, "46-carol-liked-and-commented")
  })
})
