import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger, redact, LoggerFactory } from '../../lib/logger';

// Mock console methods to capture output
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();

beforeEach(() => {
  mockConsoleLog.mockClear();
  mockConsoleError.mockClear();
  vi.spyOn(console, 'log').mockImplementation(mockConsoleLog);
  vi.spyOn(console, 'error').mockImplementation(mockConsoleError);
});

describe('Logger Integration Tests', () => {
  describe('PII Redaction', () => {
    it('should redact email addresses', () => {
      const email = 'user@example.com';
      const redacted = redact(email);
      
      expect(redacted).not.toContain('@example.com');
      expect(redacted).toMatch(/u\*\*\*@\*\*\*/);
    });

    it('should redact IP addresses', () => {
      const ip = '192.168.1.100';
      const redacted = redact(ip);
      
      expect(redacted).not.toContain('100');
      expect(redacted).toMatch(/192\.168\.1\.\*\*\*/);
    });

    it('should redact URLs with secrets', () => {
      const url = 'https://api.example.com/webhook/abc123def456';
      const redacted = redact(url);
      
      expect(redacted).not.toContain('abc123def456');
      expect(redacted).toContain('***');
    });

    it('should redact tokens and secrets', () => {
      const token = 'sk_live_abcdef123456';
      const redacted = redact(token);
      
      expect(redacted).not.toContain('abcdef123456');
      expect(redacted).toMatch(/sk_\*\*\*/);
    });
  });

  describe('Structured Logging', () => {
    it('should include runId in every log entry', () => {
      const logger = createLogger();
      
      logger.info('Test message', { test: true });
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/"runId":"[a-f0-9]{16}"/)
      );
    });

    it('should output valid JSON for all levels', () => {
      const logger = createLogger();
      
      logger.error('Error message', { error: new Error('test') });
      logger.warn('Warning message', { warning: true });
      logger.info('Info message', { info: true });
      logger.debug('Debug message', { debug: true });
      
      // Vérifie que tous les appels produisent du JSON valide
      const allCalls = [...mockConsoleError.mock.calls, ...mockConsoleLog.mock.calls];
      
      allCalls.forEach(([jsonString]) => {
        expect(() => JSON.parse(jsonString)).not.toThrow();
      });
    });

    it('should include environment information', () => {
      const logger = createLogger();
      
      logger.info('Test message');
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/"environment":"test"/)
      );
    });

    it('should format timestamps correctly', () => {
      const logger = createLogger();
      
      logger.info('Test message');
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/"timestamp":"20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"/)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle non-serializable objects', () => {
      const logger = createLogger();
      const circular: any = {};
      circular.self = circular;
      
      expect(() => {
        logger.error('Circular reference test', { circular });
      }).not.toThrow();
      
      // La référence circulaire doit être convertie en string sûre
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringMatching(/"self":"\[Circular Object\]"/)
      );
    });

    it('should handle Error objects in context', () => {
      const logger = createLogger();
      const errorObj = new Error('Test error message');
      errorObj.stack = 'Stack trace here';
      
      logger.error('Error test', { errorObj });
      
      const logCall = mockConsoleError.mock.calls[0][0];
      const parsed = JSON.parse(logCall);
      
      expect(parsed.errorObj).toBeDefined();
      expect(parsed.errorObj.message).toBe('Test error message');
      expect(parsed.errorObj.name).toBe('Error');
    });
  });

  describe('Correlation and Tracing', () => {
    it('should maintain consistent runId across calls', () => {
      const logger = createLogger();
      
      logger.info('First message');
      logger.error('Second message');
      logger.debug('Third message');
      
      const allCalls = [...mockConsoleError.mock.calls, ...mockConsoleLog.mock.calls];
      const runIds = allCalls.map(([jsonString]) => {
        const parsed = JSON.parse(jsonString);
        return parsed.runId;
      });
      
      // Tous les runIds doivent être identiques
      expect(runIds[0]).toBeDefined();
      expect(runIds.every(id => id === runIds[0])).toBe(true);
    });

    it('should have different runIds for different logger instances', () => {
      const logger1 = createLogger();
      const logger2 = createLogger();
      
      logger1.info('Logger 1 message');
      logger2.info('Logger 2 message');
      
      const runId1 = JSON.parse(mockConsoleLog.mock.calls[0][0]).runId;
      const runId2 = JSON.parse(mockConsoleLog.mock.calls[1][0]).runId;
      
      expect(runId1).not.toEqual(runId2);
    });
  });

  describe('Production Readiness', () => {
    it('should not log debug messages in production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('ENABLE_DEBUG_LOGS', 'false');
      
      // Create logger with production configuration
      const logger = LoggerFactory.production();
      logger.debug('Debug message');
      
      // Aucun appel ne doit être fait pour debug en production
      expect(mockConsoleLog).not.toHaveBeenCalled();
      expect(mockConsoleError).not.toHaveBeenCalled();
      
      vi.unstubAllEnvs();
    });

    it('should handle high throughput without errors', () => {
      const logger = createLogger();
      
      expect(() => {
        for (let i = 0; i < 1000; i++) {
          logger.info(`Message ${i}`, { iteration: i });
        }
      }).not.toThrow();
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(1000);
    });
  });
});

describe('Logger Integration with PII Redaction', () => {
  it('should prevent PII from appearing in actual log output', () => {
    const logger = createLogger();
    
    // Simuler des données avec PII
    const sensitiveData = {
      email: 'john.doe@company.com',
      ip: '203.0.113.42',
      token: 'sk_live_abc123def456ghi789',
      url: 'https://api.n8n.com/webhook/secret123token',
    };
    
    logger.info('Processing user data', {
      email: redact(sensitiveData.email),
      ip: redact(sensitiveData.ip),
      token: redact(sensitiveData.token),
      url: redact(sensitiveData.url),
    });
    
    const logOutput = mockConsoleLog.mock.calls[0][0];
    
    // Vérifier qu'aucune PII réelle n'apparaît dans les logs
    expect(logOutput).not.toContain('john.doe@company.com');
    expect(logOutput).not.toContain('203.0.113.42');
    expect(logOutput).not.toContain('abc123def456ghi789');
    expect(logOutput).not.toContain('secret123token');
    
    // Mais vérifier que les versions redacted sont présentes
    expect(logOutput).toContain('j***@***');
    expect(logOutput).toContain('203.0.113.***');
    expect(logOutput).toContain('[REDACTED]');  // token key gets redacted to [REDACTED]
    expect(logOutput).toContain('***');
  });
});
