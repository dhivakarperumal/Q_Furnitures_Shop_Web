import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import PageContainer from "../CommenComponents/PageContainer";
import ProductCard from "../Shop/ProductCard";

function FeaturedCombos() {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/products", { params: { page: 1, limit: 100, status: "Active" } })
      .then(({ data }) => {
        if (!Array.isArray(data?.products)) {
          throw new Error("The products response did not contain a product list.");
        }
        const featuredCombos = data.products.filter((product) =>
          product.product_type === "Combo Product" &&
          (product.featured === true || product.featured === 1),
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
          <Link to="/combo" className="text-sm font-semibold text-[#a34720] transition hover:underline">View all combo offers</Link>
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {combos.map((combo) => <ProductCard key={combo.id} product={combo} />)}
          </div>
        )}
      </PageContainer>
    </section>
  );
}

export default FeaturedCombos;
