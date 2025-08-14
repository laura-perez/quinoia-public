// Debug log sampling utilities
import crypto from 'crypto';
import { getLoggerConfig } from './config';

/**
 * Sampling strategy interface
 */
export interface SamplingStrategy {
  shouldSample(identifier: string): boolean;
}

/**
 * Hash-based deterministic sampling strategy
 * Uses MD5 hash of identifier to make consistent sampling decisions
 */
export class HashBasedSamplingStrategy implements SamplingStrategy {
  constructor(private sampleRate: number) {
    if (sampleRate < 0 || sampleRate > 1) {
      throw new Error('Sample rate must be between 0 and 1');
    }
  }

  shouldSample(identifier: string): boolean {
    if (this.sampleRate >= 1.0) return true;
    if (this.sampleRate <= 0) return false;

    // Create deterministic hash from identifier
    const hash = crypto.createHash('md5').update(identifier).digest('hex');
    const hashValue = parseInt(hash.substring(0, 8), 16);
    const normalized = hashValue / 0xffffffff;
    
    return normalized < this.sampleRate;
  }
}

/**
 * Random sampling strategy
 * Uses Math.random() for sampling decisions (non-deterministic)
 */
export class RandomSamplingStrategy implements SamplingStrategy {
  constructor(private sampleRate: number) {
    if (sampleRate < 0 || sampleRate > 1) {
      throw new Error('Sample rate must be between 0 and 1');
    }
  }

  shouldSample(identifier: string): boolean {
    return Math.random() < this.sampleRate;
  }
}

/**
 * Time-based sampling strategy
 * Samples based on time intervals
 */
export class TimeBoundSamplingStrategy implements SamplingStrategy {
  private lastSampleTime = 0;

  constructor(private intervalMs: number) {
    if (intervalMs <= 0) {
      throw new Error('Sampling interval must be positive');
    }
  }

  shouldSample(identifier: string): boolean {
    const now = Date.now();
    if (now - this.lastSampleTime >= this.intervalMs) {
      this.lastSampleTime = now;
      return true;
    }
    return false;
  }
}

/**
 * Debug log sampler with configurable strategies
 */
export class DebugSampler {
  private strategy: SamplingStrategy;

  constructor(strategy?: SamplingStrategy) {
    this.strategy = strategy || this.createDefaultStrategy();
  }

  /**
   * Determine if a debug log should be sampled
   */
  shouldSample(identifier: string): boolean {
    const config = getLoggerConfig();
    
    // Always sample if debug is disabled
    if (!config.enableDebug) {
      return false;
    }

    return this.strategy.shouldSample(identifier);
  }

  /**
   * Update the sampling strategy
   */
  setStrategy(strategy: SamplingStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Get current strategy
   */
  getStrategy(): SamplingStrategy {
    return this.strategy;
  }

  private createDefaultStrategy(): SamplingStrategy {
    const config = getLoggerConfig();
    return new HashBasedSamplingStrategy(config.debugSampleRate);
  }
}

/**
 * Sampling configuration options
 */
export interface SamplingConfig {
  strategy: 'hash' | 'random' | 'time';
  sampleRate?: number;
  intervalMs?: number;
}

/**
 * Factory for creating sampling strategies
 */
export class SamplingStrategyFactory {
  static create(config: SamplingConfig): SamplingStrategy {
    switch (config.strategy) {
      case 'hash':
        return new HashBasedSamplingStrategy(config.sampleRate || 1.0);
      
      case 'random':
        return new RandomSamplingStrategy(config.sampleRate || 1.0);
      
      case 'time':
        return new TimeBoundSamplingStrategy(config.intervalMs || 1000);
      
      default:
        throw new Error(`Unknown sampling strategy: ${config.strategy}`);
    }
  }
}

// Default sampler instance
export const defaultDebugSampler = new DebugSampler();

/**
 * Convenience function for checking if debug logs should be sampled
 */
export function shouldSampleDebugLog(runId: string): boolean {
  return defaultDebugSampler.shouldSample(runId);
}
