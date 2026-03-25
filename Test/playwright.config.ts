import { defineConfig, devices } from "@playwright/test"

const BASE_URL = process.env.BASE_URL ?? "http://social_platform_web:3000"

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["html", { open: "never", outputFolder: "results/html" }], ["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "on",
    screenshot: "on",
    video: "on",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  outputDir: "results/artifacts",

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
    },
  ],
})
