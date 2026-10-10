import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  // zz-diag-* only log measurements while investigating; they assert nothing
  // and are run on demand with `pnpm test:e2e:diag`.
  testIgnore: process.env.ELE_DIAG
    ? ["pages.spec.ts"]
    : ["pages.spec.ts", "zz-diag-*.spec.ts"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 1366, height: 768 },
      },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
});
