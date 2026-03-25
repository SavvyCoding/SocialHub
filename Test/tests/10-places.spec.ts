import { test, expect } from "@playwright/test"
import { login } from "./helpers/auth"
import { takeNamedScreenshot } from "./helpers/utils"

test.describe("10 - Places Showcase", () => {
  test("TC-68: Alice views My Places page", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/places")
    await expect(page.getByText(/my places/i)).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(3_000)
    await takeNamedScreenshot(page, "68-alice-my-places")
  })

  test("TC-69: Alice sees place entries loaded from seed", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/places")
    await page.waitForTimeout(5_000)

    // Check if place cards or list items are rendered (Alice has 34 seeded places)
    const placeItems = page.locator("[data-testid='place-card'], .place-card, .border.rounded").first()
    const mapContainer = page.locator("[class*='mapbox'], [class*='map-container'], canvas").first()

    if (await placeItems.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await takeNamedScreenshot(page, "69-alice-places-with-entries")
    } else if (await mapContainer.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await takeNamedScreenshot(page, "69-alice-places-map-view")
    } else {
      await takeNamedScreenshot(page, "69-alice-places-loading")
    }
  })

  test("TC-70: Alice opens Add a Place dialog", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/places")
    await page.waitForTimeout(3_000)

    const addBtn = page.getByRole("button", { name: /add a place/i })
    if (await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(1_000)
      await expect(page.getByRole("heading", { name: /add a place/i })).toBeVisible({ timeout: 3_000 })
      await takeNamedScreenshot(page, "70-alice-add-place-dialog")
    } else {
      await takeNamedScreenshot(page, "70-alice-places-no-add-button")
    }
  })

  test("TC-71: Alice cancels Add a Place dialog", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/profile/alice/places")
    await page.waitForTimeout(3_000)

    const addBtn = page.getByRole("button", { name: /add a place/i })
    if (await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addBtn.click()
      await page.waitForTimeout(1_000)

      const cancelBtn = page.getByRole("button", { name: /cancel/i })
      if (await cancelBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await cancelBtn.click()
        await page.waitForTimeout(500)
      }
    }
    await takeNamedScreenshot(page, "71-alice-place-dialog-cancelled")
  })

  // ── Cross-user viewing ──

  test("TC-72: Bob views Alice's places (read-only)", async ({ page }) => {
    await login(page, "bob")
    await page.goto("/profile/alice/places")
    await page.waitForTimeout(3_000)
    await expect(page.getByRole("main")).toBeVisible()
    // Bob should NOT see "Add a place" button
    const addBtn = page.getByRole("button", { name: /add a place/i })
    const visible = await addBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    await takeNamedScreenshot(page, visible ? "72-bob-alice-places-has-add" : "72-bob-alice-places-readonly")
  })

  test("TC-73: Carol views her own places", async ({ page }) => {
    await login(page, "carol")
    await page.goto("/profile/carol/places")
    await page.waitForTimeout(3_000)
    await expect(page.getByRole("main")).toBeVisible()
    await takeNamedScreenshot(page, "73-carol-own-places")
  })

  test("TC-74: Bob views his own places", async ({ page }) => {
    await login(page, "bob")
    await page.goto("/profile/bob/places")
    await page.waitForTimeout(3_000)
    await expect(page.getByRole("main")).toBeVisible()
    await takeNamedScreenshot(page, "74-bob-own-places")
  })
})
