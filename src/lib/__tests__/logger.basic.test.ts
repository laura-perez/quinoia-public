import { describe, it, expect, vi, beforeEach } from 'vitest';

// Tests simplifiés pour vérifier l'importation
describe('Logger Basic Tests', () => {
  it('should import logger functions', async () => {
    // Import dynamique pour diagnostiquer
    const loggerModule = await import('../logger');
    console.log('Logger module exports:', Object.keys(loggerModule));
    
    expect(loggerModule.createLogger).toBeDefined();
    expect(loggerModule.redact).toBeDefined();
    expect(typeof loggerModule.createLogger).toBe('function');
    expect(typeof loggerModule.redact).toBe('function');
  });

  it('should create logger instance', async () => {
    const { createLogger } = await import('../logger');
    const logger = createLogger();
    
    expect(logger).toBeDefined();
    expect(logger.getRunId).toBeDefined();
    expect(typeof logger.getRunId()).toBe('string');
  });

  it('should redact simple strings', async () => {
    const { redact } = await import('../logger');
    
    const email = 'user@example.com';
    const redacted = redact(email);
    
    expect(redacted).toBeDefined();
    expect(redacted).not.toEqual(email);
  });
});
