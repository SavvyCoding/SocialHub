import { test } from "@playwright/test"
import { login, pause, scrollDown } from "./helpers"

test("Feature 08: Places and Goals", async ({ page }) => {
  await login(page, "alice")

  // Show Places page
  await page.goto("/profile/alice/places")
  await pause(page, 4)

  // Open add place dialog
  const addPlaceBtn = page.getByRole("button", { name: /add a place/i })
  if (await addPlaceBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await addPlaceBtn.click()
    await pause(page, 2)

    // Cancel
    const cancelBtn = page.getByRole("button", { name: /cancel/i })
    if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await cancelBtn.click()
      await pause(page, 1)
    }
  }

  // Navigate to Goals page
  await page.goto("/profile/alice/goals")
  await pause(page, 3)
  await scrollDown(page, 300)

  // Filter by In Progress
  const inProgressTab = page.getByRole("button", { name: /in progress/i })
  if (await inProgressTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await inProgressTab.click()
    await pause(page, 2)
  }

  // Filter by Completed
  const completedTab = page.getByRole("button", { name: /^completed$/i }).first()
  if (await completedTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await completedTab.click()
    await pause(page, 2)
  }

  // Back to All
  const allTab = page.getByRole("button", { name: /^all$/i }).first()
  if (await allTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await allTab.click()
    await pause(page, 1)
  }

  // Add a new goal
  const addGoalBtn = page.getByRole("button", { name: /add a goal/i })
  if (await addGoalBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await addGoalBtn.click()
    await pause(page, 1.5)

    const titleInput = page.getByPlaceholder(/run a marathon|e.g\./i).or(page.locator("dialog input").first())
    if (await titleInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await titleInput.type("Complete the product training video", { delay: 60 })
      await pause(page, 1)
      await page.getByRole("button", { name: /add goal/i }).or(page.getByRole("button", { name: /save/i })).click()
      await pause(page, 2)
    }
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }))
  await pause(page, 2)
})
