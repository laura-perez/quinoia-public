// Legacy service functions (still in use by API routes and tests)
export { upsertUserAndSubmission } from './services';

// Core database exports
export { getServiceClient } from './client';

// Modern modular exports (preferred for new code)
export * from './types';
export * from './repositories';
export * from './client';
export * from './services';
export * from './constants';
export * from './recency';
export * from './rlsOperations';
