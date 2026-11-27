import { describe, it, expect } from 'vitest';
import { detectClientIP, getClientIPForRateLimit } from '@/lib/auth/ipDetection';
import type { NextApiRequest } from 'next';

// Mock request helper
function createMockRequest(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return {
    method: 'POST',
    url: '/api/test',
    headers: {},
    socket: { remoteAddress: '192.168.1.100' },
    ...overrides,
  } as NextApiRequest;
}

describe('IP Detection Security', () => {
  describe('detectClientIP', () => {
    it('should detect direct connection with high confidence', () => {
      const req = createMockRequest({
        socket: { remoteAddress: '203.0.113.1' } as any,
        headers: {},
      });

      const result = detectClientIP(req);

      expect(result.ip).toBe('203.0.113.1');
      expect(result.confidence).toBe('high');
      expect(result.source).toBe('socket.remoteAddress');
    });

    it('should prefer x-real-ip over other headers', () => {
      const req = createMockRequest({
        socket: {} as any,
        headers: {
          'x-real-ip': '203.0.113.5',
          'x-vercel-forwarded-for': '203.0.113.7',
          'x-forwarded-for': '203.0.113.6',
        },
      });

      const result = detectClientIP(req);

      expect(result.ip).toBe('203.0.113.5');
      expect(result.confidence).toBe('medium');
      expect(result.source).toBe('x-real-ip');
    });

    it('should not let forged cf-connecting-ip or true-client-ip headers change the detected IP', () => {
      const headers = {
        'x-real-ip': '203.0.113.5',
        'x-forwarded-for': '203.0.113.5',
      };
      const baseline = detectClientIP(createMockRequest({ headers }));
      const forged = detectClientIP(
        createMockRequest({
          headers: {
            ...headers,
            'cf-connecting-ip': '7.7.7.7',
            'true-client-ip': '6.6.6.6',
          },
        })
      );

      expect(forged.ip).toBe('203.0.113.5');
      expect(forged.source).toBe('x-real-ip');
      expect(forged.ip).toBe(baseline.ip);
      expect(forged.confidence).toBe(baseline.confidence);
      expect(forged.allCandidates.some(c => c.ip === '7.7.7.7' || c.ip === '6.6.6.6')).toBe(false);
    });

    it('should not let forged cf-connecting-ip or true-client-ip headers change the rate-limit key', () => {
      const headers = { 'x-real-ip': '203.0.113.5', 'user-agent': 'Mozilla/5.0' };
      const baseline = getClientIPForRateLimit(createMockRequest({ headers }));
      const forged = getClientIPForRateLimit(
        createMockRequest({
          headers: { ...headers, 'cf-connecting-ip': '7.7.7.7', 'true-client-ip': '6.6.6.6' },
        })
      );

      expect(forged.key).toBe(baseline.key);
      expect(forged.key).toBe('203.0.113.5');
    });

    it('should use x-vercel-forwarded-for when x-real-ip is absent', () => {
      const req = createMockRequest({
        headers: {
          'x-vercel-forwarded-for': '203.0.113.7',
          'x-forwarded-for': '203.0.113.8',
        },
      });

      const result = detectClientIP(req);

      expect(result.ip).toBe('203.0.113.7');
      expect(result.source).toBe('x-vercel-forwarded-for');
    });

    it('should use the first x-forwarded-for entry when the other headers are absent', () => {
      const req = createMockRequest({
        socket: { remoteAddress: '10.0.0.2' } as any,
        headers: {
          'x-forwarded-for': '203.0.113.9, 198.51.100.1',
        },
      });

      const result = detectClientIP(req);

      expect(result.ip).toBe('203.0.113.9');
      expect(result.source).toBe('x-forwarded-for');
      expect(result.confidence).toBe('low');
    });

    it('should flag many distinct IPs as suspicious with low confidence', () => {
      const req = createMockRequest({
        socket: { remoteAddress: '192.168.1.1' } as any,
        headers: {
          'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4',
          'x-real-ip': '5.5.5.5',
          'true-client-ip': '6.6.6.6',
          'cf-connecting-ip': '7.7.7.7',
        },
      });

      const result = detectClientIP(req);

      expect(result.ip).toBe('5.5.5.5');
      expect(result.source).toBe('x-real-ip');
      expect(result.confidence).toBe('low');
      expect(result.allCandidates.length).toBeGreaterThan(3);
    });

    it('should not flag the same client IP repeated across Vercel headers as suspicious', () => {
      const req = createMockRequest({
        socket: { remoteAddress: '10.0.0.2' } as any,
        headers: {
          'x-real-ip': '203.0.113.5',
          'x-vercel-forwarded-for': '203.0.113.5',
          'x-forwarded-for': '203.0.113.5',
        },
      });

      const result = detectClientIP(req);

      expect(result.ip).toBe('203.0.113.5');
      expect(result.confidence).toBe('medium');
    });

    it('should handle x-forwarded-for with multiple IPs', () => {
      const req = createMockRequest({
        socket: {} as any, // No remoteAddress
        headers: {
          'x-forwarded-for': '203.0.113.1, 192.168.1.1, 10.0.0.1',
        },
      });

      const result = detectClientIP(req);

      // Algorithm falls back to x-forwarded-for when no socket IP available
      expect(result.source).toBe('x-forwarded-for');
      expect(result.allCandidates).toContainEqual({
        ip: '203.0.113.1',
        source: 'x-forwarded-for'
      });
    });

    it('should reject invalid IP formats when strict validation is enabled', () => {
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': 'invalid-ip-format',
          'x-real-ip': '203.0.113.1',
        },
      });

      const result = detectClientIP(req, { strictValidation: true });

      expect(result.ip).toBe('203.0.113.1');
      expect(result.source).toBe('x-real-ip');
    });

    it('should handle no IP candidates gracefully', () => {
      const req = createMockRequest({
        socket: {} as any,
        headers: {},
      });

      const result = detectClientIP(req);

      expect(result.ip).toBe('unknown');
      expect(result.confidence).toBe('low');
      expect(result.source).toBe('none');
    });

    it('should prioritize headers according to configuration', () => {
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': '1.1.1.1',
          'x-real-ip': '2.2.2.2',
          'x-vercel-forwarded-for': '3.3.3.3',
        },
      });

      const result = detectClientIP(req, {
        headerPriority: ['x-vercel-forwarded-for', 'x-real-ip', 'x-forwarded-for']
      });

      expect(result.ip).toBe('3.3.3.3');
      expect(result.source).toBe('x-vercel-forwarded-for');
    });
  });

  describe('getClientIPForRateLimit', () => {
    it('should return simple key for high confidence IPs', () => {
      const req = createMockRequest({
        socket: { remoteAddress: '203.0.113.1' } as any,
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      });

      const result = getClientIPForRateLimit(req);

      expect(result.key).toBe('203.0.113.1');
      expect(result.confidence).toBe('high');
      expect(result.metadata.isComposite).toBe(false);
    });

    it('should create composite key for low confidence IPs', () => {
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4, 5.5.5.5',
          'user-agent': 'Mozilla/5.0 (Test)',
          'accept-language': 'en-US,en;q=0.9',
        },
      });

      const result = getClientIPForRateLimit(req);

      expect(result.confidence).toBe('low');
      expect(result.key).toContain(':'); // Should include fingerprint separator
      expect(result.key.length).toBeGreaterThan(10); // Should include fingerprint
      expect(result.metadata.isComposite).toBe(true);
      // The exact IP will be determined by the algorithm, but should be consistent
      expect(result.metadata.originalIP).toBeTruthy();
    });

    it('should handle missing user agent gracefully', () => {
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4',
        },
      });

      const result = getClientIPForRateLimit(req);

      expect(result.confidence).toBe('low');
      expect(result.metadata.isComposite).toBe(true);
      expect(typeof result.key).toBe('string');
    });
  });

  describe('Security edge cases', () => {
    it('should handle array headers correctly', () => {
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': ['203.0.113.1', '203.0.113.2'] as any,
        },
      });

      const result = detectClientIP(req);

      expect(result.allCandidates.length).toBeGreaterThan(0);
      expect(result.allCandidates.some(c => c.ip === '203.0.113.1')).toBe(true);
    });

    it('should handle private IP ranges correctly', () => {
      const req = createMockRequest({
        socket: { remoteAddress: '192.168.1.1' } as any,
        headers: {},
      });

      const result = detectClientIP(req);

      // Private IP from socket with no other candidates gets low confidence
      expect(result.confidence).toBe('low');
      expect(result.ip).toBe('192.168.1.1');
    });

    it('should detect potential header injection attacks', () => {
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': '1.1.1.1\\nMalicious-Header: attack',
          'x-real-ip': '2.2.2.2',
        },
      });

      const result = detectClientIP(req);

      // Should use x-real-ip instead of suspicious x-forwarded-for
      expect(result.ip).toBe('2.2.2.2');
      expect(result.source).toBe('x-real-ip');
    });
  });
});
