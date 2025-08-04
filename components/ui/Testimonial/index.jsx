export default function Testimonials() {
  const testimonials = [
    {
      quote:
        "J’en avais marre de réfléchir à mes repas. Maintenant, QuinoIA me propose des plats équilibrés qui me plaisent, et je gagne un temps fou chaque semaine.",
      name: "Marine, 30 ans",
    },
    {
      quote:
        "Je pensais que ça allait être encore une appli reloue. Mais en fait tout est simple, clair, rapide. Et les recettes sont vraiment bonnes.",
      name: "Laura, 36 ans",
    },
  ];

  return (
    <section className="bg-[#FDFBF8] py-16">
      <h2 className="text-2xl font-bold text-[#414535] text-center mb-12">
        Elles ont testé QuinoIA
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
