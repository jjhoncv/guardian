import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Las pruebas E2E (e2e/*.spec.ts) las corre Playwright, no Vitest.
  test: { include: ["**/*.test.{ts,tsx}"], exclude: ["**/node_modules/**", "tools/**"] },
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
});
