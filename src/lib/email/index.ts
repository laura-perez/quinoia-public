/**
 * Email Module - Clean exports
 */

export { sendEmail } from './client';
export {
  sendInsufficientRecipesAlert,
  sendMagicLinkEmail,
  sendWelcomeMenuWithActivationEmail,
  type SendMagicLinkParams,
  type SendWelcomeMenuWithActivationParams
} from './service';
export type { EmailType } from './types';