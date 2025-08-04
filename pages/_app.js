import { useEffect } from "react";
import Head from "next/head";
import "../styles/globals.css";
import { AnimatePresence, LazyMotion, domAnimation } from "framer-motion";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    const nav = document.getElementById("navbar");
    const onScroll = () => {
      if (!nav) return;
      if (window.scrollY > 10) {
        nav.classList.add("shadow-md");
      } else {
        nav.classList.remove("shadow-md");
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <Head>
        <title>QuinoIA</title>
        <meta
          name="description"
          content="Quinoia est l assistant nutritionnel intelligent qui transforme ta semaine en un menu personnalisé, sain, à base de produits bruts, sans que tu aies à y penser."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.png" />
      </Head>
      <main>
        <LazyMotion features={domAnimation}>
          <AnimatePresence>
            <Component {...pageProps} />
          </AnimatePresence>
        </LazyMotion>
      </main>
    </>
  );
}
