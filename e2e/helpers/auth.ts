import type { Page } from "@playwright/test"

/** Redirect localhost:3080 navigations back to localhost:3000 (NEXTAUTH_URL mismatch in Docker) */
async function patchNextAuthRedirects(page: Page) {
  await page.route("**", (route) => {
    const url = route.request().url()
    if (url.startsWith("http://localhost:3080/")) {
      route.continue({ url: url.replace("http://localhost:3080/", "http://localhost:3000/") })
    } else {
      route.continue()
    }
  })
}

/** Login as Alice (seeded user) and return to the feed */
export async function loginAsAlice(page: Page) {
  await patchNextAuthRedirects(page)
  await page.goto("http://localhost:3000/login")
  await page.getByLabel(/email/i).fill("alice@example.com")
  await page.getByLabel(/password/i).fill("Password1")
  await page.getByRole("button", { name: /sign in|log in/i }).click()
  await page.waitForURL(/\/feed/, { timeout: 20_000 })
}

/** Login as Bob (seeded user) */
export async function loginAsBob(page: Page) {
  await patchNextAuthRedirects(page)
  await page.goto("http://localhost:3000/login")
  await page.getByLabel(/email/i).fill("bob@example.com")
  await page.getByLabel(/password/i).fill("Password1")
  await page.getByRole("button", { name: /sign in|log in/i }).click()
  await page.waitForURL(/\/feed/, { timeout: 20_000 })
}
