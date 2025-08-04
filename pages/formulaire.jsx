import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import Navbar from "../components/ui/Navbar"
import Step1 from "../components/form/Step1"
import Step2 from "../components/form/Step2"
import Step3 from "../components/form/Step3"
import Step4 from "../components/form/Step4"

const steps = [
  { id: 1, component: Step1 },
  { id: 2, component: Step2 },
  { id: 3, component: Step3 },
  { id: 4, component: Step4 },
]

export default function Formulaire() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({})
  const [email, setEmail] = useState("")

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("quinoia_email")
    if (storedEmail) {
      setEmail(storedEmail)
      setFormData((prev) => ({ ...prev, email: storedEmail }))
    }
  }, [])

  const goToNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep((prev) => prev + 1)
  }

  const goToPrev = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1)
  }

  const updateFormData = (newData) => {
    setFormData((prev) => ({ ...prev, ...newData }))
  }

  const CurrentComponent = steps[currentStep].component
 return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#FDFBF8] px-4 py-6 flex items-center justify-center">
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
  )
}