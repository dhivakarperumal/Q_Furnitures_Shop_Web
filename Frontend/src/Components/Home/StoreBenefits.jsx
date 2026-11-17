import {
  Award,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";
import PageContainer from "../CommenComponents/PageContainer";

const storeBenefits = [
  { icon: Truck, title: "Free Delivery", detail: "Across India" },
  { icon: ShieldCheck, title: "5 Years", detail: "Warranty" },
  { icon: RefreshCw, title: "Easy Returns", detail: "Hassle-Free" },
  { icon: CreditCard, title: "EMI Options", detail: "Start from ₹1,999" },
  { icon: Wrench, title: "Installation", detail: "At Your Home" },
  { icon: Award, title: "Quality Assured", detail: "Premium Materials" },
];

const StoreBenefits = () => (
  <section className="py-4" aria-label="Shopping benefits">
    <PageContainer>
      <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[#f1e7de] bg-white shadow-[0_6px_20px_rgba(53,29,14,0.12)] sm:grid-cols-3 lg:grid-cols-6 lg:rounded-full">
        {storeBenefits.map(({ icon: Icon, title, detail }, index) => (
          <div
            key={title}
            className={`flex min-h-[68px] items-center justify-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 ${
              index < storeBenefits.length - 1 ? "lg:border-r lg:border-[#e9e3de]" : ""
            }`}
          >
            <Icon size={25} strokeWidth={1.8} className="shrink-0 text-[#d95f0b]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold leading-4 text-[#251d18] sm:text-xs">{title}</p>
              <p className="text-[10px] leading-4 text-[#594f49] sm:text-[11px]">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  </section>
);

export default StoreBenefits;
