import { ArrowRight, Gem, House, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import PageContainer from "../CommenComponents/PageContainer";

const benefits = [
  { label: "Custom Design", Icon: Pencil },
  { label: "Premium Quality", Icon: Gem },
  { label: "Perfect Fit", Icon: House },
];

export default function CustomFurnitureBanner() {
  return (
    <section aria-labelledby="custom-furniture-title" className="py-5 sm:py-7">
      <PageContainer>
        <div className="grid overflow-hidden rounded-[26px] border border-[#f5d6b8] bg-[#fff8ef] shadow-[0_12px_30px_rgba(115,66,28,0.12)] lg:min-h-[240px] lg:grid-cols-[1.05fr_1.08fr_0.87fr]">
          <div className="relative min-h-[190px] overflow-hidden bg-[#f7dfc7] lg:min-h-[240px]">
            <img
              src="/images/pageheader.png"
              alt="Warm living room with contemporary furniture"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover object-[72%_center]"
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent to-[#fff3e4]/35" />
          </div>

          <div className="relative flex flex-col items-center justify-center bg-gradient-to-br from-[#fffaf4] via-[#fff5e9] to-[#ffeddc] px-4 py-6 text-center sm:px-8 lg:px-5 lg:py-5">
            <p className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#542b16] sm:text-xs">
              <span className="h-px w-8 bg-[#ed9a5c] sm:w-12" />
              Your Idea, Our Craft
              <span className="h-px w-8 bg-[#ed9a5c] sm:w-12" />
            </p>
            <h2
              id="custom-furniture-title"
              className="mt-3 whitespace-nowrap text-[clamp(1.7rem,3.2vw,3rem)] font-black leading-none tracking-tight text-[#3b1e0e]"
            >
              Custom <span className="text-[#f36b0b]">Furniture</span>
            </h2>
            <div className="mt-2 flex items-center gap-3">
              <span className="h-[3px] w-8 rounded-full bg-[#f36b0b] sm:w-12" />
              <p className="whitespace-nowrap text-lg font-bold text-[#3b1e0e] sm:text-2xl">
                Tailored for You
              </p>
              <span className="h-[3px] w-8 rounded-full bg-[#f36b0b] sm:w-12" />
            </div>
            <p className="mt-2 text-sm font-medium text-[#69594d] sm:text-base">
              Design. Personalize. Make it yours.
            </p>
            <Link
              to="/contactus"
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#ed4b00] to-[#ff7100] px-7 py-2.5 text-sm font-bold text-white shadow-[0_6px_14px_rgba(232,85,0,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e87500]"
            >
              Explore More
              <ArrowRight size={19} aria-hidden="true" />
            </Link>
          </div>

          <ul
            aria-label="Custom furniture benefits"
            className="grid grid-cols-2 items-center gap-x-2 gap-y-4 bg-gradient-to-br from-[#fff4e5] to-[#ffecd6] px-4 py-6 sm:grid-cols-3 lg:grid-cols-3 lg:gap-x-0 lg:px-3 lg:py-5"
          >
            {benefits.map(({ label, Icon }) => (
              <li key={label} className="flex flex-col items-center gap-1.5 text-center text-[#25160d]">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffdbb3] text-[#a94308] sm:h-14 sm:w-14">
                  <Icon size={25} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <span className="max-w-[88px] text-xs font-bold leading-tight sm:text-sm">
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </PageContainer>
    </section>
  );
}
