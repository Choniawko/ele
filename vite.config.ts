import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
const dir = (path: string) => fileURLToPath(new URL(path, import.meta.url));
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": dir("./apps/web/src"),
      "@model": dir("./packages/circuit-model"),
      "@catalog": dir("./packages/device-catalog"),
      "@simulation": dir("./packages/simulation"),
      "@measurements": dir("./packages/measurements"),
      "@renderers": dir("./packages/renderers"),
      "@editor": dir("./packages/editor"),
      "@training": dir("./packages/training"),
      "@tutor": dir("./packages/tutor-contracts"),
    },
  },
  test: { include: ["tests/**/*.test.{ts,tsx}"], environment: "node" },
});
