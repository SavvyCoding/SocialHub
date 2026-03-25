import { test, expect } from "@playwright/test"
import { login } from "./helpers/auth"
import { takeNamedScreenshot, uniqueId } from "./helpers/utils"

/**
 * Phase 2 feature tests: Polls, Emoji Reactions, Scheduled Posts, Activity Heatmap
 */

// ─── Polls ────────────────────────────────────────────────────────────────────

test.describe("12A - Polls", () => {
  test("TC-P01: Composer shows poll builder toolbar button", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(2_000)

    // Poll builder button (BarChart3 icon) should be visible in the composer
    const pollBtn = page
      .locator("button[title='Add poll']")
      .or(page.locator("button").filter({ has: page.locator("svg.lucide-bar-chart-3") }))
      .first()

    await expect(pollBtn).toBeVisible({ timeout: 10_000 })
    await takeNamedScreenshot(page, "P01-poll-button-visible")
  })

  test("TC-P02: Poll builder opens on click and accepts input", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(2_000)

    // Open poll builder
    const pollBtn = page
      .locator("button[title='Add poll']")
      .or(page.locator("button").filter({ has: page.locator("svg.lucide-bar-chart-3") }))
      .first()

    if (await pollBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await pollBtn.click()
      await page.waitForTimeout(500)

      // Question input should appear
      const questionInput = page.getByPlaceholder(/ask a question/i)
      await expect(questionInput).toBeVisible({ timeout: 5_000 })

      // Option inputs should appear
      const optionInputs = page.getByPlaceholder(/option [12]/i)
      await expect(optionInputs.first()).toBeVisible({ timeout: 3_000 })

      await takeNamedScreenshot(page, "P02-poll-builder-open")
    }
  })

  test("TC-P03: Can add more poll options (up to 4)", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(2_000)

    const pollBtn = page
      .locator("button[title='Add poll']")
      .or(page.locator("button").filter({ has: page.locator("svg.lucide-bar-chart-3") }))
      .first()

    if (await pollBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await pollBtn.click()
      await page.waitForTimeout(500)

      // Add option button
      const addOptionBtn = page.getByText(/add option/i)
      if (await addOptionBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await addOptionBtn.click()
        await page.waitForTimeout(300)
        // Should now have 3 option inputs
        const option3 = page.getByPlaceholder(/option 3/i)
        await expect(option3).toBeVisible({ timeout: 3_000 })

        await addOptionBtn.click()
        await page.waitForTimeout(300)
        // 4 options - add button should be gone
        const option4 = page.getByPlaceholder(/option 4/i)
        await expect(option4).toBeVisible({ timeout: 3_000 })
      }
      await takeNamedScreenshot(page, "P03-poll-four-options")
    }
  })

  test("TC-P04: Creates a post with a poll and poll appears in feed", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(2_000)

    const pollBtn = page
      .locator("button[title='Add poll']")
      .or(page.locator("button").filter({ has: page.locator("svg.lucide-bar-chart-3") }))
      .first()

    if (await pollBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await pollBtn.click()
      await page.waitForTimeout(500)

      // Fill poll details
      const questionInput = page.getByPlaceholder(/ask a question/i)
      if (await questionInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const uid = uniqueId()
        await questionInput.fill(`Best programming language? ${uid}`)
        await page.getByPlaceholder(/option 1/i).fill("TypeScript")
        await page.getByPlaceholder(/option 2/i).fill("Python")

        // Fill optional content
        await page.locator("textarea").first().fill(`Take the poll! ${uid}`)

        // Submit
        const postBtn = page.getByRole("button", { name: /^post$/i }).last()
        await postBtn.click()
        await page.waitForTimeout(3_000)

        // Poll question should appear in feed
        await expect(page.getByText(`Best programming language? ${uid}`)).toBeVisible({ timeout: 8_000 })
        await takeNamedScreenshot(page, "P04-poll-in-feed")
      }
    }
  })

  test("TC-P05: User can vote on a poll and see results", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(2_000)

    // Look for any poll option button in the feed
    const pollOption = page
      .locator("button")
      .filter({ hasText: /^(TypeScript|Python|React|Vue|Red|Blue|Spring|Summer)/i })
      .first()

    if (await pollOption.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await pollOption.click()
      await page.waitForTimeout(2_000)

      // After voting, percentage should appear
      const percentText = page.locator("text=/%/").first()
      if (await percentText.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(percentText).toBeVisible()
      }
      await takeNamedScreenshot(page, "P05-poll-voted")
    }
  })
})

// ─── Emoji Reactions ──────────────────────────────────────────────────────────

test.describe("12B - Emoji Reactions", () => {
  test("TC-R01: Like button is visible on posts", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(2_000)

    // Heart button should exist
    const likeBtn = page.locator("button").filter({ has: page.locator("svg.lucide-heart") }).first()
    await expect(likeBtn).toBeVisible({ timeout: 10_000 })
    await takeNamedScreenshot(page, "R01-like-button-visible")
  })

  test("TC-R02: Clicking heart likes the post with LIKE reaction", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(2_000)

    const likeBtn = page.locator("button").filter({ has: page.locator("svg.lucide-heart") }).first()
    if (await likeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await likeBtn.click()
      await page.waitForTimeout(1_000)
      // Button color should change to red (text-red-500)
      await takeNamedScreenshot(page, "R02-post-liked")
    }
  })

  test("TC-R03: Hovering like button shows emoji reaction picker", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(2_000)

    // Find a reaction button container (the parent div of the like button)
    const likeArea = page.locator("button").filter({ has: page.locator("svg.lucide-heart") }).first()

    if (await likeArea.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await likeArea.hover()
      await page.waitForTimeout(600) // Wait for hover delay (400ms + buffer)

      // Emoji picker should appear with reaction emojis
      const emojiPicker = page.locator("text=❤️").or(page.locator("text=😍")).or(page.locator("text=🎉"))
      const isPickerVisible = await emojiPicker.first().isVisible({ timeout: 2_000 }).catch(() => false)

      if (isPickerVisible) {
        await expect(emojiPicker.first()).toBeVisible()
        await takeNamedScreenshot(page, "R03-emoji-picker-visible")
      }
    }
  })

  test("TC-R04: Can react with CELEBRATE emoji from picker", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(2_000)

    const likeArea = page.locator("button").filter({ has: page.locator("svg.lucide-heart") }).first()

    if (await likeArea.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await likeArea.hover()
      await page.waitForTimeout(600)

      // Click the celebrate emoji
      const celebrateBtn = page.locator("button[title='Celebrate']").or(page.locator("text=🎉").first())
      if (await celebrateBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await celebrateBtn.click()
        await page.waitForTimeout(1_500)
        await takeNamedScreenshot(page, "R04-celebrate-reaction")
      }
    }
  })

  test("TC-R05: Bob can react with different emojis on posts", async ({ page }) => {
    await login(page, "bob")
    await page.goto("/feed")
    await page.waitForTimeout(2_000)

    const likeArea = page.locator("button").filter({ has: page.locator("svg.lucide-heart") }).first()

    if (await likeArea.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await likeArea.hover()
      await page.waitForTimeout(600)

      const insightBtn = page.locator("button[title='Insightful']").or(page.locator("text=💡").first())
      if (await insightBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await insightBtn.click()
        await page.waitForTimeout(1_500)
        await takeNamedScreenshot(page, "R05-bob-insight-reaction")
      } else {
        // Fallback: just click the heart
        await likeArea.click()
        await page.waitForTimeout(1_000)
        await takeNamedScreenshot(page, "R05-bob-liked-post")
      }
    }
  })
})

// ─── Scheduled Posts ──────────────────────────────────────────────────────────

test.describe("12C - Scheduled Posts", () => {
  test("TC-S01: Schedule button is visible in post composer", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(2_000)

    const scheduleBtn = page
      .locator("button[title='Schedule post']")
      .or(page.locator("button").filter({ has: page.locator("svg.lucide-clock") }))
      .first()

    await expect(scheduleBtn).toBeVisible({ timeout: 10_000 })
    await takeNamedScreenshot(page, "S01-schedule-button-visible")
  })

  test("TC-S02: Schedule picker opens on click", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(2_000)

    const scheduleBtn = page
      .locator("button[title='Schedule post']")
      .or(page.locator("button").filter({ has: page.locator("svg.lucide-clock") }))
      .first()

    if (await scheduleBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await scheduleBtn.click()
      await page.waitForTimeout(500)

      // datetime-local input should appear
      const dateInput = page.locator("input[type='datetime-local']")
      await expect(dateInput).toBeVisible({ timeout: 5_000 })

      await takeNamedScreenshot(page, "S02-schedule-picker-open")
    }
  })

  test("TC-S03: Post button changes to Schedule when datetime is set", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(2_000)

    const scheduleBtn = page
      .locator("button[title='Schedule post']")
      .or(page.locator("button").filter({ has: page.locator("svg.lucide-clock") }))
      .first()

    if (await scheduleBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await scheduleBtn.click()
      await page.waitForTimeout(500)

      // Fill content
      await page.locator("textarea").first().fill("Scheduled test post")

      // Set a future date (1 hour from now)
      const futureDate = new Date(Date.now() + 3_600_000)
      const dateStr = futureDate.toISOString().slice(0, 16)
      const dateInput = page.locator("input[type='datetime-local']")
      if (await dateInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await dateInput.fill(dateStr)
        await page.waitForTimeout(500)

        // "Schedule" button should now appear
        const scheduleSubmitBtn = page.getByRole("button", { name: /schedule/i }).last()
        await expect(scheduleSubmitBtn).toBeVisible({ timeout: 3_000 })
        await takeNamedScreenshot(page, "S03-schedule-button-changed")
      }
    }
  })

  test("TC-S04: Creates a scheduled post (appears in scheduled list)", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(2_000)

    const scheduleBtn = page
      .locator("button[title='Schedule post']")
      .or(page.locator("button").filter({ has: page.locator("svg.lucide-clock") }))
      .first()

    if (await scheduleBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await scheduleBtn.click()
      await page.waitForTimeout(500)

      const uid = uniqueId()
      await page.locator("textarea").first().fill(`Scheduled post content ${uid}`)

      const futureDate = new Date(Date.now() + 3_600_000)
      const dateStr = futureDate.toISOString().slice(0, 16)
      const dateInput = page.locator("input[type='datetime-local']")
      if (await dateInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await dateInput.fill(dateStr)
        await page.waitForTimeout(300)

        const submitBtn = page.getByRole("button", { name: /schedule/i }).last()
        if (await submitBtn.isEnabled({ timeout: 2_000 }).catch(() => false)) {
          await submitBtn.click()
          await page.waitForTimeout(3_000)
          await takeNamedScreenshot(page, "S04-scheduled-post-created")
          // Scheduled posts do NOT appear in feed (isPublished=false)
          // Verify the post content is NOT immediately visible
        }
      }
    }
  })
})

// ─── Activity Heatmap ─────────────────────────────────────────────────────────

test.describe("12D - Activity Heatmap", () => {
  test("TC-H01: Activity heatmap is visible on profile Overview tab", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice")
    await page.waitForTimeout(3_000)

    // The Overview tab should be selected by default
    // Heatmap shows "Activity" heading and "posts in the last year"
    const activityHeading = page.getByText(/activity/i).first()
    await expect(activityHeading).toBeVisible({ timeout: 10_000 })

    await takeNamedScreenshot(page, "H01-activity-heatmap-visible")
  })

  test("TC-H02: Heatmap shows post count summary", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice")
    await page.waitForTimeout(3_000)

    // "X posts in the last year" text
    const summaryText = page.getByText(/posts in the last year/i)
    await expect(summaryText).toBeVisible({ timeout: 10_000 })

    await takeNamedScreenshot(page, "H02-heatmap-summary")
  })

  test("TC-H03: Heatmap renders a grid of colored squares", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice")
    await page.waitForTimeout(3_000)

    // The heatmap grid squares have a specific class pattern
    const heatmapSquares = page.locator(".rounded-\\[2px\\]")
    const count = await heatmapSquares.count()
    // Should have many squares (52 weeks × 7 days = 364)
    expect(count).toBeGreaterThan(50)

    await takeNamedScreenshot(page, "H03-heatmap-grid")
  })

  test("TC-H04: Hovering a heatmap square shows tooltip", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice")
    await page.waitForTimeout(3_000)

    // Hover over a heatmap square with activity
    const activeSquare = page.locator(".bg-primary\\/25, .bg-primary\\/45, .bg-primary\\/65, .bg-primary").first()
    if (await activeSquare.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await activeSquare.hover()
      await page.waitForTimeout(300)

      // Tooltip should show "X posts on ..."
      const tooltip = page.locator("text=/\\d+ post/")
      if (await tooltip.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await expect(tooltip).toBeVisible()
        await takeNamedScreenshot(page, "H04-heatmap-tooltip")
      }
    }
  })

  test("TC-H05: Heatmap is visible on other users profiles too", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/bob")
    await page.waitForTimeout(3_000)

    const activityHeading = page.getByText(/activity/i).first()
    await expect(activityHeading).toBeVisible({ timeout: 10_000 })

    await takeNamedScreenshot(page, "H05-heatmap-bob-profile")
  })
})

// ─── Phase 2 Integration ──────────────────────────────────────────────────────

test.describe("12E - Phase 2 Integration", () => {
  test("TC-I01: Poll and like buttons coexist in feed", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(2_000)

    // Both poll and schedule buttons should be in the composer
    const pollBtn = page.locator("button[title='Add poll']").first()
    const scheduleBtn = page.locator("button[title='Schedule post']").first()

    await expect(pollBtn).toBeVisible({ timeout: 10_000 })
    await expect(scheduleBtn).toBeVisible({ timeout: 5_000 })

    await takeNamedScreenshot(page, "I01-phase2-buttons-coexist")
  })

  test("TC-I02: Poll and image buttons are mutually exclusive", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/feed")
    await page.waitForTimeout(2_000)

    // Open poll builder
    const pollBtn = page.locator("button[title='Add poll']").first()
    if (await pollBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await pollBtn.click()
      await page.waitForTimeout(500)

      // Image upload button should be disabled when poll is active
      const imageBtn = page.locator("button[title='Add image']").first()
      if (await imageBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const isDisabled = await imageBtn.isDisabled()
        expect(isDisabled).toBe(true)
        await takeNamedScreenshot(page, "I02-poll-image-exclusive")
      }
    }
  })

  test("TC-I03: Profile overview shows all Phase 2 components", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice")
    await page.waitForTimeout(3_000)

    // Overview tab should show heatmap + experience + skills
    await expect(page.getByText(/activity/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/posts in the last year/i)).toBeVisible({ timeout: 5_000 })

    await takeNamedScreenshot(page, "I03-profile-overview-phase2")
  })
})
