import { defineConfig, type TestProjectInlineConfiguration } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

const BASE_EXCLUDE = ["node_modules", "dist", ".next", "src/tests/e2e/*.{spec,test}.{js,ts,jsx,tsx}"];
const INTEGRATION_TESTS_DIR = "src/tests/integration/**";
const runIntegrationTests = process.env.INTEGRATION_TESTS === "true";

// Unit tests always run (happy-dom, no database needed).
const unitProject: TestProjectInlineConfiguration = {
  extends: true,
  test: {
    name: "unit",
    environment: "happy-dom",
    // We intentionally scope tests to the dedicated src/tests directory only.
    // A former root-level tests/ directory caused duplicate & empty suite collection.
    // If additional locations are ever required, add them explicitly instead of broad src globs.
    // (Set per project: with `extends: true`, a root-level include would be merged into every project.)
    include: ["src/tests/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    exclude: [...BASE_EXCLUDE, INTEGRATION_TESTS_DIR],
  },
};

// Integration tests need local Supabase + a dev server, so they only run when
// INTEGRATION_TESTS=true (see `npm run test:integration`). They use the node environment
// so server-only modules (e.g. src/lib/supabase/client.ts) can be imported.
const integrationProject: TestProjectInlineConfiguration = {
  extends: true,
  test: {
    name: "integration",
    environment: "node",
    include: [`${INTEGRATION_TESTS_DIR}/*.{test,spec}.{js,ts,jsx,tsx}`],
  },
};

export default defineConfig({
  test: {
    testTimeout: 30000, // 30 seconds for integration tests (onboarding flow can take time)
    setupFiles: [
      "./src/tests/setup-env.ts", // Load env vars FIRST
      "./src/tests/setupTests.ts"
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
    },
    globals: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/lib": path.resolve(__dirname, "./src/lib"),
      "@/schemas": path.resolve(__dirname, "./src/schemas"),
    },
    exclude: BASE_EXCLUDE,
    projects: runIntegrationTests ? [unitProject, integrationProject] : [unitProject],
  },
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/lib": path.resolve(__dirname, "./src/lib"),
      "@/schemas": path.resolve(__dirname, "./src/schemas"),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.fr.ts'],
  },
});
