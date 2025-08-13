import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/tests/setupTests.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
    },
    globals: true,
    alias: {
      "@": "./src",
    },
    include: ["src/**/*.{test,spec}.{js,ts,jsx,tsx}", "tests/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    exclude: ["node_modules", "dist", ".next", "src/tests/e2e/*.{spec,test}.{js,ts,jsx,tsx}"],
  },
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "@": "./src",
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.fr.ts'],
  },
});
