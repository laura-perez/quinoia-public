import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  test: {
    // Use node environment for integration tests (server-side code), happy-dom for unit tests (React components)
    environment: process.env.INTEGRATION_TESTS === 'true' ? 'node' : 'happy-dom',
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
  // We intentionally scope tests to the dedicated src/tests directory only.
  // A former root-level tests/ directory caused duplicate & empty suite collection.
  // If additional locations are ever required, add them explicitly instead of broad src globs.
  include: ["src/tests/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    exclude: ["node_modules", "dist", ".next", "src/tests/e2e/*.{spec,test}.{js,ts,jsx,tsx}"],
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
