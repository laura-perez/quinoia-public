// Main exports for the structured logging system
export { Logger, generateRunId, createLogger } from './logger';
export type { LogLevel, LoggerDependencies } from './logger';

export { LoggerBuilder, LoggerFactory, createLoggerBuilder } from './builder';
export type { LoggerBuilderConfig } from './builder';

export { PIIRedactor, redact, defaultPIIRedactor } from './redaction';

export { 
  SafeSerializer, 
  safeSerialize, 
  serializeContext, 
  defaultSerializer 
} from './serialization';
export type { SerializationOptions } from './serialization';

export { 
  DebugSampler, 
  shouldSampleDebugLog, 
  defaultDebugSampler,
  HashBasedSamplingStrategy,
  RandomSamplingStrategy,
  TimeBoundSamplingStrategy,
  SamplingStrategyFactory
} from './sampling';
export type { SamplingStrategy, SamplingConfig } from './sampling';

export { 
  LoggerConfigManager, 
  getLoggerConfig 
} from './config';
export type { LoggerConfig } from './config';

// Import for re-exports
import { Logger, createLogger } from './logger';
import { LoggerFactory } from './builder';

// Re-export commonly used items for convenience
export { 
  Logger as StructuredLogger,
  createLogger as createStructuredLogger,
  LoggerFactory as StructuredLoggerFactory
};

/**
 * Create a logger optimized for the current environment
 */
export function createEnvironmentLogger(runId?: string): Logger {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return LoggerFactory.production(runId);
    case 'test':
      return LoggerFactory.test(runId);
    default:
      return LoggerFactory.development(runId);
  }
}
