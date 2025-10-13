/**
 * API Route: Onboarding Submit
 * POST /api/onboarding/submit
 *
 * Creates a user submission (preferences) without generating a menu
 * Used during onboarding to configure user preferences before first menu generation
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createLogger } from '@/lib/logger';
import { withAuth } from '@/middleware/withAuth';
import type { SessionUser } from '@/lib/auth/session';
import { getServiceClient } from '@/lib/supabase/client';
import { z } from 'zod';
import { dietMap, cookingLevelMap, proteinPreferenceMap, equipmentMap, genderMap } from '@/schemas/mappers';

// Validation schema for onboarding submission
const onboardingSchema = z.object({
  // User profile
  firstName: z.string().min(1, 'First name is required'),
  age: z.number().int().min(1).max(120).nullable(),
  gender: z.string().nullable(),

  // Dietary preferences
  diet: z.string().min(1, 'Diet is required'),
  proteinPreferences: z.array(z.string()).default([]),
  equipmentAvailable: z.array(z.string()).default([]),
  cookingLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  numRecipes: z.number().int().min(2).max(7).default(7),
  numServings: z.number().int().min(1).max(4).default(2),
  dislikedFoods: z.string().optional(),
});

async function handler(req: NextApiRequest, res: NextApiResponse, userId: string, sessionUser: SessionUser) {
  const logger = createLogger();
  const supabase = getServiceClient();

  logger.info('Onboarding submission started', {
    method: req.method,
    userId
  });

  res.setHeader('X-Run-ID', logger.getRunId());

  // Method check
  if (req.method !== 'POST') {
    logger.warn('Invalid method', { method: req.method });
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // Parse and validate body
    const parsed = onboardingSchema.safeParse(req.body);

    if (!parsed.success) {
      logger.warn('Validation failed', {
        errors: parsed.error
      });
      return res.status(400).json({
        error: 'Données invalides',
        details: parsed.error
      });
    }

    const data = parsed.data;

    // Map form values to database enums
    const mappedDiet = dietMap[data.diet as keyof typeof dietMap] || 'omnivore';
    const mappedGender = data.gender ? (genderMap[data.gender as keyof typeof genderMap] || null) : null;
    const mappedProteinPreferences = data.proteinPreferences
      .map(pref => proteinPreferenceMap[pref as keyof typeof proteinPreferenceMap])
      .filter(Boolean);
    const mappedEquipment = data.equipmentAvailable
      .map(eq => equipmentMap[eq as keyof typeof equipmentMap])
      .filter(Boolean);

    // Build rawFormJson (for audit trail - stores original form values)
    const rawFormJson = {
      firstName: data.firstName,
      age: data.age,
      gender: data.gender,
      diet: data.diet,
      proteinPreferences: data.proteinPreferences,
      equipmentAvailable: data.equipmentAvailable,
      cookingLevel: data.cookingLevel,
      numRecipes: data.numRecipes,
      numServings: data.numServings,
      dislikedFoods: data.dislikedFoods,
    };

    // Build normalizedInput (stores mapped/normalized values for processing)
    const normalizedInput = {
      age: data.age,
      gender: mappedGender,
      diet: mappedDiet,
      proteinPreferences: mappedProteinPreferences,
      equipmentAvailable: mappedEquipment,
      cookingLevel: data.cookingLevel,
      numRecipes: data.numRecipes,
      numServings: data.numServings,
      dislikedFoods: data.dislikedFoods,
    };

    logger.info('Mapped form values', {
      originalDiet: data.diet,
      mappedDiet,
      originalGender: data.gender,
      mappedGender,
      cookingLevel: data.cookingLevel
    });

    // Update user firstName
    const { error: userUpdateError } = await supabase
      .from('user')
      .update({
        firstName: data.firstName,
      })
      .eq('id', userId);

    if (userUpdateError) {
      logger.error('Failed to update user firstName', {
        error: userUpdateError,
        errorDetails: JSON.stringify(userUpdateError),
        userId
      });
      throw userUpdateError;
    }

    logger.info('User firstName updated', {
      userId,
      firstName: data.firstName
    });

    // Check if user already has a submission
    const { data: existingSubmission } = await supabase
      .from('submission')
      .select('id')
      .eq('userId', userId)
      .single();

    if (existingSubmission) {
      logger.info('User already has submission, updating...', {
        userId,
        existingSubmissionId: existingSubmission.id
      });

      // Update existing submission
      const { error: updateError } = await supabase
        .from('submission')
        .update({
          age: data.age,
          gender: mappedGender,
          diet: mappedDiet,
          proteinPreferences: mappedProteinPreferences,
          equipmentAvailable: mappedEquipment,
          cookingLevel: data.cookingLevel,
          numRecipes: data.numRecipes,
          numServings: data.numServings,
          dislikedFoods: data.dislikedFoods,
          rawFormJson,
          normalizedInput,
        })
        .eq('id', existingSubmission.id);

      if (updateError) {
        logger.error('Failed to update submission', {
          error: updateError,
          errorDetails: JSON.stringify(updateError),
          userId
        });
        throw updateError;
      }

      logger.info('Submission updated successfully', {
        submissionId: existingSubmission.id,
        userId
      });

      return res.status(200).json({
        success: true,
        message: 'Préférences mises à jour',
        submissionId: existingSubmission.id
      });
    }

    // Create new submission
    const { data: newSubmission, error: insertError } = await supabase
      .from('submission')
      .insert([{
        userId,
        age: data.age,
        gender: mappedGender,
        diet: mappedDiet,
        proteinPreferences: mappedProteinPreferences,
        equipmentAvailable: mappedEquipment,
        cookingLevel: data.cookingLevel,
        numRecipes: data.numRecipes,
        numServings: data.numServings,
        dislikedFoods: data.dislikedFoods,
        rawFormJson,
        normalizedInput,
        consentedAt: new Date().toISOString(),
      }])
      .select()
      .single();

    if (insertError || !newSubmission) {
      logger.error('Failed to create submission', {
        error: insertError,
        errorDetails: JSON.stringify(insertError),
        userId,
        submittedData: {
          diet: data.diet,
          cookingLevel: data.cookingLevel,
          numRecipes: data.numRecipes,
          numServings: data.numServings
        }
      });
      throw insertError || new Error('No submission returned');
    }

    logger.info('Submission created successfully', {
      submissionId: newSubmission.id,
      userId,
      diet: data.diet
    });

    return res.status(201).json({
      success: true,
      message: 'Préférences enregistrées',
      submissionId: newSubmission.id
    });

  } catch (error) {
    logger.error('Onboarding submission error', {
      error: error instanceof Error ? error.message : String(error),
      userId
    });

    return res.status(500).json({
      error: 'Erreur serveur',
      message: error instanceof Error ? error.message : 'Une erreur est survenue'
    });
  }
}

export default withAuth(handler);
