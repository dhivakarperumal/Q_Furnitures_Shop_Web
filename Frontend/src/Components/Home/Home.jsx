import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import api from "../../api";
import ProductCard from "../ProductCard";

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sliderRef = useRef(null);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await api.get("/products", {
        params: { page: 1, limit: 10, search: "", status: "All" },
      });
      if (!Array.isArray(response.data?.products)) {
        throw new Error("The products response did not contain a product list.");
      }
      setProducts(response.data.products.filter((product) => product.status === "Active"));
      setError("");
    } catch (requestError) {
      console.error("Home products request failed:", requestError);
      setError(requestError.response?.data?.message || requestError.message || "Could not load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const retryProducts = () => {
    setLoading(true);
    fetchProducts();
  };

  const scrollProducts = (direction) => {
    if (!sliderRef.current) return;
    sliderRef.current.scrollBy({
      left: direction * sliderRef.current.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  return (
    <main className="bg-[#fcfaf7]">
      <section className="relative overflow-hidden bg-[#f4eadc]">
        <div className="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full bg-[#e6c6a5]/40 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:py-24">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d9c4aa] bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8b5a35]">
              <Sparkles size={14} /> Thoughtfully made for living
            </span>
            <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-[#351d0e] sm:text-5xl lg:text-6xl">
              Make room for a more beautiful home.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#725d4b] sm:text-lg">
              Discover timeless furniture, crafted for the way you live and made to feel at home.
            </p>
            <a
              href="#featured-products"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#351d0e] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#a34720]"
            >
              Explore our collection <ArrowUpRight size={17} />
            </a>
          </div>
          <div className="relative mx-auto flex aspect-[4/3] w-full max-w-xl items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#ddc2a3] via-[#f2e5d5] to-[#c6a487]">
            <div className="absolute inset-5 rounded-[1.5rem] border border-white/50" />
            <div className="relative max-w-xs px-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#79543a]">Q Living</p>
              <p className="mt-4 font-serif text-4xl leading-tight text-[#351d0e] sm:text-5xl">
                Comfort meets character.
              </p>
              <div className="mx-auto mt-6 h-px w-16 bg-[#a06e46]" />
              <p className="mt-4 text-sm text-[#725d4b]">Furniture that makes every moment feel at home.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="featured-products" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16 lg:px-12">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a06e46]">Made for your space</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#351d0e] sm:text-4xl">Featured furniture</h2>
            <p className="mt-2 text-sm text-[#8b735e] sm:text-base">Find your next favourite piece for home.</p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scrollProducts(-1)}
              aria-label="Scroll to previous products"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e5d8ca] bg-white text-[#351d0e] transition hover:border-[#351d0e] hover:bg-[#351d0e] hover:text-white"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scrollProducts(1)}
              aria-label="Scroll to more products"
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
            aria-label="Featured products"
          >
            {products.map((product) => (
              <div key={product.id} className="w-[min(82vw,300px)] shrink-0 snap-start sm:w-[min(44vw,300px)] lg:w-[calc((100%-3.75rem)/4)]">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d9c4aa] bg-white px-5 py-12 text-center">
            <h3 className="text-lg font-semibold text-[#351d0e]">Our collection is on its way</h3>
            <p className="mt-2 text-sm text-[#8b735e]">Check back soon to discover our latest furniture.</p>
          </div>
        )}

      </section>
    </main>
  );
};

export default Home;
