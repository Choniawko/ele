import js from "@eslint/js";
import tseslint from "typescript-eslint";
export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "test-results/**",
      "playwright-report/**",
      "Symulator_Elektryczny_Pakiet_Codex/**",
      "ELE02_plan_wdrozenia_Codex_2026-10-08/**",
      "release/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
