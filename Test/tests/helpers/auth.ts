import { type Page, expect } from "@playwright/test"

export const USERS = {
  alice: { email: "alice@example.com", password: "Password1", username: "alice", name: "Alice Johnson" },
  bob: { email: "bob@example.com", password: "Password1", username: "bob", name: "Bob Smith" },
  carol: { email: "carol@example.com", password: "Password1", username: "carol", name: "Carol Williams" },
} as const

export type UserKey = keyof typeof USERS

export async function login(page: Page, user: UserKey) {
  await page.goto("/login")
  await page.getByLabel(/email/i).fill(USERS[user].email)
  await page.getByLabel(/password/i).fill(USERS[user].password)
  await page.getByRole("button", { name: /sign in/i }).click()
  await page.waitForURL(/\/feed/, { timeout: 15_000 })
}

export async function logout(page: Page) {
  // Look for user menu / avatar button in the nav
  const userMenu = page.locator("nav button:has(img), nav a:has(img), [data-testid='user-menu']").first()
  if (await userMenu.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await userMenu.click()
    const signOut = page.getByRole("button", { name: /sign out|log out/i }).or(page.getByText(/sign out|log out/i))
    if (await signOut.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await signOut.click()
      await page.waitForURL(/\/login/, { timeout: 10_000 })
      return
    }
  }
  // Fallback: clear cookies
  await page.context().clearCookies()
  await page.goto("/login")
  await page.waitForURL(/\/login/, { timeout: 10_000 })
}

export async function waitForPageReady(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {})
}
