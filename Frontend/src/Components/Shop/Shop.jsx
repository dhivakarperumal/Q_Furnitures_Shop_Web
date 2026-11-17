import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  Home,
  List,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import api from "../../api";
import { resolveMediaUrl } from "../../utils/media";
import PageContainer from "../CommenComponents/PageContainer";
import PageHeader from "../CommenComponents/PageHeader";
import ProductCard from "../ProductCard";

const MAX_PRICE = 600000;
const MATERIALS = ["Solid Wood", "Engineered Wood", "Upholstered", "Plywood", "Metal"];
const COLORS = [
  ["Natural Teak", "#e7c090"],
  ["Brown", "#86502e"],
  ["Black", "#30241e"],
  ["White", "#ffffff"],
  ["Grey", "#929292"],
  ["Beige", "#e9d8bd"],
];

function getProductImage(product) {
  let images = product?.images;
  if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch {
      images = [images];
    }
  }
  const imageIndex = Number(product?.main_image_index) || 0;
  return resolveMediaUrl(
    (Array.isArray(images) ? images[imageIndex] || images[0] : "") || product?.image || "",
  );
}

function FilterSection({ title, children }) {
  return (
    <section className="border-t border-[#eee4d8] py-3.5">
      <h3 className="mb-2.5 flex items-center justify-between text-[13px] font-bold text-[#302218]">
        {title}
        <ChevronDown size={15} className="text-[#745d48]" />
      </h3>
      {children}
    </section>
  );
}

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get("search")
    || searchParams.get("room")?.replace(/-/g, " ")
    || "";
  const category = searchParams.get("category") || "";
  const material = searchParams.get("material") || "";
  const color = searchParams.get("color") || "";
  const availability = searchParams.get("availability") || "";
  const minRating = searchParams.get("minRating") || "";
  const onSale = searchParams.get("onSale") === "true";
  const maxPrice = Math.min(MAX_PRICE, Math.max(0, Number(searchParams.get("maxPrice")) || MAX_PRICE));
  const sort = searchParams.get("sort") || "featured";
  const requestedPage = Number(searchParams.get("page"));
  const currentPage = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [listView, setListView] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [priceEdit, setPriceEdit] = useState(null);
  const priceDraft = priceEdit?.query === searchParams.toString() ? priceEdit.value : maxPrice;
  const productsPerPage = filterOpen ? 12 : 15;

  useEffect(() => {
    let active = true;
    api.get("/categories")
      .then(({ data }) => {
        if (!Array.isArray(data)) throw new Error("The categories response did not contain a category list.");
        if (active) {
          setCategories(data.filter((item) => item?.name));
          setCategoryError("");
        }
      })
      .catch((requestError) => {
        if (active) {
          console.error("Shop categories request failed:", requestError);
          setCategoryError("Categories could not be loaded.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const params = {
      page: currentPage,
      limit: productsPerPage,
      search: searchTerm,
      status: "All",
      sort,
    };
    if (category) params.category = category;
    if (material) params.material = material;
    if (color) params.color = color;
    if (availability) params.availability = availability;
    if (minRating) params.minRating = minRating;
    if (onSale) params.onSale = "true";
    if (maxPrice < MAX_PRICE) params.maxPrice = maxPrice;

    api.get("/products", { params })
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
  }, [availability, category, color, currentPage, maxPrice, material, minRating, onSale, productsPerPage, reloadKey, searchTerm, sort]);

  const heroImage = useMemo(() => getProductImage(products[0]), [products]);

  const updateParams = (updates, resetPage = true) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) nextParams.set(key, String(value));
      else nextParams.delete(key);
    });
    if (resetPage) nextParams.delete("page");
    setLoading(true);
    setSearchParams(nextParams);
  };

  const toggleFilters = () => {
    setFilterOpen((open) => !open);
    updateParams({});
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextSearch = String(formData.get("search") || "").trim();
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("room");
    nextParams.delete("page");
    if (nextSearch) nextParams.set("search", nextSearch);
    else nextParams.delete("search");
    setLoading(true);
    setSearchParams(nextParams);
  };

  const goToPage = (page) => {
    updateParams({ page: page === 1 ? "" : page }, false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearFilters = () => updateParams({
    category: "",
    material: "",
    color: "",
    availability: "",
    minRating: "",
    onSale: "",
    maxPrice: "",
    sort: "",
  });

  const clearAll = () => {
    const nextParams = new URLSearchParams();
    if (searchTerm) nextParams.set("search", searchTerm);
    setLoading(true);
    setSearchParams(nextParams);
  };

  const retryProducts = () => {
    setLoading(true);
    setError("");
    setReloadKey((key) => key + 1);
  };

  const filterChips = [
    category && { label: category, key: "category" },
    material && { label: material, key: "material" },
    color && { label: color, key: "color" },
    availability && { label: availability === "in-stock" ? "In stock" : "Out of stock", key: "availability" },
    minRating && { label: `${minRating} stars & up`, key: "minRating" },
    onSale && { label: "On sale", key: "onSale" },
    maxPrice < MAX_PRICE && { label: `Up to ₹${maxPrice.toLocaleString("en-IN")}`, key: "maxPrice" },
  ].filter(Boolean);

  const pageStart = pagination.total ? (currentPage - 1) * productsPerPage + 1 : 0;
  const pageEnd = Math.min(currentPage * productsPerPage, pagination.total);
  const productGridClass = listView
    ? "grid-cols-1"
    : filterOpen
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

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

            {(filterChips.length > 0 || searchTerm) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {filterChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => updateParams({ [chip.key]: "" })}
                    className="rounded-full border border-[#efdfce] bg-[#fffaf4] px-3 py-1 text-[11px] text-[#513c2c] hover:border-[#e87500]"
                  >
                    {chip.label} <span className="ml-1 text-[#8c7460]">×</span>
                  </button>
                ))}
                {filterChips.length > 0 && <button type="button" onClick={clearFilters} className="text-xs font-semibold text-[#d65f00]">Clear all</button>}
              </div>
            )}

            {loading ? (
              <div className={`mt-4 grid gap-3 ${productGridClass}`}>
                {Array.from({ length: productsPerPage }, (_, index) => (
                  <div key={index} className="overflow-hidden rounded-xl border border-[#eee4d8] bg-white">
                    <div className="aspect-[4/3] animate-pulse bg-[#f1e9df]" />
                    <div className="space-y-2 p-3">
                      <div className="h-3 w-1/3 animate-pulse rounded bg-[#f1e9df]" />
                      <div className="h-4 w-3/4 animate-pulse rounded bg-[#f1e9df]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-5 py-10 text-center">
                <p className="text-sm font-medium text-red-800">{error}</p>
                <button type="button" onClick={retryProducts} className="mt-4 rounded-lg bg-[#351d0e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a34720]">
                  Try again
                </button>
              </div>
            ) : products.length ? (
              <>
                <div className={`mt-4 grid gap-3 ${productGridClass}`}>
                  {products.map((product) => <ProductCard key={product.id} product={product} compact />)}
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
