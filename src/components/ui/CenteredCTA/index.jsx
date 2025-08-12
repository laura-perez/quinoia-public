import NavLink from "../NavLink";

const CenteredCTA = () => {
  return (
    <section className="custom-screen text-center">
      <div className="max-w-2xl md:mx-auto">
        <h2 className="text-gray-800 text-3xl font-semibold sm:text-4xl">
          Quinoia, ton assiette intelligente. Mieux manger, sans y penser.
        </h2>
        <p className="mt-3 text-gray-600">
          Quinoia est l’assistant nutritionnel intelligent qui transforme ta semaine en un menu
          personnalisé, sain, à base de produits bruts, sans que tu aies à y penser.
        </p>
      </div>
      <div className="mt-4">
        <NavLink
          href="#get-started"
          className="inline-block w-full font-medium text-sm text-white bg-sky-500 hover:bg-sky-600 active:bg-sky-700 shadow rounded-lg sm:w-auto"
        >
          Try for free
        </NavLink>
      </div>
    </section>
  );
};

export default CenteredCTA;
