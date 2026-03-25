import { test } from "@playwright/test"
import { login, pause } from "./helpers"

test("Feature 04: Follow, Unfollow, and Social Connections", async ({ page }) => {
  // Alice follows Bob
  await login(page, "alice")
  await page.goto("/profile/bob")
  await pause(page, 3)

  const followBtn = page.getByRole("button", { name: /^follow$/i })
  if (await followBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await followBtn.click()
    await pause(page, 2)
  }

  // View Bob's profile details
  await pause(page, 2)

  // Navigate to Carol's profile
  await page.goto("/profile/carol")
  await pause(page, 3)

  // Now login as Bob and follow Carol
  await page.context().clearCookies()
  await login(page, "bob")
  await page.goto("/profile/carol")
  await pause(page, 2)

  const followBtn2 = page.getByRole("button", { name: /^follow$/i })
  if (await followBtn2.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await followBtn2.click()
    await pause(page, 2)
  }

  // Show Bob's feed now includes Carol's posts
  await page.goto("/feed")
  await pause(page, 3)
})
