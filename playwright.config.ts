import { defineConfig, devices } from "@playwright/test"

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],

  // Auto-start Next.js dev server in CI if not already running
  webServer: process.env.CI
    ? {
        command: "pnpm --filter web start",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 60_000,
      }
    : undefined,
})
