// Infrastructure de logging structuré avec redaction PII et corrélation runId
import crypto from 'crypto';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LoggerConfig {
  enableDebug: boolean;
  debugSampleRate: number;
  environment: string;
}

interface LogContext {
  runId: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  environment: string;
  [key: string]: any;
}

// Configuration basée sur les variables d'environnement
function getConfig(): LoggerConfig {
  return {
    enableDebug: process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEBUG_LOGS === 'true',
    debugSampleRate: parseFloat(process.env.DEBUG_SAMPLE_RATE || '1.0'),
    environment: process.env.NODE_ENV || 'development',
  };
}

// Patterns pour détecter les données sensibles
const SENSITIVE_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  token: /\b[A-Za-z0-9_-]{20,}\b/g,
  ip: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
  secret: /\b(secret|password|key|token)\b[^,}]*(?:[,}])/gi,
};

const SENSITIVE_KEYS = [
  'password', 'secret', 'token', 'key', 'recaptchaToken', 'authorization',
  'x-api-key', 'cookie', 'session', 'jwt', 'bearer', 'userAgent',
];

/**
 * Masque les données sensibles dans un objet ou une chaîne
 */
export function redact(input: any): any {
  return _redact(input, new WeakSet());
}

function _redact(input: any, seen: WeakSet<object>): any {
  if (typeof input === 'string') {
    return redactString(input);
  }
  
  if (Array.isArray(input)) {
    if (seen.has(input)) return '[Circular Array]';
    seen.add(input);
    return input.map(item => _redact(item, seen));
  }
  
  if (input && typeof input === 'object') {
    if (seen.has(input)) return '[Circular Object]';
    seen.add(input);
    
    // Handle Error objects specially (they have non-enumerable properties)
    if (input instanceof Error) {
      return {
        name: input.name,
        message: input.message,
        stack: input.stack?.split('\n').slice(0, 5).join('\n') // Limite la stack trace
      };
    }
    
    const redacted: any = {};
    for (const [key, value] of Object.entries(input)) {
      const lowerKey = key.toLowerCase();
      
      // Masquer les clés sensibles
      if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = _redact(value, seen);
      }
    }
    return redacted;
  }
  
  return input;
}

function redactString(str: string): string {
  let result = str;
  
  // Masquage sophistiqué des emails: garde première lettre + domaine partiel
  result = result.replace(SENSITIVE_PATTERNS.email, (match) => {
    const [localPart, domain] = match.split('@');
    if (localPart && domain) {
      const domainParts = domain.split('.');
      const maskedLocal = localPart.charAt(0) + '***';
      const maskedDomain = '***';
      return maskedLocal + '@' + maskedDomain;
    }
    return '[REDACTED_EMAIL]';
  });
  
  // Masquage sophistiqué des IPs: garde premiers octets  
  result = result.replace(SENSITIVE_PATTERNS.ip, (match) => {
    const parts = match.split('.');
    return parts.slice(0, -1).join('.') + '.***';
  });
  
  // Masquage des tokens avec préfixe
  result = result.replace(/\b(sk_|pk_|key_|token_|secret_)([A-Za-z0-9_-]+)\b/g, '$1***');
  
  // URLs avec secrets
  result = result.replace(/(https?:\/\/[^\/]+\/[^\/]*)(secret|token|key|webhook)([^\/]*\/?)([A-Za-z0-9_-]{10,})/gi, '$1$2$3***');
  
  // Autres patterns sensibles
  result = result.replace(SENSITIVE_PATTERNS.secret, '[REDACTED_SECRET]');
  result = result.replace(SENSITIVE_PATTERNS.token, '[REDACTED_TOKEN]');
  
  return result;
}

/**
 * Génère un runId unique pour corréler les logs
 */
export function generateRunId(): string {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Détermine si un log debug doit être émis basé sur l'échantillonnage
 */
function shouldSampleDebugLog(runId: string): boolean {
  const config = getConfig();
  if (!config.enableDebug) return false;
  if (config.debugSampleRate >= 1.0) return true;
  
  // Échantillonnage déterministe basé sur le runId
  const hash = crypto.createHash('md5').update(runId).digest('hex');
  const hashValue = parseInt(hash.substr(0, 8), 16);
  const normalized = hashValue / 0xffffffff;
  
  return normalized < config.debugSampleRate;
}

/**
 * Logger structuré avec redaction PII et corrélation runId
 */
export class Logger {
  private runId: string;
  private startTime: number;

  constructor(runId?: string) {
    this.runId = runId || generateRunId();
    this.startTime = Date.now();
  }

  getRunId(): string {
    return this.runId;
  }

  /**
   * Calcule la durée depuis l'instanciation du logger
   */
  getDuration(): number {
    return Date.now() - this.startTime;
  }

  private log(level: LogLevel, message: string, context: Record<string, any> = {}) {
    // Skip debug logs based on sampling
    if (level === 'debug' && !shouldSampleDebugLog(this.runId)) {
      return;
    }

    // Sérialisation sûre avec gestion d'erreurs et objets circulaires
    const safeContext = this.serializeContext(redact(context));

    const config = getConfig();
    const logEntry: LogContext = {
      runId: this.runId,
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: config.environment,
      ...safeContext,
    };

    // Utiliser console.error pour error/warn, console.log pour info/debug
    const outputMethod = ['error', 'warn'].includes(level) ? console.error : console.log;
    
    try {
      outputMethod(JSON.stringify(logEntry));
    } catch (err) {
      // Fallback si la sérialisation échoue
      const config = getConfig();
      outputMethod(JSON.stringify({
        runId: this.runId,
        timestamp: new Date().toISOString(),
        level,
        message,
        environment: config.environment,
        error: 'Failed to serialize context: ' + String(err)
      }));
    }
  }

  /**
   * Sérialise un contexte de façon sûre (gère les références circulaires et les erreurs)
   */
  private serializeContext(context: Record<string, any>): Record<string, any> {
    const seen = new WeakSet();
    
    function serialize(obj: any): any {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      
      if (seen.has(obj)) {
        return '[Circular Reference]';
      }
      
      seen.add(obj);
      
      if (obj instanceof Error) {
        return {
          name: obj.name,
          message: obj.message,
          stack: obj.stack?.split('\n').slice(0, 5).join('\n') // Limite la stack trace
        };
      }
      
      if (Array.isArray(obj)) {
        return obj.map(serialize);
      }
      
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        try {
          result[key] = serialize(value);
        } catch (err) {
          result[key] = `[Serialization Error: ${String(err)}]`;
        }
      }
      
      return result;
    }
    
    return serialize(context);
  }

  error(message: string, context?: Record<string, any>) {
    this.log('error', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  /**
   * Mesure la performance d'une opération
   */
  time(label: string, context?: Record<string, any>) {
    const start = Date.now();
    this.debug(`${label} - Started`, context);
    
    return {
      end: (result?: any) => {
        const duration = Date.now() - start;
        this.info(`${label} - Completed`, { 
          ...context,
          duration,
          result: result ? redact(result) : undefined
        });
        return duration;
      }
    };
  }
}

/**
 * Factory pour créer un logger avec runId unique
 */
export function createLogger(runId?: string): Logger {
  return new Logger(runId);
}