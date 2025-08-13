/**
 * Builder for creating HTTP request objects for testing
 * Simulates NextApiRequest with proper typing
 * 
 * CI/CD Compatibility:
 * - Uses environment-agnostic IP addresses instead of localhost
 * - Provides methods for different testing scenarios (test, production-like)
 * - Works in containerized environments and cloud CI/CD pipelines
 */
export class HttpRequestBuilder {
  private method: string = 'POST';
  private body: any = {};
  private headers: Record<string, string> = {
    'content-type': 'application/json',
    'user-agent': 'test-agent/1.0',
  };
  private url: string = '/api/submit';
  private remoteAddress: string = 'test-client-ip'; // CI/CD friendly default

  static create(): HttpRequestBuilder {
    return new HttpRequestBuilder();
  }

  withMethod(method: string): HttpRequestBuilder {
    this.method = method;
    return this;
  }

  withGetMethod(): HttpRequestBuilder {
    this.method = 'GET';
    return this;
  }

  withPutMethod(): HttpRequestBuilder {
    this.method = 'PUT';
    return this;
  }

  withBody(body: any): HttpRequestBuilder {
    this.body = body;
    return this;
  }

  withStringBody(body: string): HttpRequestBuilder {
    this.body = body;
    return this;
  }

  withHeaders(headers: Record<string, string>): HttpRequestBuilder {
    this.headers = { ...this.headers, ...headers };
    return this;
  }

  withUserAgent(userAgent: string): HttpRequestBuilder {
    this.headers['user-agent'] = userAgent;
    return this;
  }

  withForwardedFor(ip: string): HttpRequestBuilder {
    this.headers['x-forwarded-for'] = ip;
    return this;
  }

  withRemoteAddress(ip: string): HttpRequestBuilder {
    this.remoteAddress = ip;
    return this;
  }

  withSuspiciousHeaders(): HttpRequestBuilder {
    this.headers = {
      ...this.headers,
      'x-forwarded-for': '192.168.1.100',
      'user-agent': 'curl/7.68.0',
    };
    return this;
  }

  withTestEnvironment(): HttpRequestBuilder {
    // Configure for test environments (CI/CD friendly)
    this.remoteAddress = 'test-client-ip';
    this.headers['user-agent'] = 'test-runner/1.0';
    return this;
  }

  withProductionLikeEnvironment(): HttpRequestBuilder {
    // Configure for production-like testing scenarios
    this.remoteAddress = '203.0.113.195'; // RFC5737 TEST-NET-3 address
    this.headers['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    return this;
  }

  build() {
    return {
      method: this.method,
      body: this.body,
      headers: this.headers,
      url: this.url,
      socket: {
        remoteAddress: this.remoteAddress,
      },
    };
  }
}
