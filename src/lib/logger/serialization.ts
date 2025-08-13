// Safe serialization utilities for logging

/**
 * Safe serialization options
 */
export interface SerializationOptions {
  maxDepth?: number;
  maxStackLines?: number;
  includeNonEnumerable?: boolean;
}

/**
 * Safe serializer that handles circular references, Errors, and other edge cases
 */
export class SafeSerializer {
  private options: Required<SerializationOptions>;

  constructor(options: SerializationOptions = {}) {
    this.options = {
      maxDepth: options.maxDepth || 10,
      maxStackLines: options.maxStackLines || 5,
      includeNonEnumerable: options.includeNonEnumerable || false,
    };
  }

  /**
   * Serialize any value safely, handling circular references and complex objects
   */
  serialize(value: any): any {
    return this.serializeRecursive(value, new WeakSet(), 0);
  }

  /**
   * Serialize a context object (typically a Record<string, any>)
   */
  serializeContext(context: Record<string, any>): Record<string, any> {
    try {
      const serialized = this.serialize(context);
      // Ensure we return an object, not a primitive
      return typeof serialized === 'object' && serialized !== null ? serialized : { value: serialized };
    } catch (error) {
      return {
        serializationError: `Failed to serialize context: ${String(error)}`,
        originalType: typeof context,
      };
    }
  }

  private serializeRecursive(value: any, seen: WeakSet<object>, depth: number): any {
    // Handle primitives
    if (value === null || typeof value !== 'object') {
      return value;
    }

    // Check depth limit
    if (depth >= this.options.maxDepth) {
      return '[Max Depth Reached]';
    }

    // Handle circular references
    if (seen.has(value)) {
      return '[Circular Reference]';
    }
    
    seen.add(value);

    try {
      // Handle Error objects specially
      if (value instanceof Error) {
        return this.serializeError(value);
      }

      // Handle Date objects
      if (value instanceof Date) {
        return value.toISOString();
      }

      // Handle RegExp objects
      if (value instanceof RegExp) {
        return value.toString();
      }

      // Handle Arrays
      if (Array.isArray(value)) {
        return value.map(item => this.serializeRecursive(item, seen, depth + 1));
      }

      // Handle Functions (convert to string representation)
      if (typeof value === 'function') {
        return `[Function: ${value.name || 'anonymous'}]`;
      }

      // Handle plain objects
      return this.serializeObject(value, seen, depth);

    } catch (error) {
      return `[Serialization Error: ${String(error)}]`;
    }
  }

  private serializeError(error: Error): any {
    const serialized: any = {
      name: error.name,
      message: error.message,
    };

    // Include stack trace if available
    if (error.stack) {
      const stackLines = error.stack.split('\n').slice(0, this.options.maxStackLines);
      serialized.stack = stackLines.join('\n');
    }

    // Include any enumerable custom properties
    for (const [key, value] of Object.entries(error)) {
      if (key !== 'name' && key !== 'message' && key !== 'stack') {
        try {
          serialized[key] = this.serializeRecursive(value, new WeakSet(), 0);
        } catch {
          serialized[key] = '[Unserializable Property]';
        }
      }
    }

    return serialized;
  }

  private serializeObject(obj: any, seen: WeakSet<object>, depth: number): any {
    const result: any = {};

    // Get enumerable properties
    for (const [key, value] of Object.entries(obj)) {
      try {
        result[key] = this.serializeRecursive(value, seen, depth + 1);
      } catch (error) {
        result[key] = `[Serialization Error: ${String(error)}]`;
      }
    }

    // Optionally include non-enumerable properties
    if (this.options.includeNonEnumerable) {
      const descriptors = Object.getOwnPropertyDescriptors(obj);
      for (const [key, descriptor] of Object.entries(descriptors)) {
        if (!descriptor.enumerable && descriptor.value !== undefined && !(key in result)) {
          try {
            result[`__${key}`] = this.serializeRecursive(descriptor.value, seen, depth + 1);
          } catch (error) {
            result[`__${key}`] = `[Non-enumerable Serialization Error: ${String(error)}]`;
          }
        }
      }
    }

    return result;
  }
}

// Default serializer instance
export const defaultSerializer = new SafeSerializer();

/**
 * Convenience function for safe serialization
 */
export function safeSerialize(value: any, options?: SerializationOptions): any {
  if (options) {
    const serializer = new SafeSerializer(options);
    return serializer.serialize(value);
  }
  return defaultSerializer.serialize(value);
}

/**
 * Convenience function for serializing context objects
 */
export function serializeContext(context: Record<string, any>, options?: SerializationOptions): Record<string, any> {
  if (options) {
    const serializer = new SafeSerializer(options);
    return serializer.serializeContext(context);
  }
  return defaultSerializer.serializeContext(context);
}
