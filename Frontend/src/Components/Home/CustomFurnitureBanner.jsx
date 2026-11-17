import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import PageContainer from "../CommenComponents/PageContainer";

const steps = ["Choose Design", "Select Material", "Custom Size", "Get a Quote"];

export default function CustomFurnitureBanner() {
  return (
    <section aria-labelledby="custom-furniture-title" className="py-5 sm:py-7">
      <PageContainer>
        <div className="grid items-center gap-4 rounded-2xl border border-[#f0dfcd] bg-white p-3 shadow-[0_8px_24px_rgba(53,29,14,0.07)] sm:p-4 lg:grid-cols-[180px_minmax(190px,0.8fr)_minmax(0,1.8fr)_190px] lg:gap-3">
          <div className="relative h-24 overflow-hidden rounded-xl bg-[#f7eadb] sm:h-28 lg:h-[76px]">
            <img
              src="/images/pageheader.png"
              alt="Warm, contemporary furniture in a living room"
              loading="lazy"
              className="h-full w-full object-cover object-[72%_center]"
            />
            <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#a34720]">
              Made for you
            </span>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a06e46]">Your idea, our craft</p>
            <h2 id="custom-furniture-title" className="mt-1 text-xl font-extrabold leading-tight text-[#351d0e] sm:text-2xl">
              Custom Furniture
              <span className="block text-[#e96b0b]">Tailored for You</span>
            </h2>
          </div>

          <ol aria-label="Custom furniture process" className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:justify-between">
            {steps.map((step) => (
              <li key={step} className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-[#594333]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff0df] text-[#e96b0b]">
                  <Check size={12} strokeWidth={3} aria-hidden="true" />
                </span>
                {step}
              </li>
            ))}
          </ol>

          <Link
            to="/contactus"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f07816] to-[#df5d00] px-5 py-3 text-center text-sm font-bold text-white shadow-md shadow-[#e87500]/20 transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e87500]"
          >
            Request Custom Furniture
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </PageContainer>
    </section>
  );
}
