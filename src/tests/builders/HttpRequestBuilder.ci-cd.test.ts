import { describe, it, expect } from 'vitest';
import { HttpRequestBuilder } from '../builders/HttpRequestBuilder';

describe('HttpRequestBuilder - CI/CD Compatibility', () => {
  it('should use environment-agnostic IP addresses by default', () => {
    const request = HttpRequestBuilder.create().build();
    
    // Should not use localhost/127.0.0.1 which might not work in CI/CD
    expect(request.socket.remoteAddress).not.toBe('127.0.0.1');
    expect(request.socket.remoteAddress).not.toBe('localhost');
    expect(request.socket.remoteAddress).toBe('test-client-ip');
  });

  it('should provide test environment configuration', () => {
    const request = HttpRequestBuilder.create()
      .withTestEnvironment()
      .build();
    
    expect(request.socket.remoteAddress).toBe('test-client-ip');
    expect(request.headers['user-agent']).toBe('test-runner/1.0');
  });

  it('should provide production-like environment configuration', () => {
    const request = HttpRequestBuilder.create()
      .withProductionLikeEnvironment()
      .build();
    
    // Should use RFC5737 TEST-NET-3 address (reserved for documentation)
    expect(request.socket.remoteAddress).toBe('203.0.113.195');
    expect(request.headers['user-agent']).toContain('Mozilla');
  });

  it('should allow custom remote addresses for specific test scenarios', () => {
    const customIp = '198.51.100.42'; // RFC5737 TEST-NET-2 address
    const request = HttpRequestBuilder.create()
      .withRemoteAddress(customIp)
      .build();
    
    expect(request.socket.remoteAddress).toBe(customIp);
  });

  it('should work with suspicious headers for security testing', () => {
    const request = HttpRequestBuilder.create()
      .withSuspiciousHeaders()
      .build();
    
    expect(request.headers['x-forwarded-for']).toBe('192.168.1.100');
    expect(request.headers['user-agent']).toBe('curl/7.68.0');
  });
});
