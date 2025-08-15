// PII redaction strategies and implementation

/**
 * Abstract base class for redaction strategies
 */
abstract class RedactionStrategy {
  abstract readonly name: string;
  abstract readonly pattern: RegExp;
  abstract redact(value: string): string;
}

/**
 * Email redaction strategy - preserves first letter and domain structure
 */
class EmailRedactionStrategy extends RedactionStrategy {
  readonly name = 'email';
  readonly pattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi;

  redact(value: string): string {
    return value.replace(this.pattern, (match) => {
      const [localPart, domain] = match.split('@');
      if (localPart && domain) {
        const maskedLocal = localPart.charAt(0) + '***';
        const maskedDomain = '***';
        return maskedLocal + '@' + maskedDomain;
      }
      return '[REDACTED_EMAIL]';
    });
  }
}

/**
 * IP address redaction strategy - preserves network portion
 */
class IPRedactionStrategy extends RedactionStrategy {
  readonly name = 'ip';
  readonly pattern = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;

  redact(value: string): string {
    return value.replace(this.pattern, (match) => {
      const parts = match.split('.');
      return parts.slice(0, -1).join('.') + '.***';
    });
  }
}

/**
 * Token redaction strategy - handles prefixed tokens
 */
class TokenRedactionStrategy extends RedactionStrategy {
  readonly name = 'token';
  readonly pattern = /\b(sk_|pk_|key_|token_|secret_)([A-Za-z0-9_-]+)\b/g;

  redact(value: string): string {
    return value.replace(this.pattern, '$1***');
  }
}

/**
 * URL redaction strategy - handles URLs with secrets
 */
class URLRedactionStrategy extends RedactionStrategy {
  readonly name = 'url';
  readonly pattern = /(https?:\/\/[^\/]+\/[^\/]*)(secret|token|key|webhook)([^\/]*\/?)([A-Za-z0-9_-]{10,})/gi;

  redact(value: string): string {
    return value.replace(this.pattern, '$1$2$3***');
  }
}

/**
 * General secret pattern redaction
 */
class SecretPatternStrategy extends RedactionStrategy {
  readonly name = 'secret';
  readonly pattern = /\b(secret|password|key|token)\b[^,}]*(?:[,}])/gi;

  redact(value: string): string {
    return value.replace(this.pattern, '[REDACTED_SECRET]');
  }
}

/**
 * Generic token pattern redaction
 */
class GenericTokenStrategy extends RedactionStrategy {
  readonly name = 'generic_token';
  readonly pattern = /\b[A-Za-z0-9_-]{20,}\b/g;

  redact(value: string): string {
    return value.replace(this.pattern, '[REDACTED_TOKEN]');
  }
}

/**
 * Sensitive keys that should be completely redacted
 */
const SENSITIVE_KEYS = new Set([
  'password', 'secret', 'token', 'key', 'recaptchaToken', 'authorization',
  'x-api-key', 'cookie', 'session', 'jwt', 'bearer', 'userAgent',
]);

/**
 * PII Redactor with configurable strategies
 */
export class PIIRedactor {
  private strategies: RedactionStrategy[];

  constructor(strategies?: RedactionStrategy[]) {
    this.strategies = strategies || [
      new EmailRedactionStrategy(),
      new IPRedactionStrategy(),
      new TokenRedactionStrategy(),
      new URLRedactionStrategy(),
      new SecretPatternStrategy(),
      new GenericTokenStrategy(),
    ];
  }

  /**
   * Add a custom redaction strategy
   */
  addStrategy(strategy: RedactionStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Remove a strategy by name
   */
  removeStrategy(name: string): void {
    this.strategies = this.strategies.filter(s => s.name !== name);
  }

  /**
   * Redact sensitive information from a string
   */
  redactString(value: string): string {
    let result = value;
    for (const strategy of this.strategies) {
      result = strategy.redact(result);
    }
    return result;
  }

  /**
   * Check if a key name is considered sensitive
   */
  isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return Array.from(SENSITIVE_KEYS).some(sensitive => lowerKey.includes(sensitive));
  }

  /**
   * Redact any type of input (recursive for objects and arrays)
   */
  redact(input: any): any {
    return this.redactRecursive(input, new WeakSet());
  }

  private redactRecursive(input: any, seen: WeakSet<object>): any {
    if (typeof input === 'string') {
      return this.redactString(input);
    }
    
    if (Array.isArray(input)) {
      if (seen.has(input)) return '[Circular Array]';
      seen.add(input);
      return input.map(item => this.redactRecursive(item, seen));
    }
    
    if (input && typeof input === 'object') {
      if (seen.has(input)) return '[Circular Object]';
      seen.add(input);
      
      // Handle Error objects specially (they have non-enumerable properties)
      if (input instanceof Error) {
        return {
          name: input.name,
          message: input.message,
          stack: input.stack?.split('\n').slice(0, 5).join('\n')
        };
      }
      
      const redacted: any = {};
      for (const [key, value] of Object.entries(input)) {
        // Redact sensitive keys completely
        if (this.isSensitiveKey(key)) {
          redacted[key] = '[REDACTED]';
        } else {
          redacted[key] = this.redactRecursive(value, seen);
        }
      }
      return redacted;
    }
    
    return input;
  }
}

// Default singleton instance
export const defaultPIIRedactor = new PIIRedactor();

/**
 * Convenience function using default redactor
 */
export function redact(input: any): any {
  return defaultPIIRedactor.redact(input);
}
