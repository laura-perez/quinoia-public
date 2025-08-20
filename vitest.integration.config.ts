import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  test: {
    environment: "node", // Use Node.js environment for server-side code
    setupFiles: ["./src/tests/setupIntegrationTests.ts"],
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
    // Only run integration tests
    include: ["src/tests/integration/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    exclude: ["node_modules", "dist", ".next"],
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