import type { NextApiRequest } from "next";
import { createLogger } from "../logger";

/**
 * Result of IP detection with confidence level
 */
export interface IPDetectionResult {
  ip: string;
  confidence: 'high' | 'medium' | 'low';
  source: string;
  allCandidates: Array<{ ip: string; source: string }>;
}

/**
 * Configuration for trusted proxy headers and networks
 */
export interface IPDetectionConfig {
  // List of trusted proxy IP ranges/addresses
  trustedProxies?: string[];
  // Headers to check in order of preference
  headerPriority?: string[];
  // Whether to validate IP format strictly
  strictValidation?: boolean;
}

const DEFAULT_CONFIG: Required<IPDetectionConfig> = {
  trustedProxies: [
    // Common cloud provider ranges (these should be customized for your deployment)
    '10.0.0.0/8',     // Private network
    '172.16.0.0/12',  // Private network  
    '192.168.0.0/16', // Private network
    '127.0.0.1/32',   // Localhost
  ],
  // The app runs on Vercel, which overwrites these headers with the real client IP.
  // Headers Vercel passes through unchanged (e.g. cf-connecting-ip, true-client-ip)
  // are client-controlled and must not be trusted.
  headerPriority: [
    'x-real-ip',              // Set by Vercel
    'x-vercel-forwarded-for', // Set by Vercel
    'x-forwarded-for',        // Set by Vercel; only the first entry is used
  ],
  strictValidation: true,
};

/**
 * Validates if an IP address has a valid format
 */
function isValidIPAddress(ip: string): boolean {
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // Comprehensive IPv6 regex supporting compressed notation (::)
  const ipv6Regex = /^(([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:)|(([0-9A-Fa-f]{1,4}:){1,7}:)|(([0-9A-Fa-f]{1,4}:){1,6}:[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){1,5}(:[0-9A-Fa-f]{1,4}){1,2})|(([0-9A-Fa-f]{1,4}:){1,4}(:[0-9A-Fa-f]{1,4}){1,3})|(([0-9A-Fa-f]{1,4}:){1,3}(:[0-9A-Fa-f]{1,4}){1,4})|(([0-9A-Fa-f]{1,4}:){1,2}(:[0-9A-Fa-f]{1,4}){1,5})|([0-9A-Fa-f]{1,4}:)((:[0-9A-Fa-f]{1,4}){1,6})|(:)((:[0-9A-Fa-f]{1,4}){1,7}|:)|fe80:(:[0-9A-Fa-f]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9])|([0-9A-Fa-f]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9])?[0-9]))$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Checks if an IP is in a private/local range
 */
function isPrivateIP(ip: string): boolean {
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^::1$/,
    /^fe80:/,
  ];
  
  return privateRanges.some(range => range.test(ip));
}

/**
 * Extracts client IP with confidence assessment from various headers
 */
export function detectClientIP(
  req: NextApiRequest,
  config: IPDetectionConfig = {}
): IPDetectionResult {
  const logger = createLogger();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const candidates: Array<{ ip: string; source: string }> = [];
  
  // 1. Check direct socket connection (highest confidence when no proxy)
  const socketIP = req.socket.remoteAddress;
  if (socketIP) {
    candidates.push({ ip: socketIP, source: 'socket.remoteAddress' });
  }
  
  // 2. Check headers in priority order
  for (const header of finalConfig.headerPriority) {
    const headerValue = req.headers[header];
    if (headerValue) {
      const headerIPs = Array.isArray(headerValue) ? headerValue : [headerValue];
      headerIPs.forEach(value => {
        // Handle comma-separated IPs in headers like x-forwarded-for
        const ips = value.split(',').map(ip => ip.trim());
        ips.forEach(ip => {
          // Sanitize IP to remove newlines and control characters
          const sanitizedIP = ip.replace(/[\r\n\t\v\f\b]/g, '');
          if (
            sanitizedIP &&
            !/[\r\n]/.test(sanitizedIP) &&
            (!finalConfig.strictValidation || isValidIPAddress(sanitizedIP))
          ) {
            candidates.push({ ip: sanitizedIP, source: header });
          }
        });
      });
    }
  }
  
  // 3. Determine best candidate with confidence level
  if (candidates.length === 0) {
    logger.warn('No IP candidates found in request', {
      headers: Object.keys(req.headers),
      hasSocket: Boolean(socketIP)
    });
    return {
      ip: 'unknown',
      confidence: 'low',
      source: 'none',
      allCandidates: candidates
    };
  }
  
  // First configured header present wins; for multi-value headers such as
  // x-forwarded-for this is the first (client) entry.
  const headerCandidate = finalConfig.headerPriority
    .map(header => candidates.find(c => c.source === header))
    .find((candidate): candidate is { ip: string; source: string } => Boolean(candidate));
  const socketCandidate = candidates.find(c => c.source === 'socket.remoteAddress');
  
  let bestCandidate: { ip: string; source: string };
  let confidence: 'high' | 'medium' | 'low';
  
  if (headerCandidate && headerCandidate.source !== 'x-forwarded-for') {
    // x-real-ip / x-vercel-forwarded-for
    bestCandidate = headerCandidate;
    confidence = 'medium';
  } else if (socketCandidate && !isPrivateIP(socketCandidate.ip)) {
    // Direct connection from a public address: use the socket
    bestCandidate = socketCandidate;
    confidence = 'high';
  } else if (headerCandidate) {
    // Only x-forwarded-for is available
    bestCandidate = headerCandidate;
    confidence = 'low';
  } else {
    // Private socket address without any proxy header
    bestCandidate = candidates[0];
    confidence = 'low';
  }
  
  // Reduce confidence for private IPs from high to medium
  if (isPrivateIP(bestCandidate.ip) && confidence === 'high') {
    confidence = 'medium';
  }
  
  // Additional validation
  if (finalConfig.strictValidation && !isValidIPAddress(bestCandidate.ip)) {
    confidence = 'low';
  }
  
  // Log suspicious patterns (the same client IP repeated across headers is expected)
  const distinctIPCount = new Set(candidates.map(c => c.ip)).size;
  if (distinctIPCount > 3) {
    logger.warn('Multiple IP candidates detected - possible header injection', {
      candidateCount: candidates.length,
      distinctIPCount,
      sources: candidates.map(c => c.source),
      selectedIP: bestCandidate.ip,
      selectedSource: bestCandidate.source
    });
    confidence = 'low';
  }
  
  logger.info('Client IP detected', {
    ip: bestCandidate.ip,
    source: bestCandidate.source,
    confidence,
    candidateCount: candidates.length
  });
  
  return {
    ip: bestCandidate.ip,
    confidence,
    source: bestCandidate.source,
    allCandidates: candidates
  };
}

/**
 * Get client IP for rate limiting purposes with additional security checks
 */
export function getClientIPForRateLimit(req: NextApiRequest): {
  key: string;
  confidence: 'high' | 'medium' | 'low';
  metadata: Record<string, any>;
} {
  const logger = createLogger();
  const detection = detectClientIP(req);
  
  // For rate limiting, we want to be conservative
  // If confidence is low, we might want to use additional fingerprinting
  let rateLimitKey = detection.ip;
  
  if (detection.confidence === 'low') {
    logger.warn('Low confidence IP detection for rate limiting', {
      ip: detection.ip,
      source: detection.source,
      candidateCount: detection.allCandidates.length
    });
    
    // For low confidence, we can create a composite key that's harder to spoof
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    
    // Create a more robust identifier for low confidence scenarios
    rateLimitKey = `${detection.ip}:${Buffer.from(userAgent + acceptLanguage).toString('base64').slice(0, 16)}`;
  }
  
  return {
    key: rateLimitKey,
    confidence: detection.confidence,
    metadata: {
      originalIP: detection.ip,
      source: detection.source,
      allCandidates: detection.allCandidates,
      isComposite: detection.confidence === 'low'
    }
  };
}
