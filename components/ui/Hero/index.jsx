import Image from "next/image"
import SubscribeForm from "../SubscribeForm"
import previewImage from "../../../public/hero_image.png"
import LayoutEffect from "../../LayoutEffect"

const Hero = () => {
    return (
        <LayoutEffect isInviewState={{
            trueState: "opacity-100 -translate-y-0",
            falseState: "opacity-0 -translate-y-3"
        }}>
            <section className="pt-8 md:pt-12 lg:pt-16 pb-0 overflow-hidden bg-[#FDFBF8] text-[#414535] duration-300 ease-in">
                <div className="custom-screen items-center gap-12 md:flex">
                    <div className='flex-none space-y-6 max-w-2xl'>
                        <h1 className="text-4xl font-extrabold sm:text-5xl">
                            Bien manger, sans y penser.
                        </h1>
                        <p className="text-lg text-[#8A8A8A]">
                            Reçois ton menu personnalisé chaque semaine. Sain, simple, rassasiant.
                        </p>
                        <SubscribeForm />
                    </div>
                    <div className='flex-none mt-12 md:mt-0'>
                        <Image
                            src={previewImage}
                            alt="Quinoïa aperçu"
                            className="w-full md:max-w-2xl"
                            priority
                        />
                    </div>
                </div>
            </section>
        </LayoutEffect>
    )
}

export default Hero
