import { test, expect } from "@playwright/test"
import { login, logout, USERS } from "./helpers/auth"
import { takeNamedScreenshot } from "./helpers/utils"

test.describe("01 - Authentication", () => {
  test("TC-01: Redirect unauthenticated users to login", async ({ page }) => {
    await page.goto("/feed")
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    await takeNamedScreenshot(page, "01-redirect-to-login")
  })

  test("TC-02: Alice logs in with valid credentials", async ({ page }) => {
    await login(page, "alice")
    await expect(page).toHaveURL(/\/feed/)
    await expect(page.getByRole("main")).toBeVisible()
    await takeNamedScreenshot(page, "02-alice-logged-in")
  })

  test("TC-03: Bob logs in with valid credentials", async ({ page }) => {
    await login(page, "bob")
    await expect(page).toHaveURL(/\/feed/)
    await takeNamedScreenshot(page, "03-bob-logged-in")
  })

  test("TC-04: Carol logs in with valid credentials", async ({ page }) => {
    await login(page, "carol")
    await expect(page).toHaveURL(/\/feed/)
    await takeNamedScreenshot(page, "04-carol-logged-in")
  })

  test("TC-05: Login fails with wrong password", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel(/email/i).fill("alice@example.com")
    await page.getByLabel(/password/i).fill("WrongPassword99")
    await page.getByRole("button", { name: /sign in/i }).click()

    // Should stay on login page or show error
    await page.waitForTimeout(3_000)
    await expect(page).toHaveURL(/\/login/)
    await takeNamedScreenshot(page, "05-login-failed")
  })

  test("TC-06: Alice logs out", async ({ page }) => {
    await login(page, "alice")
    await logout(page)
    await expect(page).toHaveURL(/\/login/)
    await takeNamedScreenshot(page, "06-alice-logged-out")
  })

  test("TC-07: Register page loads", async ({ page }) => {
    await page.goto("/register")
    await expect(page.getByRole("button", { name: /sign up|register|create/i })).toBeVisible()
    await takeNamedScreenshot(page, "07-register-page")
  })
})
