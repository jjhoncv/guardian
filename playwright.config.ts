import { defineConfig, devices } from "@playwright/test";

// BASE_URL apunta a un ambiente publicado (smoke test); sin ella, se levanta el build local.
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "npm start", url: baseURL, reuseExistingServer: !process.env.CI, timeout: 60_000 },
});
