import { defineConfig, devices } from "@playwright/test"

const BASE_URL = process.env.BASE_URL ?? "http://social_platform_web:3000"

export default defineConfig({
  testDir: "./demos",
  timeout: 300_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],

  use: {
    baseURL: BASE_URL,
    video: { mode: "on", size: { width: 1280, height: 720 } },
    screenshot: "off",
    trace: "off",
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    launchOptions: { slowMo: 400 },
  },

  outputDir: "output/raw-videos",

  projects: [
    {
      name: "demo",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
    },
  ],
})
