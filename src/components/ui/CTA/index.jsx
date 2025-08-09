import Image from "next/image"
import SectionWrapper from "../../SectionWrapper"
import NavLink from "../NavLink"
import cta_image from '../../../../public/cta-img.png'
import LayoutEffect from '../../LayoutEffect'

const CTA = () => {
    return (
        <SectionWrapper className="overflow-hidden">
            <div className="custom-screen flex flex-col-reverse gap-x-12 justify-between md:flex-row md:items-center">
                <LayoutEffect isInviewState={{
                    trueState: "opacity-100 -translate-x-0",
                    falseState: "opacity-0 -translate-x-3"
                }}>
                    <div className="flex-none max-w-xl mt-12 space-y-3 delay-200 duration-300 ease-in md:mt-0">
                        <h2 className="text-gray-800 text-3xl font-semibold sm:text-4xl">
                            Quinoia, ton assiette intelligente. Mieux manger, sans y penser.
                        </h2>
                        <p className="text-gray-600">
                            Quinoia est l’assistant nutritionnel intelligent qui transforme ta semaine en un menu personnalisé, sain, à base de produits bruts, sans que tu aies à y penser.
                        </p>
                        <div className='pt-1'>
                            <NavLink href="#get-started" className="inline-block w-full font-medium text-sm text-white bg-sky-500 hover:bg-sky-600 active:bg-sky-700 shadow rounded-lg sm:w-auto">
                                Get free trial
                            </NavLink>
                        </div>
                    </div>
                </LayoutEffect>
                <LayoutEffect isInviewState={{
                    trueState: "opacity-100 translate-x-0",
                    falseState: "opacity-0 translate-x-3"
                }}>
                    <div className="flex-none w-full delay-200 duration-300 ease-in md:max-w-lg">
                        <Image
                            src={cta_image}
                            alt="CTA image"
                            className='w-full shadow-lg rounded-lg border'
                        />
                    </div>
                </LayoutEffect>
            </div>
        </SectionWrapper>
    )
}

export default CTA