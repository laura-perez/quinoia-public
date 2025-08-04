import Link from "next/link"

export default function FinalCTA() {
  return (
    <section className="bg-[#FDFBF8] py-10 px-6">
      <div className="max-w-3xl mx-auto bg-[#F4C95D] rounded-xl shadow-md px-8 py-10 text-center">
        <h2 className="text-2xl font-bold text-[#414535] mb-4">
          Et si tu laissais QuinoIA te simplifier la vie dès cette semaine ?
        </h2>
        <p className="text-[#414535] text-lg mb-8">
          Reçois ton menu personnalisé, ta liste de courses prête, et tes recettes équilibrées – sans rien faire.
        </p>
        <Link
          href="/formulaire"
          className="inline-block bg-[#414535] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#2f3226] transition"
        >
          Voir mon menu
        </Link>
      </div>
    </section>
  )
}
