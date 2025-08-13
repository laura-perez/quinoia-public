// Configuration management for structured logging
export interface LoggerConfig {
  enableDebug: boolean;
  debugSampleRate: number;
  environment: string;
}

/**
 * Singleton configuration manager for logger settings
 * Provides centralized access to environment-based configuration
 */
export class LoggerConfigManager {
  private static instance?: LoggerConfigManager;
  private config?: LoggerConfig;

  private constructor() {}

  /**
   * Get the singleton instance of LoggerConfigManager
   */
  static getInstance(): LoggerConfigManager {
    if (!this.instance) {
      this.instance = new LoggerConfigManager();
    }
    return this.instance;
  }

  /**
   * Get current logger configuration (cached after first access)
   */
  getConfig(): LoggerConfig {
    if (!this.config) {
      this.config = this.loadConfig();
    }
    return this.config;
  }

  /**
   * Reset configuration cache (useful for testing)
   */
  resetConfig(): void {
    this.config = undefined;
  }

  /**
   * Override configuration (useful for testing)
   */
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = {
      ...this.loadConfig(),
      ...config,
    };
  }

  private loadConfig(): LoggerConfig {
    return {
      enableDebug: process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEBUG_LOGS === 'true',
      debugSampleRate: parseFloat(process.env.DEBUG_SAMPLE_RATE || '1.0'),
      environment: process.env.NODE_ENV || 'development',
    };
  }
}

/**
 * Convenience function to get current logger configuration
 */
export function getLoggerConfig(): LoggerConfig {
  return LoggerConfigManager.getInstance().getConfig();
}
