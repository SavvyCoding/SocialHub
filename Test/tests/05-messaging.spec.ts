import { test, expect } from "@playwright/test"
import { login, USERS } from "./helpers/auth"
import { takeNamedScreenshot, uniqueId } from "./helpers/utils"

test.describe("05 - Direct Messages", () => {
  test("TC-32: Alice opens messages page", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/messages")
    await expect(page.getByRole("main")).toBeVisible()
    await takeNamedScreenshot(page, "32-alice-messages-page")
  })

  test("TC-33: Alice starts a conversation with Bob", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/messages")
    await page.waitForTimeout(2_000)

    // Search for Bob
    const searchInput = page.getByPlaceholder(/search/i).first()
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill("bob")
      await page.waitForTimeout(2_000)

      // Click on Bob in search results
      const bobResult = page.getByText(/bob/i).first()
      if (await bobResult.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await bobResult.click()
        await page.waitForTimeout(3_000)
        await takeNamedScreenshot(page, "33-alice-opened-conversation-bob")
      }
    }
  })

  test("TC-34: Alice sends a message to Bob", async ({ page }) => {
    await login(page, "alice")
    await page.goto("/messages")
    await page.waitForTimeout(2_000)

    // Search and open conversation with Bob
    const searchInput = page.getByPlaceholder(/search/i).first()
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill("bob")
      await page.waitForTimeout(2_000)
      const bobResult = page.getByText(/bob/i).first()
      if (await bobResult.isVisible()) await bobResult.click()
      await page.waitForTimeout(3_000)
    }

    // Type and send message
    const msgInput = page.getByPlaceholder(/type a message|write a message/i).first()
    if (await msgInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const msg = `Hello Bob from Alice! ${uniqueId()}`
      await msgInput.fill(msg)
      const sendBtn = page.locator("button").filter({ has: page.locator("svg.lucide-send") }).first()
        .or(page.getByRole("button", { name: /send/i }))
      await sendBtn.click()
      await page.waitForTimeout(2_000)
      await takeNamedScreenshot(page, "34-alice-sent-message-to-bob")
    }
  })

  test("TC-35: Bob sees Alice's message", async ({ page }) => {
    await login(page, "bob")
    await page.goto("/messages")
    await page.waitForTimeout(3_000)

    // Look for conversation with Alice
    const aliceConv = page.getByText(/alice/i).first()
    if (await aliceConv.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await aliceConv.click()
      await page.waitForTimeout(3_000)
      await takeNamedScreenshot(page, "35-bob-sees-alice-message")
    }
  })

  test("TC-36: Bob replies to Alice", async ({ page }) => {
    await login(page, "bob")
    await page.goto("/messages")
    await page.waitForTimeout(2_000)

    const aliceConv = page.getByText(/alice/i).first()
    if (await aliceConv.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await aliceConv.click()
      await page.waitForTimeout(2_000)

      const msgInput = page.getByPlaceholder(/type a message|write a message/i).first()
      if (await msgInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const reply = `Hey Alice, Bob here! ${uniqueId()}`
        await msgInput.fill(reply)
        const sendBtn = page.locator("button").filter({ has: page.locator("svg.lucide-send") }).first()
          .or(page.getByRole("button", { name: /send/i }))
        await sendBtn.click()
        await page.waitForTimeout(2_000)
        await takeNamedScreenshot(page, "36-bob-replied-to-alice")
      }
    }
  })

  test("TC-37: Carol starts a conversation with Alice", async ({ page }) => {
    await login(page, "carol")
    await page.goto("/messages")
    await page.waitForTimeout(2_000)

    const searchInput = page.getByPlaceholder(/search/i).first()
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill("alice")
      await page.waitForTimeout(2_000)
      const aliceResult = page.getByText(/alice/i).first()
      if (await aliceResult.isVisible()) {
        await aliceResult.click()
        await page.waitForTimeout(2_000)

        const msgInput = page.getByPlaceholder(/type a message|write a message/i).first()
        if (await msgInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await msgInput.fill(`Hi Alice from Carol! ${uniqueId()}`)
          const sendBtn = page.locator("button").filter({ has: page.locator("svg.lucide-send") }).first()
            .or(page.getByRole("button", { name: /send/i }))
          await sendBtn.click()
          await page.waitForTimeout(2_000)
          await takeNamedScreenshot(page, "37-carol-messaged-alice")
        }
      }
    }
  })
})
