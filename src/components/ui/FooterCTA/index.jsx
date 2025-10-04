import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="bg-[#FDFBF8] py-10 px-6">
      <div className="max-w-3xl mx-auto bg-[#F4C95D] rounded-xl shadow-md px-8 py-10 text-center">
        <h2 className="text-2xl font-bold text-[#414535] mb-4">
          Et si tu laissais Quinoïa t’enlever la charge des repas cette semaine ?
        </h2>
        <p className="text-[#414535] text-lg mb-8">
          Plan repas varié, recettes simples, liste de courses clé en main.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch">
          <Link
            href="/formulaire"
            className="inline-flex items-center justify-center bg-[#414535] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#2f3226] transition border-2 border-[#414535]"
          >
            Essayer gratuitement
          </Link>
          <Link
            href="/tarifs"
            className="inline-flex items-center justify-center border-2 border-[#414535] text-[#414535] px-6 py-3 rounded-md font-semibold hover:bg-[#414535] hover:text-white transition"
          >
            Tarifs
          </Link>
        </div>
      </div>
    </section>
  );
}
