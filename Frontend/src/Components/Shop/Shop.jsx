import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import api from "../../api";
import PageContainer from "../CommenComponents/PageContainer";
import PageHeader from "../CommenComponents/PageHeader";
import ProductCard from "./ProductCard";

const PRODUCTS_PER_PAGE = 12;

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get("search")
    || searchParams.get("room")?.replace(/-/g, " ")
    || "";
  const requestedPage = Number(searchParams.get("page"));
  const currentPage = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    api.get("/products", {
      params: {
        page: currentPage,
        limit: PRODUCTS_PER_PAGE,
        search: searchTerm,
        status: "All",
      },
    })
      .then((response) => {
        if (!Array.isArray(response.data?.products)) {
          throw new Error("The products response did not contain a product list.");
        }
        if (active) {
          setProducts(response.data.products);
          setPagination(response.data.pagination || { total: response.data.products.length, totalPages: 1 });
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) {
          console.error("Shop products request failed:", requestError);
          setError(requestError.response?.data?.message || requestError.message || "Could not load products.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentPage, reloadKey, searchTerm]);

  const handleSearch = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextSearch = String(formData.get("search") || "").trim();
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("room");
    nextParams.delete("page");

    if (nextSearch) nextParams.set("search", nextSearch);
    else nextParams.delete("search");

    if (nextSearch === searchTerm && currentPage === 1) return;

    setLoading(true);
    setSearchParams(nextParams);
  };

  const goToPage = (page) => {
    const nextParams = new URLSearchParams(searchParams);
    if (page === 1) nextParams.delete("page");
    else nextParams.set("page", String(page));
    setLoading(true);
    setSearchParams(nextParams);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const retryProducts = () => {
    setLoading(true);
    setError("");
    setReloadKey((key) => key + 1);
  };

  return (
    <>
      <PageHeader title="Shop all furniture" />
      <main className="min-h-[60vh] bg-[#fcfaf7] py-10 sm:py-14">
        <PageContainer>
          <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a06e46]">The Q Living collection</p>
              <p className="mt-2 text-sm text-[#8b735e] sm:text-base">
                Explore our collection and find the right pieces for your home.
              </p>
            </div>
            <form onSubmit={handleSearch} className="flex w-full max-w-md items-center gap-2 rounded-xl border border-[#e5d8ca] bg-white p-2 shadow-sm">
              <Search size={18} className="ml-2 shrink-0 text-[#8b735e]" />
              <input
                key={searchTerm}
                type="search"
                name="search"
                defaultValue={searchTerm}
                placeholder="Search furniture..."
                aria-label="Search furniture"
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-[#351d0e] outline-none placeholder:text-[#a99a8b]"
              />
              <button type="submit" className="rounded-lg bg-[#351d0e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a34720]">
                Search
              </button>
            </form>
          </div>

        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-[#8b735e]">
            {searchTerm ? `Results for “${searchTerm}”` : "All products"}
            {!loading && <span className="ml-2 text-[#a99a8b]">({pagination.total})</span>}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
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
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-10 text-center">
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
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>

            {pagination.totalPages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Product pages">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="rounded-lg border border-[#e5d8ca] bg-white px-4 py-2 text-sm font-semibold text-[#351d0e] transition hover:bg-[#f4eadc] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-[#725d4b]">
                  Page {currentPage} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= pagination.totalPages}
                  className="rounded-lg border border-[#e5d8ca] bg-white px-4 py-2 text-sm font-semibold text-[#351d0e] transition hover:bg-[#f4eadc] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </nav>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d9c4aa] bg-white px-5 py-14 text-center">
            <h2 className="text-lg font-semibold text-[#351d0e]">No products found</h2>
            <p className="mt-2 text-sm text-[#8b735e]">Try a different search or browse the full collection.</p>
          </div>
        )}
        </PageContainer>
      </main>
    </>
  );
};

export default Shop;
