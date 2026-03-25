import { test } from "@playwright/test"
import { login, pause } from "./helpers"

test("Feature 09: Direct Messaging", async ({ page }) => {
  await login(page, "alice")

  // Go to messages
  await page.goto("/messages")
  await pause(page, 3)

  // Search for Bob
  const searchInput = page.getByPlaceholder(/search/i).first()
  if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await searchInput.type("bob", { delay: 100 })
    await pause(page, 2)

    const bobResult = page.getByText(/bob/i).first()
    if (await bobResult.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await bobResult.click()
      await pause(page, 3)

      // Type a message
      const msgInput = page.getByPlaceholder(/type a message|write a message/i).first()
      if (await msgInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await msgInput.type("Hey Bob! Just checking in. How's the project going?", { delay: 50 })
        await pause(page, 1.5)

        const sendBtn = page.locator("button").filter({ has: page.locator("svg.lucide-send") }).first()
          .or(page.getByRole("button", { name: /send/i }))
        await sendBtn.click()
        await pause(page, 3)
      }
    }
  }

  // Switch to Bob and reply
  await page.context().clearCookies()
  await login(page, "bob")
  await page.goto("/messages")
  await pause(page, 2)

  const aliceConv = page.getByText(/alice/i).first()
  if (await aliceConv.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await aliceConv.click()
    await pause(page, 2)

    const msgInput = page.getByPlaceholder(/type a message|write a message/i).first()
    if (await msgInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await msgInput.type("Hey Alice! Project is going great, thanks for asking!", { delay: 50 })
      await pause(page, 1)
      const sendBtn = page.locator("button").filter({ has: page.locator("svg.lucide-send") }).first()
        .or(page.getByRole("button", { name: /send/i }))
      await sendBtn.click()
      await pause(page, 3)
    }
  }
})
