import { type Page } from "@playwright/test"

export const USERS = {
  alice: { email: "alice@example.com", password: "Password1", username: "alice" },
  bob: { email: "bob@example.com", password: "Password1", username: "bob" },
  carol: { email: "carol@example.com", password: "Password1", username: "carol" },
}

export type UserKey = keyof typeof USERS

export async function login(page: Page, user: UserKey) {
  await page.goto("/login")
  await pause(page, 1)
  await page.getByLabel(/email/i).fill(USERS[user].email)
  await pause(page, 0.5)
  await page.getByLabel(/password/i).fill(USERS[user].password)
  await pause(page, 0.5)
  await page.getByRole("button", { name: /sign in/i }).click()
  await page.waitForURL(/\/feed/, { timeout: 15_000 })
  await pause(page, 2)
}

export async function pause(page: Page, seconds: number) {
  await page.waitForTimeout(seconds * 1000)
}

export async function scrollDown(page: Page, pixels = 400) {
  await page.mouse.wheel(0, pixels)
  await pause(page, 1.5)
}

export async function highlight(page: Page, selector: string) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (el) {
      (el as HTMLElement).style.outline = "3px solid #3b82f6"
      (el as HTMLElement).style.outlineOffset = "2px"
      setTimeout(() => {
        (el as HTMLElement).style.outline = ""
        (el as HTMLElement).style.outlineOffset = ""
      }, 2000)
    }
  }, selector)
  await pause(page, 2)
}
