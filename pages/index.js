import Hero from "../src/components/ui/Hero";
import Navbar from "../src/components/ui/Navbar";
import PourquoiQuinoIA from "../src/components/ui/Features/PourquoiQuinoIA";
import CeQueTuVasRecevoir from "../src/components/ui/Features/CeQueTuVasRecevoir";
import Testimonial from "../src/components/ui/Testimonial";
import Footer from "../src/components/ui/Footer";
import FooterCTA from "../src/components/ui/FooterCTA";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <PourquoiQuinoIA />
      <CeQueTuVasRecevoir />
      <Testimonial />
      <FooterCTA />
      <Footer />
    </>
  );
}
