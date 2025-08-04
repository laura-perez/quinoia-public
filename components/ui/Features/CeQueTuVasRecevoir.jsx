import { motion } from "framer-motion"

export default function CeQueTuVasRecevoir() {
  const steps = [
    {
      icon: (
        <svg width="28" height="28" fill="none" stroke="#414535" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
        </svg>
      ),
      title: "Menu personnalisé",
      text: "Des plats déjà choisis rien que pour toi, adaptés à tes goûts et objectifs.",
    },
    {
      icon: (
        <svg width="28" height="28" fill="none" stroke="#414535" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="6" width="18" height="12" rx="2"/>
          <path d="M3 10h18"/>
          <path d="M9 16v-6"/>
        </svg>
      ),
      title: "Recettes ultra simples",
      text: "Recettes détaillées, claires, jamais plus de 5 étapes. Toujours accessibles.",
    },
    {
      icon: (
        <svg width="28" height="28" fill="none" stroke="#414535" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 18h6"/>
          <path d="M10 22h4"/>
          <path d="M12 2a7 7 0 0 1 7 7c0 2.72-2.39 5.05-2.39 5.05-.65.75-1.1 1.77-1.1 2.77v.18a1 1 0 0 1-2 0v-.18c0-1-.45-2.02-1.1-2.77C7.39 14.05 5 11.72 5 9a7 7 0 0 1 7-7z"/>
        </svg>
      ),
      title: "Astuces hyper personnalisées",
      text: "Des conseils d’organisation adaptés à ton rythme, ton niveau, tes contraintes.",
    },
    {
      icon: (
        <svg width="28" height="28" fill="none" stroke="#414535" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="9" cy="21" r="1"/>
          <circle cx="19" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
      ),
      title: "Liste de courses par rayon",
      text: "Une liste organisée et optimisée, plus jamais perdu·e au supermarché.",
    },
  ];

  return (
    <section className="custom-screen py-16 bg-white">
      <h2 className="text-2xl font-bold text-[#414535] mb-12 text-center">
        Ce que tu vas recevoir chaque semaine
      </h2>
      <ol className="relative border-l-2 border-[#F4C95D] max-w-2xl mx-auto">
        {steps.map((step, idx) => (
            <li key={idx} className="mb-12 ml-0 last:mb-0 flex flex-col md:flex-row md:items-start relative">
            {/* Icône fixe */}
            <span className="absolute -left-6 top-0 flex items-center justify-center w-12 h-12 bg-[#F4C95D] rounded-full ring-8 ring-white shadow-md">
                {step.icon}
            </span>
            {/* Texte animé (pas le <li> complet) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="mt-4 md:mt-0 md:ml-6"
            >
                <h3 className="font-semibold text-[#414535] text-lg mb-2 ml-6">{step.title}</h3>
                <p className="text-[#8A8A8A] ml-6">{step.text}</p>
            </motion.div>
            </li>
        ))}
        </ol>
    </section>
  );
}
