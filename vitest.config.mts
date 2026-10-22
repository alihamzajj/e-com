import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/db/**/*.test.ts", "tests/live/**/*.test.ts"],
    // .env.local is only needed by the opt-in live tests (RUN_LIVE_DB_TESTS=1).
    env: loadEnv("test", process.cwd(), ""),
    // PGlite boots a full Postgres per suite; give it room on slower machines.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
