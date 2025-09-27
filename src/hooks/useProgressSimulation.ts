/**
 * Hook for simulating progress during form submission
 * Provides smooth animation through predefined steps
 */

import { useState, useEffect, useCallback } from 'react';

interface ProgressStep {
  progress: number;
  message: string;
  duration: number;
}

const PROGRESS_STEPS: ProgressStep[] = [
  {
    progress: 25,
    message: "Analyse de tes préférences alimentaires...",
    duration: 3000
  },
  {
    progress: 50,
    message: "Sélection de tes recettes personnalisées...",
    duration: 4000
  },
  {
    progress: 75,
    message: "Création de ta liste de courses...",
    duration: 3000
  },
  {
    progress: 100,
    message: "Finalisation de ton menu...",
    duration: 3000
  }
];

interface UseProgressSimulationReturn {
  progress: number;
  currentStep: string;
  isCompleted: boolean;
  startProgress: () => void;
  resetProgress: () => void;
  forceComplete: () => void;
}

export function useProgressSimulation(): UseProgressSimulationReturn {
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentStep = PROGRESS_STEPS[currentStepIndex]?.message || "Démarrage...";

  const startProgress = useCallback(() => {
    setProgress(0);
    setCurrentStepIndex(0);
    setIsRunning(true);
    setIsCompleted(false);
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(0);
    setCurrentStepIndex(0);
    setIsRunning(false);
    setIsCompleted(false);
  }, []);

  const forceComplete = useCallback(() => {
    setProgress(100);
    setCurrentStepIndex(PROGRESS_STEPS.length - 1);
    setIsCompleted(true);
    setIsRunning(false);
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const currentStepData = PROGRESS_STEPS[currentStepIndex];
    if (!currentStepData) return;

    // Calculer le point de départ (étape précédente ou 0)
    const previousProgress = currentStepIndex > 0 ? PROGRESS_STEPS[currentStepIndex - 1].progress : 0;
    const targetProgress = currentStepData.progress;
    const duration = currentStepData.duration;
    const startTime = Date.now();

    const animateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);

      // Animation easing (ease-out)
      const easedProgress = 1 - Math.pow(1 - progressRatio, 3);
      const newProgress = previousProgress + (targetProgress - previousProgress) * easedProgress;

      setProgress(newProgress);

      if (progressRatio < 1) {
        requestAnimationFrame(animateProgress);
      } else {
        // Étape terminée
        if (currentStepIndex < PROGRESS_STEPS.length - 1) {
          // Passer à l'étape suivante après une pause pour laisser voir l'étape
          setTimeout(() => {
            setCurrentStepIndex(prev => prev + 1);
          }, 800);
        } else {
          // Toutes les étapes terminées
          setIsCompleted(true);
          setIsRunning(false);
        }
      }
    };

    requestAnimationFrame(animateProgress);
  }, [isRunning, currentStepIndex]);

  return {
    progress,
    currentStep,
    isCompleted,
    startProgress,
    resetProgress,
    forceComplete
  };
}