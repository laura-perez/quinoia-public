/**
 * ProgressOverlay - Overlay de progression pour la soumission du formulaire
 * Affiche une barre de progression animée avec messages user-friendly
 */

import React from 'react';

interface ProgressOverlayProps {
  isVisible: boolean;
  progress: number; // 0-100
  currentStep: string;
}

export function ProgressOverlay({ isVisible, progress, currentStep }: ProgressOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(255, 253, 248, 0.95)',
        backdropFilter: 'blur(2px)'
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: '#F4C95D' }}
          >
            {/* Spinner animé */}
            <div className="relative">
              <div
                className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"
                style={{ animationDuration: '1s' }}
              />
            </div>
          </div>

          <h3
            className="text-xl font-semibold mb-2"
            style={{ color: '#414535' }}
          >
            Création de ton menu
          </h3>

          <p
            className="text-sm opacity-80"
            style={{ color: '#8A8A8A' }}
          >
            Quelques secondes et c'est prêt...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div
            className="w-full bg-gray-200 rounded-full h-3 overflow-hidden"
            style={{ backgroundColor: '#F5F5F5' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor: '#F4C95D',
                boxShadow: '0 0 10px rgba(244, 201, 93, 0.3)'
              }}
            />
          </div>

          {/* Pourcentage */}
          <div className="flex justify-between mt-2">
            <span
              className="text-xs font-medium"
              style={{ color: '#8A8A8A' }}
            >
              {Math.round(progress)}%
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: '#8A8A8A' }}
            >
              Estimation : 10 sec
            </span>
          </div>
        </div>

        {/* Current Step Message */}
        <div className="text-center">
          <p
            className="text-sm font-medium leading-relaxed min-h-[40px] flex items-center justify-center"
            style={{ color: '#414535' }}
          >
            {currentStep}
          </p>
        </div>

        {/* Bottom decoration */}
        <div className="flex justify-center mt-6">
          <div className="flex space-x-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full animate-pulse"
                style={{
                  backgroundColor: '#F4C95D',
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1.5s'
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}