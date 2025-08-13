// Logger builder pattern for flexible logger construction
import { Logger } from './logger';
import { PIIRedactor } from './redaction';
import { SafeSerializer, SerializationOptions } from './serialization';
import { DebugSampler, SamplingConfig, SamplingStrategyFactory } from './sampling';
import { LoggerConfig, LoggerConfigManager } from './config';

/**
 * Logger configuration options for builder
 */
export interface LoggerBuilderConfig {
  runId?: string;
  config?: Partial<LoggerConfig>;
  redactor?: PIIRedactor;
  serializer?: SafeSerializer;
  sampler?: DebugSampler;
  enableTiming?: boolean;
}

/**
 * Builder pattern for creating Logger instances with custom configuration
 */
export class LoggerBuilder {
  private runId?: string;
  private config?: Partial<LoggerConfig>;
  private redactor?: PIIRedactor;
  private serializer?: SafeSerializer;
  private sampler?: DebugSampler;
  private enableTiming = true;

  /**
   * Set a specific runId for the logger
   */
  withRunId(runId: string): LoggerBuilder {
    this.runId = runId;
    return this;
  }

  /**
   * Set custom logger configuration
   */
  withConfig(config: Partial<LoggerConfig>): LoggerBuilder {
    this.config = { ...this.config, ...config };
    return this;
  }

  /**
   * Set a custom PII redactor
   */
  withRedactor(redactor: PIIRedactor): LoggerBuilder {
    this.redactor = redactor;
    return this;
  }

  /**
   * Set a custom serializer
   */
  withSerializer(serializer: SafeSerializer): LoggerBuilder {
    this.serializer = serializer;
    return this;
  }

  /**
   * Set serialization options (creates a new serializer internally)
   */
  withSerializationOptions(options: SerializationOptions): LoggerBuilder {
    this.serializer = new SafeSerializer(options);
    return this;
  }

  /**
   * Set a custom debug sampler
   */
  withSampler(sampler: DebugSampler): LoggerBuilder {
    this.sampler = sampler;
    return this;
  }

  /**
   * Set sampling configuration (creates a new sampler internally)
   */
  withSamplingConfig(config: SamplingConfig): LoggerBuilder {
    const strategy = SamplingStrategyFactory.create(config);
    this.sampler = new DebugSampler(strategy);
    return this;
  }

  /**
   * Enable or disable timing functionality
   */
  withTiming(enabled: boolean): LoggerBuilder {
    this.enableTiming = enabled;
    return this;
  }

  /**
   * Set environment-specific configuration
   */
  forEnvironment(environment: 'development' | 'production' | 'test'): LoggerBuilder {
    switch (environment) {
      case 'development':
        return this.withConfig({
          enableDebug: true,
          debugSampleRate: 1.0,
          environment: 'development',
        });
      
      case 'production':
        return this.withConfig({
          enableDebug: false,
          debugSampleRate: 0.01, // 1% sampling in production
          environment: 'production',
        }).withSerializationOptions({
          maxDepth: 5, // Limit depth in production
          maxStackLines: 3,
        });
      
      case 'test':
        return this.withConfig({
          enableDebug: true,
          debugSampleRate: 1.0,
          environment: 'test',
        }).withSerializationOptions({
          maxDepth: 3, // Simpler objects in tests
          maxStackLines: 10,
        });
    }
  }

  /**
   * Configure for high-performance scenarios
   */
  forHighPerformance(): LoggerBuilder {
    return this
      .withConfig({
        enableDebug: false,
        debugSampleRate: 0.001, // Very low sampling
      })
      .withSerializationOptions({
        maxDepth: 3,
        maxStackLines: 1,
        includeNonEnumerable: false,
      })
      .withTiming(false);
  }

  /**
   * Configure for debugging scenarios
   */
  forDebugging(): LoggerBuilder {
    return this
      .withConfig({
        enableDebug: true,
        debugSampleRate: 1.0,
      })
      .withSerializationOptions({
        maxDepth: 15,
        maxStackLines: 20,
        includeNonEnumerable: true,
      })
      .withTiming(true);
  }

  /**
   * Reset builder to default state
   */
  reset(): LoggerBuilder {
    this.runId = undefined;
    this.config = undefined;
    this.redactor = undefined;
    this.serializer = undefined;
    this.sampler = undefined;
    this.enableTiming = true;
    return this;
  }

  /**
   * Build the logger with specified configuration
   */
  build(): Logger {
    // Apply config overrides if specified
    if (this.config) {
      const configManager = LoggerConfigManager.getInstance();
      configManager.setConfig(this.config);
    }

    // Create logger with dependencies
    const config: LoggerBuilderConfig = {
      runId: this.runId,
      config: this.config,
      redactor: this.redactor,
      serializer: this.serializer,
      sampler: this.sampler,
      enableTiming: this.enableTiming,
    };

    return new Logger(config);
  }
}

/**
 * Convenience factory functions for common logger configurations
 */
export class LoggerFactory {
  /**
   * Create a standard logger with default configuration
   */
  static standard(runId?: string): Logger {
    return new LoggerBuilder()
      .withRunId(runId)
      .build();
  }

  /**
   * Create a production-optimized logger
   */
  static production(runId?: string): Logger {
    return new LoggerBuilder()
      .withRunId(runId)
      .forEnvironment('production')
      .build();
  }

  /**
   * Create a development logger with full debugging
   */
  static development(runId?: string): Logger {
    return new LoggerBuilder()
      .withRunId(runId)
      .forEnvironment('development')
      .build();
  }

  /**
   * Create a test logger with controlled output
   */
  static test(runId?: string): Logger {
    return new LoggerBuilder()
      .withRunId(runId)
      .forEnvironment('test')
      .build();
  }

  /**
   * Create a high-performance logger for intensive operations
   */
  static highPerformance(runId?: string): Logger {
    return new LoggerBuilder()
      .withRunId(runId)
      .forHighPerformance()
      .build();
  }

  /**
   * Create a debugging logger with maximum verbosity
   */
  static debugging(runId?: string): Logger {
    return new LoggerBuilder()
      .withRunId(runId)
      .forDebugging()
      .build();
  }
}

/**
 * Create a new logger builder instance
 */
export function createLoggerBuilder(): LoggerBuilder {
  return new LoggerBuilder();
}
