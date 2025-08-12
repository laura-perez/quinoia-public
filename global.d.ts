// global.d.ts
// Global type declaration for grecaptcha (Google reCAPTCHA v3)
declare const grecaptcha: {
  execute(siteKey: string, options: { action: string }): Promise<string>;
};
