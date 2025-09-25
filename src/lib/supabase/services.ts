import { usersRepository, submissionsRepository } from "./repositories";
import { createLogger, redact } from "../logger";
import type { CreateSubmissionInput } from "./types";
import type { UpsertUserAndSubmissionParams } from "@/schemas";

/**
 * Service layer function that combines user upsert and submission creation
 * This maintains the existing API while using the new repository pattern
 */
export async function upsertUserAndSubmission({
  email,
  normalizedInput,
  recaptchaMeta,
  rawFormData
}: UpsertUserAndSubmissionParams): Promise<{ submissionId: string; userId: string }> {
  const logger = createLogger();
  logger.info('Starting database upsert', { email: redact(email) });
  
  // Upsert user (by email and firstName)
  const user = await usersRepository.upsert({
    email,
    firstName: normalizedInput.firstName
  });
  
  // Prepare submission data with default values for removed fields
  const submissionInput: CreateSubmissionInput = {
    userId: user.id,
    rawFormJson: rawFormData,
    normalizedInput: normalizedInput,
    // Use real data for age and protein preferences
    age: normalizedInput.age,
    gender: normalizedInput.gender,
    diet: normalizedInput.diet,
    proteinPreferences: normalizedInput.proteinPreferences,
    equipmentAvailable: normalizedInput.equipmentAvailable,
    numRecipes: normalizedInput.numRecipes,
    numServings: normalizedInput.numServings,
    dislikedFoods: normalizedInput.dislikedFoods || null,
    favoriteFoods: normalizedInput.favoriteFoods || null,
    cookingLevel: normalizedInput.cookingLevel,
    locale: normalizedInput.locale,
    unitSystem: normalizedInput.unitSystem,
    consent: normalizedInput.consent,
    consentedAt: new Date().toISOString(),
    consentVersion: 'v1',
    recaptchaScore: recaptchaMeta.score,
    recaptchaSuccess: recaptchaMeta.success,
    recaptchaHostname: recaptchaMeta.hostname,
    recaptchaAction: recaptchaMeta.action,
    recaptchaChallengeTs: recaptchaMeta.challenge_ts ? new Date(recaptchaMeta.challenge_ts).toISOString() : null,
    createdAt: new Date().toISOString(),
  };
  
  // Create submission
  const submission = await submissionsRepository.create(submissionInput);
  
  logger.info('Database upsert completed successfully', { 
    submissionId: submission.id,
    userId: user.id,
    email: redact(email)
  });
  
  return {
    submissionId: submission.id,
    userId: user.id
  };
}
