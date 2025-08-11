import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setupTests.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
    globals: true,
    alias: {
      '@': './src',
    },
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,ts,jsx,tsx}'
    ],
    exclude: ['node_modules', 'dist', '.next'],
  },
  plugins: [tsconfigPaths()],
});
