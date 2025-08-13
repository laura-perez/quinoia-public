// Declare grecaptcha for TypeScript
declare const grecaptcha: {
  execute(siteKey: string, options: { action: string }): Promise<string>;
};
// src/components/form/form-components/submitMenuForm.ts
// Extracted API/async logic for Step4 form submission (TypeScript)

export interface SubmitMenuFormParams {
  formData: Record<string, any>;
  agreed: boolean;
}

export default async function SubmitMenuForm({
  formData,
  agreed,
}: SubmitMenuFormParams): Promise<void> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) throw new Error("reCAPTCHA site key is not defined");
  const token = await grecaptcha.execute(siteKey, { action: "submit_form" });
  const body = JSON.stringify({
    ...formData,
    recaptchaToken: token,
    consent: agreed,
  });

  const response = await fetch("/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!response.ok) throw new Error("Erreur lors de l’envoi.");
}
