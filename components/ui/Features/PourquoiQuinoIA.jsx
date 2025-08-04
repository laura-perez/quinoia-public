export default function PourquoiQuinoIA() {
  return (
    <section className="custom-screen pt-28 pb-12 bg-gray-50">
      <h2 className="text-2xl font-bold text-[#414535] mb-8 text-center">Quinoïa, c’est bien plus qu’un menu</h2>
      <div className="flex flex-col md:flex-row gap-6 justify-center">
        {/* Card 1 */}
        <div className="flex-1 bg-white rounded-xl border border-[#EAEAEA] p-6 shadow-sm flex flex-col items-center">
          {/* Icône cœur/zen */}
          <span className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#F4C95D]">
            {/* cœur simple */}
            <svg width="28" height="28" fill="none" stroke="#414535" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 21C12 21 3 13.36 3 8.5C3 5.46 5.42 3 8.5 3C10.24 3 11.91 3.81 12.87 5.08C13.83 3.81 15.5 3 17.24 3C20.32 3 22.74 5.46 22.74 8.5C22.74 13.36 12 21 12 21Z"/>
            </svg>
          </span>
          <h3 className="text-lg font-semibold text-[#414535] mb-2">Sérénité garantie</h3>
          <p className="text-[#8A8A8A] text-center">
            Plus de charge mentale des repas.<br/>Tu laisses Quinoïa gérer, tu respires, tu profites.
          </p>
        </div>
        {/* Card 2 */}
        <div className="flex-1 bg-white rounded-xl border border-[#EAEAEA] p-6 shadow-sm flex flex-col items-center">
          <span className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#F4C95D]">
            {/* Panier/Liste */}
            <svg width="28" height="28" fill="none" stroke="#414535" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 6h15l-1.5 9h-12l-1.5-9z"/><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
            </svg>
          </span>
          <h3 className="text-lg font-semibold text-[#414535] mb-2">Menus & courses sans effort</h3>
          <p className="text-[#8A8A8A] text-center">
            Une semaine toute prête :<br/>ton menu personnalisé, ta liste de courses en 1 clic, plus besoin de réfléchir.
          </p>
        </div>
        {/* Card 3 */}
        <div className="flex-1 bg-white rounded-xl border border-[#EAEAEA] p-6 shadow-sm flex flex-col items-center">
          <span className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#F4C95D]">
            {/* feuille simple */}
            <svg width="28" height="28" fill="none" stroke="#414535" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2C12 2 21 7.24 21 14C21 18.42 16.97 22 12 22C7.03 22 3 18.42 3 14C3 7.24 12 2 12 2Z"/>
            </svg>
          </span>
          <h3 className="text-lg font-semibold text-[#414535] mb-2">Du vrai goût, zéro contrainte</h3>
          <p className="text-[#8A8A8A] text-center">
            Des repas sains, à base de produits bruts, pensés pour te régaler.<br/>
            Pas de régime, pas de stats, juste le plaisir de bien manger.
          </p>
        </div>
      </div>
    </section>
  )
}
