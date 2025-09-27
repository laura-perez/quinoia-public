/**
 * Email Module - Clean exports
 */

export { sendEmail } from './client';
export { sendWelcomeMenuEmail, sendInsufficientRecipesAlert } from './service';
export type { User, MenuData, EmailType } from './types';