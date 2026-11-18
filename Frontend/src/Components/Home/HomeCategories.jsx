import { useCallback, useEffect, useRef, useState } from "react";
import { Armchair, ArrowLeft, ArrowRight } from "lucide-react";
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

  const scrollCategories = (direction) => {
    if (!sliderRef.current) return;
    sliderRef.current.scrollBy({
      left: direction * sliderRef.current.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  return (
    <section className="bg-white py-10 sm:py-14">
      <PageContainer>
        <div className="mb-5 flex items-center justify-between gap-4 sm:mb-7">
          <h2 className="text-xl font-bold tracking-tight text-[#351d0e] sm:text-2xl">
            Shop by <span className="text-[#e87424]">Category</span>
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => scrollCategories(-1)}
              aria-label="Scroll to previous categories"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#eee4d8] bg-white text-[#634d3b] transition hover:border-[#351d0e] hover:bg-[#351d0e] hover:text-white"
            >
              <ArrowLeft size={17} />
            </button>
            <button
              type="button"
              onClick={() => scrollCategories(1)}
              aria-label="Scroll to more categories"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#eee4d8] bg-white text-[#634d3b] transition hover:border-[#351d0e] hover:bg-[#351d0e] hover:text-white"
            >
              <ArrowRight size={17} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex gap-3 overflow-hidden sm:gap-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="w-28 shrink-0 sm:w-32">
                <div className="aspect-square animate-pulse rounded-2xl bg-[#f1e9df]" />
                <div className="mx-auto mt-3 h-3 w-2/3 animate-pulse rounded bg-[#f1e9df]" />
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
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 sm:gap-4"
            aria-label="Furniture categories"
          >
            {categories.map((category) => {
              const image = getCategoryImage(category.images);

              return (
                <article
                  key={category.catId || category.id || category.name}
                  className="basis-[calc((100%_-_24px)/3)] shrink-0 snap-start sm:basis-[calc((100%_-_80px)/6)] lg:basis-[calc((100%_-_144px)/10)]"
                >
                  <Link
                    to={`/shop?category=${encodeURIComponent(category.name)}`}
                    className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e87500]"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-[#f6eee5] to-[#eee1d3]">
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
                    <h3 className="mt-2 line-clamp-1 text-center text-xs font-semibold text-[#351d0e] transition-colors group-hover:text-[#e87500] sm:text-sm">
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
