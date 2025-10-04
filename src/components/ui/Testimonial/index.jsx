export default function Testimonials() {
  const testimonials = [
    {
      quote:
        "J’en avais marre de tourner en rond avec les mêmes recettes. Maintenant je découvre de nouvelles idées chaque semaine, et tout est prêt.",
      name: "Marine, 30 ans",
    },
    {
      quote:
        "J’ai testé pas mal d’applis, mais Quinoïa est la seule qui m’a vraiment libéré la tête. Simple, clair, rapide, et ça se cuisine facilement.",
      name: "Sophie, 36 ans",
    },
  ];

  return (
    <section className="bg-[#FDFBF8] py-16">
      <h2 className="text-2xl font-bold text-[#414535] text-center mb-12">
        Elles ont testé Quinoïa
      </h2>
      <div className="custom-screen grid gap-8 md:grid-cols-2">
        {testimonials.map((t, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-[#EAEAEA] p-6 shadow-sm flex flex-col justify-between"
          >
            <p className="text-[#414535] text-lg italic mb-4">“{t.quote}”</p>
            <span className="text-[#8A8A8A] text-sm font-medium">{t.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
