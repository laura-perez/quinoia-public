/**
 * Integration test setup for real database access
 */
import { beforeAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

// Load real environment variables for integration tests
beforeAll(() => {
  // Load from .env.local for real database access
  dotenv.config({ 
    path: path.join(process.cwd(), '.env.local'),
    override: true  // Override any existing test env vars
  });
  
  // Set dummy values for non-essential env vars to pass validation
  const dummyEnvVars = {
    'RECAPTCHA_SECRET_KEY': 'test-key',
    'NEXT_PUBLIC_RECAPTCHA_SITE_KEY': 'test-site-key', 
    'SUPABASE_ANON_KEY': 'test-anon-key',
    'APP_BASE_URL': 'http://localhost:3000'
  };
  
  // Set dummy values if not already set
  Object.entries(dummyEnvVars).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
  
  // Validate required environment variables
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables for integration tests: ${missing.join(', ')}`);
  }
  
  // Test environment flag is already set by Vitest
  
  console.log('🔧 Integration test environment loaded');
  console.log(`   Supabase URL: ${process.env.SUPABASE_URL?.substring(0, 30)}...`);
});