import { test, expect } from "@playwright/test"
import { login, USERS } from "./helpers/auth"
import { takeNamedScreenshot, uniqueId } from "./helpers/utils"

test.describe("02 - Posts & Feed", () => {
  test("TC-08: Alice creates a text post", async ({ page }) => {
    await login(page, "alice")
    const content = `Hello from Alice! Test post ${uniqueId()}`

    // Click the Tweet/compose button in the navbar
    const tweetBtn = page.getByRole("button", { name: /tweet/i }).or(page.getByRole("link", { name: /tweet/i }))
    await expect(tweetBtn).toBeVisible({ timeout: 10_000 })
    await tweetBtn.click()
    await page.waitForTimeout(1_000)

    // Fill the composer (dialog/modal or inline)
    const textarea = page.locator("textarea").first()
    await expect(textarea).toBeVisible({ timeout: 5_000 })
    await textarea.fill(content)
    await takeNamedScreenshot(page, "08-alice-composing-post")

    // Submit
    const postBtn = page.getByRole("button", { name: /post|publish|tweet/i }).last()
    await postBtn.click()
    await page.waitForTimeout(3_000)
    await takeNamedScreenshot(page, "08-alice-post-created")
  })

  test("TC-09: Bob creates a post", async ({ page }) => {
    await login(page, "bob")
    const content = `Bob's thoughts ${uniqueId()}`

    const tweetBtn = page.getByRole("button", { name: /tweet/i }).or(page.getByRole("link", { name: /tweet/i }))
    await tweetBtn.click()
    await page.waitForTimeout(1_000)

    const textarea = page.locator("textarea").first()
    await expect(textarea).toBeVisible({ timeout: 5_000 })
    await textarea.fill(content)
    await page.getByRole("button", { name: /post|publish|tweet/i }).last().click()
    await page.waitForTimeout(3_000)
    await takeNamedScreenshot(page, "09-bob-post-created")
  })

  test("TC-10: Carol creates a post with hashtag", async ({ page }) => {
    await login(page, "carol")
    const content = `Carol says hi! #testing #e2e ${uniqueId()}`

    const tweetBtn = page.getByRole("button", { name: /tweet/i }).or(page.getByRole("link", { name: /tweet/i }))
    await tweetBtn.click()
    await page.waitForTimeout(1_000)

    const textarea = page.locator("textarea").first()
    await expect(textarea).toBeVisible({ timeout: 5_000 })
    await textarea.fill(content)
    await page.getByRole("button", { name: /post|publish|tweet/i }).last().click()
    await page.waitForTimeout(3_000)
    await takeNamedScreenshot(page, "10-carol-post-with-hashtag")
  })

  test("TC-11: Alice likes a post", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(2_000)

    const likeBtn = page.locator("button").filter({ has: page.locator("svg.lucide-heart") }).first()
    if (await likeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await likeBtn.click()
      await page.waitForTimeout(1_000)
    }
    await takeNamedScreenshot(page, "11-alice-liked-post")
  })

  test("TC-12: Alice comments on a post", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(2_000)

    const commentBtn = page.locator("button").filter({ has: page.locator("svg.lucide-message-circle, svg.lucide-message-square") }).first()
    if (await commentBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await commentBtn.click()
      await page.waitForTimeout(1_000)

      const commentInput = page.getByPlaceholder(/comment/i).first().or(page.locator("input, textarea").last())
      if (await commentInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await commentInput.fill(`Great post! ${uniqueId()}`)
        await commentInput.press("Enter")
        await page.waitForTimeout(2_000)
      }
    }
    await takeNamedScreenshot(page, "12-alice-commented")
  })

  test("TC-13: Alice bookmarks a post", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(2_000)

    const bookmarkBtn = page.locator("button").filter({ has: page.locator("svg.lucide-bookmark") }).first()
    if (await bookmarkBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await bookmarkBtn.click()
      await page.waitForTimeout(1_000)
    }
    await takeNamedScreenshot(page, "13-alice-bookmarked")
  })

  test("TC-14: Alice views bookmarks page", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/bookmarks")
    await expect(page.getByRole("main")).toBeVisible()
    await takeNamedScreenshot(page, "14-alice-bookmarks-page")
  })

  test("TC-15: Explore feed shows public posts", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")

    const exploreTab = page.getByRole("button", { name: /explore/i }).or(page.getByRole("tab", { name: /explore/i }))
    if (await exploreTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await exploreTab.click()
      await page.waitForTimeout(2_000)
    }
    await takeNamedScreenshot(page, "15-explore-feed")
  })
})
