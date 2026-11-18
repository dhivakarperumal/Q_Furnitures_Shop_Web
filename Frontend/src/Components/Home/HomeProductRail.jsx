import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import api from "../../api";
import PageContainer from "../CommenComponents/PageContainer";
import ProductCard from "../Shop/ProductCard";

export default function HomeProductRail({ id, eyebrow, title, description, emptyMessage, sortProducts }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sliderRef = useRef(null);

  const requestProducts = useCallback(async () => {
    const response = await api.get("/products", {
      params: { page: 1, limit: 100, status: "All", exclude_combo_products: true },
    });
    if (!Array.isArray(response.data?.products)) {
      throw new Error("The products response did not contain a product list.");
    }

    const activeProducts = response.data.products.filter((product) =>
      product.status === "Active" && product.product_type !== "Combo Product",
    );
    return sortProducts(activeProducts).slice(0, 10);
  }, [sortProducts]);

  useEffect(() => {
    let active = true;
    requestProducts()
      .then((items) => {
        if (active) {
          setProducts(items);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) {
          console.error(`${title} request failed:`, requestError);
          setError(requestError.response?.data?.message || requestError.message || "Could not load products.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [requestProducts, title]);

  const retryProducts = () => {
    setLoading(true);
    setError("");
    requestProducts()
      .then(setProducts)
      .catch((requestError) => {
        console.error(`${title} request failed:`, requestError);
        setError(requestError.response?.data?.message || requestError.message || "Could not load products.");
      })
      .finally(() => setLoading(false));
  };

  const scrollProducts = (direction) => {
    if (!sliderRef.current) return;
    sliderRef.current.scrollBy({
      left: direction * sliderRef.current.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  return (
    <section id={id} className="py-12 sm:py-14">
      <PageContainer>
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a06e46]">{eyebrow}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#351d0e] sm:text-4xl">{title}</h2>
            <p className="mt-2 text-sm text-[#8b735e] sm:text-base">{description}</p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scrollProducts(-1)}
              aria-label={`Scroll to previous ${title.toLowerCase()}`}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e5d8ca] bg-white text-[#351d0e] transition hover:border-[#351d0e] hover:bg-[#351d0e] hover:text-white"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scrollProducts(1)}
              aria-label={`Scroll to more ${title.toLowerCase()}`}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e5d8ca] bg-white text-[#351d0e] transition hover:border-[#351d0e] hover:bg-[#351d0e] hover:text-white"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-[#eee4d8] bg-white">
                <div className="aspect-[4/3] animate-pulse bg-[#f1e9df]" />
                <div className="space-y-3 p-4">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-[#f1e9df]" />
                  <div className="h-5 w-3/4 animate-pulse rounded bg-[#f1e9df]" />
                  <div className="h-9 animate-pulse rounded bg-[#f1e9df]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center">
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button
              type="button"
              onClick={retryProducts}
              className="mt-4 rounded-lg bg-[#351d0e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a34720]"
            >
              Try again
            </button>
          </div>
        ) : products.length ? (
          <div
            ref={sliderRef}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-3"
            aria-label={title}
          >
            {products.map((product) => (
              <div key={product.id} className="w-[min(82vw,300px)] shrink-0 snap-start sm:w-[min(44vw,300px)] lg:w-[calc((100%-3.75rem)/4)] xl:w-[calc((100%-5rem)/5)]">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d9c4aa] bg-white px-5 py-12 text-center">
            <h3 className="text-lg font-semibold text-[#351d0e]">No {title.toLowerCase()} available right now</h3>
            <p className="mt-2 text-sm text-[#8b735e]">{emptyMessage}</p>
          </div>
        )}
      </PageContainer>
    </section>
  );
}
