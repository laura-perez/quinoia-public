import { motion } from "framer-motion";

export default function CeQueTuVasRecevoir() {
  const steps = [
    {
      icon: (
        <svg
          width="28"
          height="28"
          fill="none"
          stroke="#414535"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
        </svg>
      ),
      title: "Ton menu personnalisé",
      text: "Des plats déjà choisis rien que pour toi, adaptés à tes préférences.",
    },
    {
      icon: (
        <svg
          width="28"
          height="28"
          fill="none"
          stroke="#414535"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18" />
          <path d="M9 16v-6" />
        </svg>
      ),
      title: "Recettes ultra simples",
      text: "Recettes détaillées, claires et faciles. Toujours accessibles.",
    },
    {
      icon: (
        <svg
          width="28"
          height="28"
          fill="none"
          stroke="#414535"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M12 2a7 7 0 0 1 7 7c0 2.72-2.39 5.05-2.39 5.05-.65.75-1.1 1.77-1.1 2.77v.18a1 1 0 0 1-2 0v-.18c0-1-.45-2.02-1.1-2.77C7.39 14.05 5 11.72 5 9a7 7 0 0 1 7-7z" />
        </svg>
      ),
      title: "Astuces pratiques",
      text: "Des conseils d’organisation pour gagner du temps en cuisine.",
    },
    {
      icon: (
        <svg
          width="28"
          height="28"
          fill="none"
          stroke="#414535"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      ),
      title: "Liste de courses par rayon",
      text: "Une liste interactive et optimisée par rayon, plus jamais perdu·e au supermarché.",
    },
  ];

  return (
    <section className="custom-screen py-16 bg-white">
      <h2 className="text-2xl font-bold text-[#414535] mb-12 text-center">
        Ce que tu reçois chaque semaine
      </h2>
      <ol className="relative max-w-2xl mx-auto pl-6">
        {/* Ligne verticale continue */}
        <span className="absolute left-12 top-0 w-px h-full bg-[#F4C95D]" />

        {steps.map((step, idx) => (
          <li key={idx} className="mb-12 last:mb-0 flex items-start relative">
            {/* Colonne gauche : icône centrée sur la ligne */}
            <div className="relative z-10">
              <div className="w-12 h-12 flex items-center justify-center bg-[#F4C95D] rounded-full ring-8 ring-white shadow-md">
                {step.icon}
              </div>
            </div>

            {/* Colonne droite : texte animé */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="ml-6 flex-1"
            >
              <h3 className="font-semibold text-[#414535] text-lg mb-2">{step.title}</h3>
              <p className="text-[#8A8A8A]">{step.text}</p>
            </motion.div>
          </li>
        ))}
      </ol>
    </section>
  );
}
