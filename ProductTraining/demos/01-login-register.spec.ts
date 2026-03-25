import { test } from "@playwright/test"
import { login, pause, USERS } from "./helpers"

test("Feature 01: Login and Registration", async ({ page }) => {
  // Show login page
  await page.goto("/login")
  await pause(page, 3)

  // Show registration page
  await page.goto("/register")
  await pause(page, 3)

  // Go back to login and demonstrate login
  await page.goto("/login")
  await pause(page, 1)

  // Type email slowly
  await page.getByLabel(/email/i).click()
  await page.getByLabel(/email/i).type("alice@example.com", { delay: 80 })
  await pause(page, 1)

  // Type password
  await page.getByLabel(/password/i).click()
  await page.getByLabel(/password/i).type("Password1", { delay: 80 })
  await pause(page, 1)

  // Click sign in
  await page.getByRole("button", { name: /sign in/i }).click()
  await page.waitForURL(/\/feed/, { timeout: 15_000 })
  await pause(page, 3)
})
