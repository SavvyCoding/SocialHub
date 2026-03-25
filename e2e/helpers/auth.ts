import type { Page } from "@playwright/test"

/** Login as Alice (seeded user) and return to the feed */
export async function loginAsAlice(page: Page) {
  await page.goto("/login")
  await page.getByLabel(/email/i).fill("alice@example.com")
  await page.getByLabel(/password/i).fill("password123")
  await page.getByRole("button", { name: /sign in|log in/i }).click()
  await page.waitForURL(/\/feed/, { timeout: 10_000 })
}

/** Login as Bob (seeded user) */
export async function loginAsBob(page: Page) {
  await page.goto("/login")
  await page.getByLabel(/email/i).fill("bob@example.com")
  await page.getByLabel(/password/i).fill("password123")
  await page.getByRole("button", { name: /sign in|log in/i }).click()
  await page.waitForURL(/\/feed/, { timeout: 10_000 })
}
