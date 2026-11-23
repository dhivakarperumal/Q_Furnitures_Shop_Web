import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../api";
import PageContainer from "../CommenComponents/PageContainer";
import ComboOfferCard from "../Shop/ComboOfferCard";

function FeaturedCombos() {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sliderRef = useRef(null);

  useEffect(() => {
    let active = true;
    api.get("/combos", { params: { page: 1, limit: 100, status: "Active" } })
      .then(({ data }) => {
        if (!Array.isArray(data?.combos)) {
          throw new Error("The combos response did not contain a combo list.");
        }
        const featuredCombos = data.combos.filter((combo) =>
          (combo.featured === true || combo.featured === 1),
        );
        if (active) setCombos(featuredCombos);
      })
      .catch((requestError) => {
        console.error("Featured combos request failed:", requestError);
        if (active) {
          setError(requestError.response?.data?.message || requestError.message || "Could not load featured combos.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const scrollCombos = (direction) => {
    if (!sliderRef.current) return;
    sliderRef.current.scrollBy({
      left: direction * sliderRef.current.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  if (!loading && !error && !combos.length) return null;

  return (
    <section aria-label="Featured furniture combos" className="relative overflow-hidden bg-gradient-to-r from-[#fffaf4] via-[#fffdf9] to-[#fff8ef] py-14 sm:py-16">
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-[#ffd0a7]/45" />
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full border-[18px] border-[#ffd4b1]/45" />
      <PageContainer className="relative">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex rounded-full bg-[#ff6a00] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white">Designed to go together</p>
            <h2 className="relative mt-2 pb-3 text-3xl font-black tracking-tight text-[#351d0e] after:absolute after:bottom-0 after:left-0 after:h-1 after:w-20 after:rounded-full after:bg-[#ff7a1a] sm:text-4xl">Featured <span className="text-[#ff7a1a]">Combos</span></h2>
            <p className="mt-2 text-sm text-[#8b735e] sm:text-base">Complete your space and save with a curated bundle.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link to="/combo" className="group inline-flex items-center gap-2 rounded-full border-2 border-[#ff7a1a] px-5 py-2.5 text-sm font-bold text-[#ff6a00] transition hover:bg-[#ff7a1a] hover:text-white sm:text-base">
              See All
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => scrollCombos(-1)}
                aria-label="Scroll to previous combos"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e5d8ca] bg-white text-[#351d0e] transition hover:border-[#351d0e] hover:bg-[#351d0e] hover:text-white"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => scrollCombos(1)}
                aria-label="Scroll to more combos"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e5d8ca] bg-white text-[#351d0e] transition hover:border-[#351d0e] hover:bg-[#351d0e] hover:text-white"
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-[#f1e9df]" />
            ))}
          </div>
        ) : error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-5 text-center text-sm text-red-800">{error}</p>
        ) : (
          <div
            ref={sliderRef}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-3"
            aria-label="Featured combos"
          >
            {combos.map((combo) => (
              <div key={combo.id} className="w-[min(82vw,300px)] shrink-0 snap-start sm:w-[min(44vw,300px)] lg:w-[calc((100%-3.75rem)/4)] xl:w-[calc((100%-5rem)/5)]">
                <ComboOfferCard combo={combo} />
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    </section>
  );
}

export default FeaturedCombos;
