import { vi } from 'vitest';

/**
 * Builder for creating HTTP response mock objects for testing
 * Simulates NextApiResponse with chainable methods
 */
export class HttpResponseBuilder {
  private statusCode: number = 200;
  private headers: Record<string, string> = {};
  private jsonResponse: any = null;

  static create(): HttpResponseBuilder {
    return new HttpResponseBuilder();
  }

  build() {
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    };

    // Track what was called for assertions
    response.status.mockImplementation((code: number) => {
      this.statusCode = code;
      return response;
    });

    response.json.mockImplementation((data: any) => {
      this.jsonResponse = data;
      return response;
    });

    response.setHeader.mockImplementation((name: string, value: string) => {
      this.headers[name] = value;
      return response;
    });

    // Add getters for test assertions
    Object.defineProperty(response, 'statusCode', {
      get: () => this.statusCode,
    });

    Object.defineProperty(response, 'jsonData', {
      get: () => this.jsonResponse,
    });

    Object.defineProperty(response, 'headersSent', {
      get: () => this.headers,
    });

    return response;
  }
}
