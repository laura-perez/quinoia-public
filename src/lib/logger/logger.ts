// Core Logger class with dependency injection and performance optimizations
import crypto from 'crypto';
import { getLoggerConfig, LoggerConfig } from './config';
import { PIIRedactor, defaultPIIRedactor } from './redaction';
import { SafeSerializer, defaultSerializer } from './serialization';
import { DebugSampler, defaultDebugSampler } from './sampling';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  runId: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  environment: string;
  [key: string]: any;
}

/**
 * Logger dependencies for dependency injection
 */
export interface LoggerDependencies {
  runId?: string;
  config?: Partial<LoggerConfig>;
  redactor?: PIIRedactor;
  serializer?: SafeSerializer;
  sampler?: DebugSampler;
  enableTiming?: boolean;
}

/**
 * Performance metrics for logger operations
 */
interface PerformanceMetrics {
  logsEmitted: number;
  debugLogsSampled: number;
  serializationErrors: number;
  averageSerializationTime: number;
}

/**
 * Structured logger with PII redaction, correlation, and performance optimization
 */
export class Logger {
  private readonly runId: string;
  private readonly startTime: number;
  private readonly redactor: PIIRedactor;
  private readonly serializer: SafeSerializer;
  private readonly sampler: DebugSampler;
  private readonly enableTiming: boolean;
  private readonly metrics: PerformanceMetrics;

  // Performance optimizations
  private readonly outputMethodCache: Map<LogLevel, typeof console.log>;

  constructor(dependencies: LoggerDependencies = {}) {
    this.runId = dependencies.runId || this.generateRunId();
    this.startTime = Date.now();
    this.redactor = dependencies.redactor || defaultPIIRedactor;
    this.serializer = dependencies.serializer || defaultSerializer;
    this.sampler = dependencies.sampler || defaultDebugSampler;
    this.enableTiming = dependencies.enableTiming !== false;
    
    // Initialize metrics
    this.metrics = {
      logsEmitted: 0,
      debugLogsSampled: 0,
      serializationErrors: 0,
      averageSerializationTime: 0,
    };

    // Cache output methods for performance
    this.outputMethodCache = new Map([
      ['error', console.error],
      ['warn', console.error],
      ['info', console.log],
      ['debug', console.log],
    ]);
  }

  /**
   * Get the logger's runId
   */
  getRunId(): string {
    return this.runId;
  }

  /**
   * Calculate duration since logger instantiation
   */
  getDuration(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): Readonly<PerformanceMetrics> {
    return { ...this.metrics };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.metrics.logsEmitted = 0;
    this.metrics.debugLogsSampled = 0;
    this.metrics.serializationErrors = 0;
    this.metrics.averageSerializationTime = 0;
  }

  private generateRunId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  private log(level: LogLevel, message: string, context: Record<string, any> = {}): void {
    // Early exit for debug logs based on sampling
    if (level === 'debug') {
      if (!this.sampler.shouldSample(this.runId)) {
        return;
      }
      this.metrics.debugLogsSampled++;
    }

    const serializationStart = Date.now();

    try {
      // Redact sensitive information
      const redactedContext = this.redactor.redact(context);
      
      // Safe serialization
      const safeContext = this.serializer.serializeContext(redactedContext);

      // Update serialization metrics
      const serializationTime = Date.now() - serializationStart;
      this.updateSerializationMetrics(serializationTime);

      const config = getLoggerConfig();
      const logEntry: LogContext = {
        runId: this.runId,
        timestamp: new Date().toISOString(),
        level,
        message,
        environment: config.environment,
        ...safeContext,
      };

      // Use cached output method
      const outputMethod = this.outputMethodCache.get(level) || console.log;
      outputMethod(JSON.stringify(logEntry));

      this.metrics.logsEmitted++;

    } catch (err) {
      this.handleSerializationError(level, message, err);
    }
  }

  private updateSerializationMetrics(time: number): void {
    const totalTime = this.metrics.averageSerializationTime * this.metrics.logsEmitted + time;
    this.metrics.averageSerializationTime = totalTime / (this.metrics.logsEmitted + 1);
  }

  private handleSerializationError(level: LogLevel, message: string, error: any): void {
    this.metrics.serializationErrors++;

    const config = getLoggerConfig();
    const fallbackLogEntry = {
      runId: this.runId,
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: config.environment,
      error: `Failed to serialize context: ${String(error)}`,
      serializationErrors: this.metrics.serializationErrors,
    };

    const outputMethod = this.outputMethodCache.get(level) || console.log;
    outputMethod(JSON.stringify(fallbackLogEntry));
    
    this.metrics.logsEmitted++;
  }

  /**
   * Log error level message
   */
  error(message: string, context?: Record<string, any>): void {
    this.log('error', message, context);
  }

  /**
   * Log warning level message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  /**
   * Log info level message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  /**
   * Log debug level message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  /**
   * Measure performance of an operation
   */
  time(label: string, context?: Record<string, any>) {
    if (!this.enableTiming) {
      return {
        end: () => 0,
      };
    }

    const start = Date.now();
    this.debug(`${label} - Started`, context);
    
    return {
      end: (result?: any) => {
        const duration = Date.now() - start;
        this.info(`${label} - Completed`, { 
          ...context,
          duration,
          result: result ? this.redactor.redact(result) : undefined,
        });
        return duration;
      }
    };
  }

  /**
   * Create a child logger with the same configuration but different runId
   */
  createChild(runId?: string): Logger {
    return new Logger({
      runId: runId || this.generateRunId(),
      redactor: this.redactor,
      serializer: this.serializer,
      sampler: this.sampler,
      enableTiming: this.enableTiming,
    });
  }

  /**
   * Create a logger with custom context that gets included in all log messages
   */
  withContext(permanentContext: Record<string, any>): Logger {
    const contextualLogger = new Logger({
      runId: this.runId,
      redactor: this.redactor,
      serializer: this.serializer,
      sampler: this.sampler,
      enableTiming: this.enableTiming,
    });

    // Override log methods to include permanent context
    const originalLog = contextualLogger.log.bind(contextualLogger);
    contextualLogger.log = (level: LogLevel, message: string, context: Record<string, any> = {}) => {
      const mergedContext = { ...permanentContext, ...context };
      originalLog(level, message, mergedContext);
    };

    return contextualLogger;
  }
}

/**
 * Generate a unique runId
 */
export function generateRunId(): string {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Factory function to create a logger with runId
 */
export function createLogger(runId?: string): Logger {
  return new Logger({ runId });
}
