import { defineConfig } from "@playwright/test";

// Support @ alias for src in Playwright tests
import path from "path";
import { register } from "module-alias";
register({
  '@': path.join(__dirname, 'src'),
});

export default defineConfig({
  testDir: "tests/e2e",
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  expect: {
    timeout: 5_000,
  },
});
