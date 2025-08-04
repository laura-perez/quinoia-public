import Hero from "../components/ui/Hero";
import Navbar from "../components/ui/Navbar";
import PourquoiQuinoIA from "../components/ui/Features/PourquoiQuinoIA";
import CeQueTuVasRecevoir from "../components/ui/Features/CeQueTuVasRecevoir";
import Testimonial from "../components/ui/Testimonial";
import Footer from "../components/ui/Footer";
import FooterCTA from "../components/ui/FooterCTA";

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
