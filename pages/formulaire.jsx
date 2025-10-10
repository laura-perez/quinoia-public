import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "../src/components/ui/Navbar";
import Step1 from "../src/components/form/Step1";
import Step2 from "../src/components/form/Step2";
import Step3 from "../src/components/form/Step3";
import Step4 from "../src/components/form/Step4";

const steps = [
  { id: 1, component: Step1 },
  { id: 2, component: Step2 },
  { id: 3, component: Step3 },
  { id: 4, component: Step4 },
];

export default function Formulaire() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [email, setEmail] = useState("");
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    const checkUserStatus = async () => {
      const storedEmail = sessionStorage.getItem("quinoia_email");
      if (storedEmail) {
        setEmail(storedEmail);
        setFormData((prev) => ({ ...prev, email: storedEmail }));

        // Check user status in database
        try {
          const response = await fetch('/api/user/check-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: storedEmail }),
          });

          if (response.ok) {
            const data = await response.json();

            // If user exists and status is NOT trial_available, redirect to login
            if (data.exists && data.status !== 'trial_available') {
              router.push('/login');
              return;
            }
          }
        } catch (error) {
          console.error('Error checking user status:', error);
        }
      }
      setIsCheckingStatus(false);
    };

    checkUserStatus();
  }, [router]);

  const goToNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep((prev) => prev + 1);
  };

  const goToPrev = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const updateFormData = (newData) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const CurrentComponent = steps[currentStep].component;

  // Show loading state while checking user status
  if (isCheckingStatus) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-[#FDFBF8] px-4 py-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#F4C95D] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#8A8A8A]">Vérification en cours...</p>
          </div>
        </main>
      </>
    );
  }

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
                email={email}
                isLast={currentStep === steps.length - 1}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
