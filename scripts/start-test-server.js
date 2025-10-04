#!/usr/bin/env node
/**
 * Start Next.js dev server with test database configuration
 * This script loads .env.local.test BEFORE starting Next.js
 */

const { spawn } = require('child_process');
const dotenv = require('dotenv');
const path = require('path');

// Load test environment variables
const envPath = path.join(__dirname, '..', '.env.local.test');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`❌ Failed to load ${envPath}:`, result.error.message);
  process.exit(1);
}

console.log('✅ Loaded test environment from .env.local.test');
console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL?.substring(0, 30)}...`);

// Set INTEGRATION_TESTS flag
process.env.INTEGRATION_TESTS = 'true';

// Start Next.js dev server with inherited env vars
const next = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  env: process.env,
  shell: true
});

next.on('exit', (code) => {
  process.exit(code || 0);
});
