export {
  Logger,
  generateRunId,
  createLogger,
  redact,
  LoggerFactory,
  createEnvironmentLogger
} from './logger/index.js';

export type {
  LogLevel,
  LoggerDependencies,
  LoggerConfig,
  LoggerBuilderConfig,
  SerializationOptions,
  SamplingConfig
} from './logger/index.js';

// Legacy compatibility - these functions maintain the original API
import { createEnvironmentLogger } from './logger/index.js';

/**
 * Create a logger with default configuration (backward compatibility)
 */
export function createDefaultLogger(runId?: string) {
  return createEnvironmentLogger(runId);
}