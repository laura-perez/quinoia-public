import { z } from "zod";

export const submitRequestSchema = z
  .object({
    recaptchaToken: z.string().min(1, "reCAPTCHA manquant"),
    form: z.unknown(),
  })
  .strict();

export type SubmitRequest = z.infer<typeof submitRequestSchema>;
