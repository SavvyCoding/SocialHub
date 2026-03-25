import { type Page, expect } from "@playwright/test"

export function uniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export async function takeNamedScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `results/screenshots/${name}.png`, fullPage: true })
}

export async function clickIfVisible(page: Page, selector: string, timeout = 3_000) {
  const el = page.locator(selector).first()
  if (await el.isVisible({ timeout }).catch(() => false)) {
    await el.click()
    return true
  }
  return false
}

export async function waitForToast(page: Page, timeout = 5_000) {
  // Wait for common toast/notification elements
  const toast = page.locator("[role='status'], [data-sonner-toast], .toast").first()
  await toast.waitFor({ state: "visible", timeout }).catch(() => {})
}
