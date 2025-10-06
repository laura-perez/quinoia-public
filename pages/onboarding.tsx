import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "../src/components/ui/Navbar";
import Step1 from "../src/components/form/Step1";
import Step2 from "../src/components/form/Step2";
import Step3 from "../src/components/form/Step3";
import Step4Onboarding from "../src/components/form/Step4Onboarding";

const steps = [
  { id: 1, component: Step1 },
  { id: 2, component: Step2 },
  { id: 3, component: Step3 },
  { id: 4, component: Step4Onboarding },
];

export default function Onboarding() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Initialize with defaults
    numRecipes: "3",
    numServings: "2",
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/dashboard/status');

        if (!response.ok) {
          if (response.status === 401) {
            // Not authenticated - redirect to login
            router.push('/login');
            return;
          }
        }

        setIsAuthenticated(true);
      } catch (error) {
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const goToNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep((prev) => prev + 1);
  };

  const goToPrev = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const updateFormData = (newData: any) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF8] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#414535] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Only render if authenticated
  if (!isAuthenticated) {
    return null;
  }

  const CurrentComponent = steps[currentStep].component;

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FDFBF8] px-4 py-6 flex items-start justify-center">
        <div className="w-full max-w-xl bg-white rounded-xl shadow-xl p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4 }}
            >
              <CurrentComponent
                formData={formData}
                updateFormData={updateFormData}
                goToNext={goToNext}
                goToPrev={goToPrev}
                email=""
                isLast={currentStep === steps.length - 1}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
