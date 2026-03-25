import { test, expect } from "@playwright/test"
import { login } from "./helpers/auth"
import { takeNamedScreenshot, uniqueId } from "./helpers/utils"

test.describe("11 - Goals Showcase", () => {
  // ── Alice's goals ──

  test("TC-75: Alice views My Goals page with counts", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/goals")
    await expect(page.getByText(/my goals/i)).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(3_000)
    // Should show goal count
    await expect(page.getByText(/goals/i).first()).toBeVisible()
    await takeNamedScreenshot(page, "75-alice-my-goals")
  })

  test("TC-76: Alice filters goals by All", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/goals")
    await page.waitForTimeout(3_000)

    const allTab = page.getByRole("button", { name: /^all$/i }).first()
    if (await allTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await allTab.click()
      await page.waitForTimeout(1_000)
    }
    await takeNamedScreenshot(page, "76-alice-goals-all")
  })

  test("TC-77: Alice filters goals by In Progress", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/goals")
    await page.waitForTimeout(3_000)

    const inProgressTab = page.getByRole("button", { name: /in progress/i })
    if (await inProgressTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await inProgressTab.click()
      await page.waitForTimeout(2_000)
    }
    await takeNamedScreenshot(page, "77-alice-goals-in-progress")
  })

  test("TC-78: Alice filters goals by Completed", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/goals")
    await page.waitForTimeout(3_000)

    const completedTab = page.getByRole("button", { name: /^completed$/i }).first()
    if (await completedTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await completedTab.click()
      await page.waitForTimeout(2_000)
    }
    await takeNamedScreenshot(page, "78-alice-goals-completed")
  })

  test("TC-79: Alice adds a new goal", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/goals")
    await page.waitForTimeout(3_000)

    const addBtn = page.getByRole("button", { name: /add a goal/i })
    await expect(addBtn).toBeVisible({ timeout: 5_000 })
    await addBtn.click()
    await page.waitForTimeout(1_000)

    // Fill the goal form
    const titleInput = page.getByPlaceholder(/run a marathon|e.g\./i).or(page.locator("input[name='title']")).or(page.locator("dialog input").first())
    await expect(titleInput).toBeVisible({ timeout: 3_000 })
    await titleInput.fill(`Learn Playwright testing ${uniqueId()}`)

    // Optional: fill description if available
    const descInput = page.getByPlaceholder(/description/i).or(page.locator("textarea").first())
    if (await descInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await descInput.fill("Master E2E testing with Playwright")
    }

    await takeNamedScreenshot(page, "79-alice-adding-goal-form")

    // Submit
    const submitBtn = page.getByRole("button", { name: /add goal/i }).or(page.getByRole("button", { name: /save/i }))
    await submitBtn.click()
    await page.waitForTimeout(2_000)
    await takeNamedScreenshot(page, "79-alice-goal-added")
  })

  test("TC-80: Alice toggles a goal completion", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/goals")
    await page.waitForTimeout(3_000)

    // Find the first goal's completion toggle (circle button)
    const toggles = page.locator("button[class*='rounded-full'], button:has(svg.lucide-circle), button:has(svg.lucide-check-circle)")
    const firstToggle = toggles.first()

    if (await firstToggle.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await takeNamedScreenshot(page, "80-alice-goal-before-toggle")
      await firstToggle.click()
      await page.waitForTimeout(2_000)
      await takeNamedScreenshot(page, "80-alice-goal-after-toggle")
    } else {
      await takeNamedScreenshot(page, "80-alice-goals-no-toggles")
    }
  })

  test("TC-81: Alice sees goal categories", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/goals")
    await page.waitForTimeout(3_000)

    // Categories like CAREER, HEALTH, etc. should appear
    const category = page.getByText(/career|health|personal|fitness|education|finance/i).first()
    if (await category.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await takeNamedScreenshot(page, "81-alice-goals-categories")
    } else {
      await takeNamedScreenshot(page, "81-alice-goals-no-categories")
    }
  })

  // ── Cross-user viewing ──

  test("TC-82: Bob views Alice's goals (read-only)", async ({ page }) => {
    await login(page, "bob")
    await page.goto("/profile/alice/goals")
    await page.waitForTimeout(3_000)
    await expect(page.getByRole("main")).toBeVisible()
    const addBtn = page.getByRole("button", { name: /add a goal/i })
    const visible = await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    await takeNamedScreenshot(page, visible ? "82-bob-alice-goals-has-add" : "82-bob-alice-goals-readonly")
  })

  test("TC-83: Carol views her own goals", async ({ page }) => {
    await login(page, "carol")
    await page.goto("/profile/carol/goals")
    await page.waitForTimeout(3_000)
    await expect(page.getByRole("main")).toBeVisible()
    await takeNamedScreenshot(page, "83-carol-own-goals")
  })

  test("TC-84: Bob views his own goals and adds one", async ({ page }) => {
    await login(page, "bob")
    await page.goto("/profile/bob/goals")
    await page.waitForTimeout(3_000)

    const addBtn = page.getByRole("button", { name: /add a goal/i })
    if (await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(1_000)

      const titleInput = page.getByPlaceholder(/run a marathon|e.g\./i).or(page.locator("input[name='title']")).or(page.locator("dialog input").first())
      if (await titleInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await titleInput.fill(`Bob's goal: Ship new feature ${uniqueId()}`)
        await page.getByRole("button", { name: /add goal/i }).or(page.getByRole("button", { name: /save/i })).click()
        await page.waitForTimeout(2_000)
      }
    }
    await takeNamedScreenshot(page, "84-bob-added-goal")
  })
})
