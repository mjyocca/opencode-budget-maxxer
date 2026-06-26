import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["tests/**/*.{test,spec}.ts"],
  },
  // Tell VSCode's LS to use this tsconfig for test file type resolution
});
