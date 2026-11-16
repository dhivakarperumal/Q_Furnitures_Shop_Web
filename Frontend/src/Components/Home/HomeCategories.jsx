import { useCallback, useEffect, useState } from "react";
import { Armchair, ArrowUpRight } from "lucide-react";
import api from "../../api";
import PageContainer from "../CommenComponents/PageContainer";
import { resolveMediaUrl } from "../../utils/media";

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

  const requestCategories = useCallback(async () => {
    const response = await api.get("/categories");
    if (!Array.isArray(response.data)) {
      throw new Error("The categories response did not contain a category list.");
    }
    return response.data;
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
    <section className="bg-white py-14 sm:py-16">
      <PageContainer>
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a06e46]">Find your style</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#351d0e] sm:text-4xl">Shop by category</h2>
          <p className="mt-2 text-sm text-[#8b735e] sm:text-base">Explore furniture for every room and moment.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-[#eee4d8] bg-white">
                <div className="aspect-[4/3] animate-pulse bg-[#f1e9df]" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-[#f1e9df]" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-[#f1e9df]" />
                </div>
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {categories.map((category) => {
              const image = getCategoryImage(category.images);
              const subcategoryCount = Array.isArray(category.subcategory) ? category.subcategory.length : 0;

              return (
                <article
                  key={category.catId || category.id || category.name}
                  className="group overflow-hidden rounded-2xl border border-[#eee4d8] bg-[#fcfaf7] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(53,29,14,0.1)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#f3e7d8] to-[#dfc6ad]">
                    {image ? (
                      <img
                        src={image}
                        alt={category.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-[#a38365]">
                        <Armchair size={42} strokeWidth={1.2} />
                        <span className="text-xs font-medium uppercase tracking-[0.16em]">Q Living</span>
                      </div>
                    )}
                    <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#634d3b] transition group-hover:bg-[#351d0e] group-hover:text-white">
                      <ArrowUpRight size={17} />
                    </span>
                  </div>
                  <div className="p-3.5 sm:p-4">
                    <h3 className="line-clamp-1 text-sm font-semibold text-[#351d0e] sm:text-base">{category.name}</h3>
                    <p className="mt-1 text-xs text-[#8b735e]">
                      {subcategoryCount} {subcategoryCount === 1 ? "style" : "styles"}
                    </p>
                  </div>
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
