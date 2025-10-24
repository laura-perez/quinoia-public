/**
 * Validation constants and utilities
 * Centralized validation patterns for email and other inputs
 */

/**
 * RFC 5322 compliant email regex
 * Supports all valid email characters including:
 * - Plus signs (+) for email aliases (user+tag@domain.com)
 * - Dots, hyphens, underscores
 * - Special characters: !#$%&'*+=?^_`{|}~
 * - Requires at least one dot in domain (TLD required)
 *
 * Examples of valid emails:
 * - user@example.com
 * - user+tag@example.com
 * - first.last@example.co.uk
 * - user_name@test-domain.org
 * - jane.doe+quinoia@proton.me
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}
