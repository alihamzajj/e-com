import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/db/**/*.test.ts"],
    // PGlite boots a full Postgres per suite; give it room on slower machines.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
