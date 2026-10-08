import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig(base, {
  testMatch: [
    "project-validation.spec.ts",
    "exam-practice.spec.ts",
    "pages.spec.ts",
    "knowledge.spec.ts",
    "my-projects.spec.ts",
    "physical-installation.spec.ts",
    "ele02-108.spec.ts",
    "distribution-builder.spec.ts",
  ],
  testIgnore: [],
  use: { ...base.use, baseURL: "http://127.0.0.1:4173/ele/" },
  webServer: {
    command: "pnpm preview:dist",
    url: "http://127.0.0.1:4173/ele/",
    reuseExistingServer: false,
  },
});
