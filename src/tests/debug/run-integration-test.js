/**
 * Direct integration test runner that bypasses Vitest environment issues
 * This runs the TypeScript integration test functions directly
 */

const dotenv = require('dotenv');
const path = require('path');

// Load real environment variables first
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Set dummy values for non-essential env vars
const dummyEnvVars = {
  'RECAPTCHA_SECRET_KEY': 'test-key',
  'NEXT_PUBLIC_RECAPTCHA_SITE_KEY': 'test-site-key',
  'SUPABASE_ANON_KEY': 'test-anon-key',
  'N8N_WEBHOOK_URL': 'http://localhost:3000',
  'N8N_WEBHOOK_SECRET': 'test-secret',
  'HMAC_SECRET': 'test-hmac-secret',
  'APP_BASE_URL': 'http://localhost:3000'
};

Object.entries(dummyEnvVars).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});

// Set test environment
process.env.NODE_ENV = 'test';

// Now run the comprehensive test
console.log('🚀 Running Quinoïa v2.0 Integration Tests');
console.log('Using real database with test environment setup\n');

// Import and run the working test
require('./comprehensive-system-test.js');