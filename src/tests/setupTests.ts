// Load env vars FIRST, before any imports that might validate them
import dotenv from "dotenv";
const envFile = process.env.INTEGRATION_TESTS === 'true' ? '.env.local.test' : '.env.test';
dotenv.config({ path: envFile });

import "@testing-library/jest-dom/vitest";
import { server } from "./msw/server";

// Only setup MSW for unit tests, not for integration tests
// Integration tests need real HTTP requests to Supabase local
if (process.env.INTEGRATION_TESTS !== 'true') {
  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}
