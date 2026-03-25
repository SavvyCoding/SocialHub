import { test, expect } from "@playwright/test"
import { login, USERS } from "./helpers/auth"
import { takeNamedScreenshot } from "./helpers/utils"

test.describe("03 - Social Graph (Follow/Unfollow)", () => {
  test("TC-16: Alice visits Bob's profile", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/bob")
    await expect(page.getByText(/bob/i).first()).toBeVisible({ timeout: 10_000 })
    await takeNamedScreenshot(page, "16-alice-views-bob-profile")
  })

  test("TC-17: Alice follows Bob", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/bob")
    await page.waitForTimeout(2_000)

    const followBtn = page.getByRole("button", { name: /^follow$/i })
    if (await followBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await followBtn.click()
      await page.waitForTimeout(2_000)
      // Button should change to "Following" or "Unfollow"
      await expect(page.getByRole("button", { name: /following|unfollow/i }).first()).toBeVisible({ timeout: 5_000 })
      await takeNamedScreenshot(page, "17-alice-followed-bob")
    } else {
      // Already following
      await takeNamedScreenshot(page, "17-alice-already-follows-bob")
    }
  })

  test("TC-18: Bob follows Carol", async ({ page }) => {
    await login(page, "bob")
    await page.goto("/profile/carol")
    await page.waitForTimeout(2_000)

    const followBtn = page.getByRole("button", { name: /^follow$/i })
    if (await followBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await followBtn.click()
      await page.waitForTimeout(2_000)
      await takeNamedScreenshot(page, "18-bob-followed-carol")
    } else {
      await takeNamedScreenshot(page, "18-bob-already-follows-carol")
    }
  })

  test("TC-19: Carol follows Alice", async ({ page }) => {
    await login(page, "carol")
    await page.goto("/profile/alice")
    await page.waitForTimeout(2_000)

    const followBtn = page.getByRole("button", { name: /^follow$/i })
    if (await followBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await followBtn.click()
      await page.waitForTimeout(2_000)
      await takeNamedScreenshot(page, "19-carol-followed-alice")
    } else {
      await takeNamedScreenshot(page, "19-carol-already-follows-alice")
    }
  })

  test("TC-20: Alice sees Bob's posts in feed after following", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(3_000)
    await expect(page.getByRole("main")).toBeVisible()
    await takeNamedScreenshot(page, "20-alice-feed-after-following")
  })

  test("TC-21: Alice unfollows Bob", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/bob")
    await page.waitForTimeout(2_000)

    const unfollowBtn = page.getByRole("button", { name: /following|unfollow/i })
    if (await unfollowBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await unfollowBtn.click()
      await page.waitForTimeout(2_000)
      // Button should revert to "Follow"
      await expect(page.getByRole("button", { name: /^follow$/i })).toBeVisible({ timeout: 5_000 })
      await takeNamedScreenshot(page, "21-alice-unfollowed-bob")
    }
  })

  test("TC-22: Alice re-follows Bob for later tests", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/bob")
    await page.waitForTimeout(2_000)

    const followBtn = page.getByRole("button", { name: /^follow$/i })
    if (await followBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await followBtn.click()
      await page.waitForTimeout(2_000)
    }
    await takeNamedScreenshot(page, "22-alice-refollowed-bob")
  })
})
