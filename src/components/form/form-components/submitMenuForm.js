// src/components/form/form-components/submitMenuForm.js
// Extracted API/async logic for Step4 form submission

export default async function submitMenuForm({ formData, agreed, note, email }) {
  const token = await grecaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, {
    action: "submit_form",
  });
  const body = JSON.stringify({
    ...formData,
    physicalActivity: formData.physicalActivity,
    email,
    recaptchaToken: token,
    primaryGoal: formData.primaryGoal,
    note,
    consent: agreed,
  });
  const response = await fetch("https://your-n8n-instance.example/webhook/menu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!response.ok) throw new Error("Erreur lors de l’envoi.");
}
