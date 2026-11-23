import { Armchair, ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import PageContainer from "../CommenComponents/PageContainer";

export default function CustomFurnitureBanner() {
  return (
    <section aria-labelledby="custom-furniture-title" className="py-5 sm:py-7">
      <PageContainer>
        <div className="relative isolate grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3 gap-y-3 overflow-hidden rounded-[24px] border-2 border-[#ffe3cb] bg-white p-2 shadow-[0_8px_24px_rgba(53,29,14,0.07)] before:pointer-events-none before:absolute before:-right-8 before:top-0 before:-z-10 before:h-36 before:w-36 before:rounded-full before:bg-[#fff1df] after:pointer-events-none after:absolute after:-bottom-14 after:left-[28%] after:-z-10 after:h-24 after:w-48 after:rounded-[50%] after:bg-[#ffe6ce] sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-4 sm:p-3 lg:grid-cols-[220px_minmax(0,1.2fr)_minmax(210px,0.8fr)] lg:gap-5 lg:p-2">
          <div className="relative h-[112px] overflow-hidden rounded-[18px] bg-[#f7eadb] sm:h-[128px] lg:h-[132px]">
            <img
              src="/images/pageheader.png"
              alt="Warm, contemporary furniture in a living room"
              loading="lazy"
              className="h-full w-full object-cover object-[72%_center]"
            />
            <span className="absolute -right-7 top-1/2 h-36 w-16 -translate-y-1/2 rounded-[50%] bg-[#f07816]/90 sm:-right-9 sm:w-20" />
            <span className="absolute right-1 top-1/2 flex h-[58px] w-[58px] -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#ff8c1a] to-[#df5d00] text-center text-white shadow-[0_2px_8px_rgba(125,57,0,0.28)] sm:right-2 sm:h-[68px] sm:w-[68px]">
              <Armchair size={17} strokeWidth={1.8} aria-hidden="true" />
              <span className="mt-0.5 text-[7px] font-extrabold uppercase leading-[1.05] tracking-wide sm:text-[8px]">
                Custom
                <br />
                Furniture
              </span>
              <span className="mt-0.5 text-[6px] leading-none sm:text-[7px]">JUST FOR YOU</span>
            </span>
          </div>

          <div className="min-w-0 lg:pl-1">
            <h2 id="custom-furniture-title" className="text-[17px] font-extrabold leading-tight text-[#351d0e] sm:text-xl lg:text-[21px]">
              Custom Furniture
              <span className="block whitespace-nowrap text-[#e96b0b]">Tailored <span className="text-[#ff7a1a]">for You</span></span>
              <span className="mt-1 block h-1 w-12 -rotate-2 rounded-full bg-[#ff7a1a] sm:w-14" />
            </h2>
            <p className="mt-2 text-[10px] leading-relaxed text-[#755d49] sm:text-xs">
              Designed around your space, style, and everyday needs.
            </p>
          </div>

          <div className="col-span-2 flex flex-col items-center gap-2 border-t border-[#f3dfce] pt-2 sm:flex-row sm:justify-between sm:gap-3 lg:col-span-1 lg:flex-col lg:items-start lg:justify-center lg:border-l lg:border-t-0 lg:py-1 lg:pl-5">
            <ul aria-label="Custom furniture options" className="flex flex-wrap justify-center gap-x-3 gap-y-1 sm:justify-start lg:flex-col lg:gap-2">
              {["Custom sizes", "Material choices", "Personalized design"].map((benefit) => (
                <li key={benefit} className="inline-flex items-center gap-1 whitespace-nowrap text-[9px] font-semibold text-[#594333] sm:text-[10px] lg:text-xs">
                  <Check size={13} strokeWidth={2.5} className="shrink-0 text-[#e87500]" aria-hidden="true" />
                  {benefit}
                </li>
              ))}
            </ul>

            <Link
              to="/contactus"
              className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#ff8b16] to-[#e85f00] px-5 py-2.5 text-xs font-bold text-white shadow-[0_5px_12px_rgba(232,95,0,0.25)] transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e87500] sm:px-6"
            >
              Explore More
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
