import { useEffect, useState } from "react";
import api from "../../api";
import PageContainer from "../CommenComponents/PageContainer";
import PageHeader from "../CommenComponents/PageHeader";
import ProductCard from "./ProductCard";

function ComboOffers() {
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
        const today = new Date().toISOString().slice(0, 10);
        const availableCombos = data.products.filter((product) => {
          if (product.product_type !== "Combo Product") return false;
          if (product.offer_product === false || product.offer_product === 0) return false;
          if (product.offer_start_date && product.offer_start_date > today) return false;
          if (product.offer_end_date && product.offer_end_date < today) return false;
          return Number(product.offer) > 0;
        });
        if (active) setCombos(availableCombos);
      })
      .catch((requestError) => {
        console.error("Combo offers request failed:", requestError);
        if (active) {
          setError(requestError.response?.data?.message || requestError.message || "Could not load combo offers.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageHeader title="Combo offers" />
      <main className="min-h-[60vh] bg-[#fcfaf7] py-10 sm:py-14">
        <PageContainer>
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a06e46]">More value, together</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#351d0e] sm:text-4xl">Furniture combos</h2>
            <p className="mt-2 text-sm text-[#8b735e] sm:text-base">Hand-picked bundles with clear pricing and savings.</p>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-[#f1e9df]" />
              ))}
            </div>
          ) : error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800">{error}</p>
          ) : combos.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {combos.map((combo) => <ProductCard key={combo.id} product={combo} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#d9c4aa] bg-white px-5 py-14 text-center">
              <h3 className="text-lg font-semibold text-[#351d0e]">No combo offers are available right now</h3>
              <p className="mt-2 text-sm text-[#8b735e]">Check back soon for special furniture bundles.</p>
            </div>
          )}
        </PageContainer>
      </main>
    </>
  );
}

export default ComboOffers;
