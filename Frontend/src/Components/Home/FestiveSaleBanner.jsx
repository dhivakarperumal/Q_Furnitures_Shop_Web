import { Armchair, Leaf, ShieldCheck, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import PageContainer from "../CommenComponents/PageContainer";

const highlights = [
  { icon: Armchair, label: "Exclusive Designs" },
  { icon: Leaf, label: "Premium Quality" },
  { icon: Truck, label: "Free Delivery" },
  { icon: ShieldCheck, label: "5 Years Warranty" },
];

export default function FestiveSaleBanner() {
  return (
    <section aria-labelledby="festive-sale-title" className="py-4 sm:py-6">
      <PageContainer>
        <div className="grid items-center gap-4 overflow-hidden rounded-2xl border border-[#8a4a1b] bg-gradient-to-r from-[#351707] via-[#6e310d] to-[#9b4a13] p-4 text-white shadow-[0_8px_24px_rgba(53,29,14,0.16)] sm:grid-cols-2 sm:p-5 xl:grid-cols-[180px_170px_140px_minmax(0,1fr)_auto] xl:gap-4 xl:p-4">
          <div className="sm:pr-4 xl:border-r xl:border-white/25">
            <p className="text-xs font-semibold tracking-wide text-[#f3d9bd]">Celebrate in style</p>
            <h2 id="festive-sale-title" className="mt-1 text-xl font-extrabold leading-tight sm:text-2xl">
              Festive
              <span className="block text-[#ffc16e]">Furniture Sale</span>
            </h2>
          </div>

          <p className="text-sm font-medium leading-5 text-white/85">
            Up to <span className="text-3xl font-black text-[#ffad45]">40%</span>
            <span className="ml-1 font-bold text-white">off</span>
            <span className="mt-1 block text-xs text-[#f3d9bd]">on selected collections</span>
          </p>

          <div className="relative h-[76px] overflow-hidden rounded-xl bg-[#75441f] sm:col-span-2 xl:col-span-1">
            <img
              src="/images/pageheader1.png"
              alt="Furniture featured in the festive sale"
              loading="lazy"
              className="h-full w-full object-cover object-[70%_center]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#4c230c]/35 via-transparent to-[#4c230c]/15" />
          </div>

          <ul aria-label="Furniture benefits" className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4 xl:col-span-1">
            {highlights.map(({ icon: Icon, label }) => (
              <li key={label} className="flex flex-col items-center gap-1 text-center text-[10px] font-semibold leading-4 text-white/90">
                <Icon size={18} strokeWidth={1.8} className="text-[#ffc16e]" aria-hidden="true" />
                <span>{label}</span>
              </li>
            ))}
          </ul>

          <Link
            to="/#offer-products"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#f07816] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-black/15 transition hover:-translate-y-0.5 hover:bg-[#ff8c26] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc16e]"
          >
            Shop the Sale
          </Link>
        </div>
      </PageContainer>
    </section>
  );
}
