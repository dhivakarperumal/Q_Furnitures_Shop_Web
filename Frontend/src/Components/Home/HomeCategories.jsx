import { useCallback, useEffect, useRef, useState } from "react";
import { Armchair, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../api";
import PageContainer from "../CommenComponents/PageContainer";
import { resolveMediaUrl } from "../../utils/media";
import { categoryHasProducts } from "../../utils/categories";

function getCategoryImage(images) {
  if (Array.isArray(images)) return resolveMediaUrl(images[0]);
  if (typeof images !== "string" || !images) return "";

  try {
    const parsedImages = JSON.parse(images);
    return resolveMediaUrl(Array.isArray(parsedImages) ? parsedImages[0] : "");
  } catch {
    return resolveMediaUrl(images);
  }
}

const HomeCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sliderRef = useRef(null);

  const requestCategories = useCallback(async () => {
    const response = await api.get("/categories");
    if (!Array.isArray(response.data)) {
      throw new Error("The categories response did not contain a category list.");
    }
    return response.data.filter(categoryHasProducts);
  }, []);

  useEffect(() => {
    let active = true;
    requestCategories()
      .then((items) => {
        if (active) {
          setCategories(items);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) {
          console.error("Home categories request failed:", requestError);
          setError(requestError.response?.data?.message || requestError.message || "Could not load categories.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [requestCategories]);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider || loading || error || categories.length < 2) return undefined;

    const intervalId = window.setInterval(() => {
      const maxScroll = slider.scrollWidth - slider.clientWidth;
      if (maxScroll <= 0) return;

      if (slider.scrollLeft >= maxScroll - 2) {
        slider.style.scrollBehavior = "auto";
        slider.scrollLeft = 0;
        slider.style.scrollBehavior = "";
        return;
      }

      const firstCategory = slider.firstElementChild;
      if (!firstCategory) return;
      const gap = Number.parseFloat(window.getComputedStyle(slider).columnGap) || 0;
      slider.scrollBy({
        left: firstCategory.getBoundingClientRect().width + gap,
        behavior: "smooth",
      });
    }, 3500);

    return () => window.clearInterval(intervalId);
  }, [categories.length, error, loading]);

  const retryCategories = () => {
    setLoading(true);
    setError("");
    requestCategories()
      .then(setCategories)
      .catch((requestError) => {
        console.error("Home categories request failed:", requestError);
        setError(requestError.response?.data?.message || requestError.message || "Could not load categories.");
      })
      .finally(() => setLoading(false));
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#fffaf4] via-[#fffdf9] to-[#fff8ef] py-10 sm:py-14">
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-[#ffd0a7]/45" />
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full border-[18px] border-[#ffd4b1]/45" />
      <PageContainer className="relative">
        <div className="mb-6 flex items-center justify-between gap-4 sm:mb-8">
          <h2 className="relative pb-3 text-2xl font-black tracking-tight text-[#351d0e] after:absolute after:bottom-0 after:left-0 after:h-1 after:w-20 after:rounded-full after:bg-[#ff7a1a] sm:text-3xl">
            Shop by <span className="text-[#e87424]">Category</span>
          </h2>
          <Link
            to="/shop"
            className="group flex shrink-0 items-center gap-2 rounded-full border-2 border-[#ff7a1a] px-4 py-2 text-sm font-bold text-[#ff6a00] transition hover:bg-[#ff7a1a] hover:text-white sm:px-5 sm:py-2.5 sm:text-base"
          >
            See All
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex gap-3 overflow-hidden sm:gap-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="w-[calc((100%-12px)/2)] shrink-0 sm:w-[calc((100%-48px)/4)] lg:w-[calc((100%-80px)/6)] xl:w-[calc((100%-112px)/8)]">
                <div className="aspect-[4/5] animate-pulse rounded-[2rem] bg-[#f1e9df]" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center">
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button
              type="button"
              onClick={retryCategories}
              className="mt-4 rounded-lg bg-[#351d0e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a34720]"
            >
              Try again
            </button>
          </div>
        ) : categories.length ? (
          <div
            ref={sliderRef}
            className="flex snap-x snap-mandatory justify-start gap-3 overflow-x-auto scroll-smooth pb-2 sm:gap-4"
            aria-label="Furniture categories"
          >
            {categories.map((category) => {
              const image = getCategoryImage(category.images);

              return (
                <article
                  key={category.catId || category.id || category.name}
                  className="w-[calc((100%-12px)/2)] shrink-0 snap-start sm:w-[calc((100%-48px)/4)] lg:w-[calc((100%-80px)/6)] xl:w-[calc((100%-112px)/8)]"
                >
                  <Link
                    to={`/shop?category=${encodeURIComponent(category.name)}`}
                    className="group block rounded-[2rem] border border-white/80 bg-gradient-to-b from-[#fff2e7] to-[#ffe2ca] px-2 pb-4 pt-3 shadow-[0_10px_28px_rgba(216,120,54,0.10)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(216,120,54,0.18)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e87500]"
                  >
                    <div className="relative mx-auto aspect-square w-[82%] rounded-full border-[5px] border-white bg-[#fff7ee] p-1 shadow-[0_5px_14px_rgba(227,139,78,0.16)]">
                      <div className="h-full w-full overflow-hidden rounded-full">
                        {image ? (
                          <img
                            src={image}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[#a38365]">
                            <Armchair size={46} strokeWidth={1.2} />
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-3 left-1/2 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border-[3px] border-white bg-[#ff7a1a] text-white shadow-md">
                        <Armchair size={20} strokeWidth={2} />
                      </div>
                    </div>
                    <h3 className="mt-6 overflow-hidden truncate whitespace-nowrap text-center text-sm font-bold leading-tight text-[#351d0e] transition-colors group-hover:text-[#e87500] sm:text-base" title={category.name}>
                      {category.name}
                    </h3>
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d9c4aa] bg-[#fcfaf7] px-5 py-12 text-center">
            <h3 className="text-lg font-semibold text-[#351d0e]">Categories coming soon</h3>
            <p className="mt-2 text-sm text-[#8b735e]">Check back soon to explore our furniture categories.</p>
          </div>
        )}
      </PageContainer>
    </section>
  );
};

export default HomeCategories;
