import { test, expect } from "@playwright/test"

const TIMESTAMP = Date.now()
const TEST_USER = {
  name: "E2E Test User",
  username: `e2etest${TIMESTAMP}`,
  email: `e2e${TIMESTAMP}@test.com`,
  password: "TestPass123!",
}

test.describe("Authentication", () => {
  test("register a new user", async ({ page }) => {
    await page.goto("/register")

    await page.getByLabel(/name/i).fill(TEST_USER.name)
    await page.getByLabel(/username/i).fill(TEST_USER.username)
    await page.getByLabel(/email/i).fill(TEST_USER.email)
    await page.getByLabel(/password/i).fill(TEST_USER.password)
    await page.getByRole("button", { name: /register|sign up|create/i }).click()

    // Should redirect to feed after successful registration + login
    await expect(page).toHaveURL(/\/feed/, { timeout: 10_000 })
  })

  test("login with existing credentials", async ({ page }) => {
    await page.goto("/login")

    // Use seeded user (alice)
    await page.getByLabel(/email/i).fill("alice@example.com")
    await page.getByLabel(/password/i).fill("password123")
    await page.getByRole("button", { name: /sign in|log in/i }).click()

    await expect(page).toHaveURL(/\/feed/, { timeout: 10_000 })
  })

  test("redirect unauthenticated users to login", async ({ page }) => {
    await page.goto("/feed")
    await expect(page).toHaveURL(/\/login/)
  })

  test("login page redirects authenticated users to feed", async ({ page }) => {
    // Login first
    await page.goto("/login")
    await page.getByLabel(/email/i).fill("alice@example.com")
    await page.getByLabel(/password/i).fill("password123")
    await page.getByRole("button", { name: /sign in|log in/i }).click()
    await expect(page).toHaveURL(/\/feed/, { timeout: 10_000 })

    // Now try visiting login again
    await page.goto("/login")
    await expect(page).toHaveURL(/\/feed/)
  })
})
