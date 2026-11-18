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
        ).slice(0, 5);
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
    <section aria-label="Featured furniture combos" className="bg-white py-14 sm:py-16">
      <PageContainer>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a06e46]">Designed to go together</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#351d0e] sm:text-4xl">Featured combos</h2>
            <p className="mt-2 text-sm text-[#8b735e] sm:text-base">Complete your space and save with a curated bundle.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
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
            {/* <Link to="/combo" className="text-sm font-semibold text-[#a34720] transition hover:underline">View all combo offers</Link> */}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
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
