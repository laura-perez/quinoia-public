// Declare grecaptcha for TypeScript
declare const grecaptcha: {
  execute(siteKey: string, options: { action: string }): Promise<string>;
};
// src/components/form/form-components/submitMenuForm.ts
// Extracted API/async logic for Step4 form submission (TypeScript)

export interface SubmitMenuFormParams {
  formData: Record<string, any>;
  agreed: boolean;
  note: string;
  email: string;
}

export default async function submitMenuForm({
  formData,
  agreed,
}: SubmitMenuFormParams): Promise<void> {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) throw new Error("reCAPTCHA site key is not defined");
  const token = await grecaptcha.execute(siteKey, { action: "submit_form" });
  const body = JSON.stringify({
    ...formData,
    consent: agreed,
    recaptchaToken: token,
  });
  const response = await fetch("https://your-n8n-instance.example/webhook/menu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!response.ok) throw new Error("Erreur lors de l’envoi.");
}
