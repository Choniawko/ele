import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig(base, {
  testMatch: "project-validation.spec.ts",
  use: { ...base.use, baseURL: "http://127.0.0.1:4173" },
  webServer: {
    command: "pnpm preview --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
