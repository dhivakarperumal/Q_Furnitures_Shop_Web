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
  const productsPerPage = filterOpen ? 8 : 10;

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
    <main className="min-h-[60vh] bg-[#fcfaf7] pb-12 text-[#302218]">
      <section className="relative isolate overflow-hidden border-y border-[#eddfd0] bg-[linear-gradient(100deg,#f5eadd_0%,#fbf5ec_48%,#ead4b9_100%)]">
        {heroImage && (
          <img
            src={heroImage}
            alt=""
            className="absolute inset-y-0 right-0 -z-10 h-full w-[62%] object-cover object-center opacity-75 [mask-image:linear-gradient(to_right,transparent,black_28%)]"
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#f7ede2] via-[#f7ede2]/90 to-transparent" />
        <PageContainer>
          <div className="flex min-h-[122px] items-center py-6 sm:min-h-[148px]">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-[#805a3b]">Q Living Furniture</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#351d0e] sm:text-[38px]">
                Shop <span className="text-[#e87500]">Furniture</span>
              </h1>
              <p className="mt-1 text-sm text-[#594333] sm:text-base">Discover quality furniture for every space</p>
            </div>
          </div>
        </PageContainer>
      </section>

      <PageContainer>
        <div className="flex items-center gap-2 py-3 text-xs text-[#725d4b]">
          <Home size={13} />
          <span>Home</span>
          <ChevronRight size={13} />
          <span className="font-semibold text-[#351d0e]">Shop</span>
        </div>

        <div className={`grid gap-5 ${filterOpen ? "lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)]" : "grid-cols-1"}`}>
          {filterOpen && <aside id="shop-filter-sidebar" className="h-fit rounded-xl border border-[#e9ded2] bg-white px-3.5 shadow-[0_3px_15px_rgba(53,29,14,0.04)] lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
            <div className="flex items-center justify-between py-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-[#281b12]">
                <SlidersHorizontal size={17} /> Filters
              </h2>
              <button type="button" onClick={clearFilters} className="text-[11px] font-semibold text-[#dc6500] hover:underline">
                <span className="inline-flex items-center gap-1"><RotateCcw size={12} /> Clear all</span>
              </button>
            </div>

            <FilterSection title="Category">
              {categoryError ? (
                <p role="status" className="text-xs text-[#9a6b45]">{categoryError}</p>
              ) : (
                <div className="max-h-44 space-y-2 overflow-y-auto">
                  {categories.map((item) => (
                    <label key={item.id || item.catId || item.name} className="flex cursor-pointer items-center gap-2 text-xs text-[#47382b]">
                      <input
                        type="checkbox"
                        checked={category === item.name}
                        onChange={() => updateParams({ category: category === item.name ? "" : item.name })}
                        className="h-3.5 w-3.5 accent-[#e87500]"
                      />
                      <span className="flex-1">{item.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </FilterSection>

            <FilterSection title="Price range">
              <div className="mb-2 flex justify-between text-[11px] text-[#594b3d]">
                <span>₹0</span><span>{priceDraft >= MAX_PRICE ? "₹6,00,000+" : `₹${priceDraft.toLocaleString("en-IN")}`}</span>
              </div>
              <input
                type="range"
                min="10000"
                max={MAX_PRICE}
                step="5000"
                value={priceDraft}
                aria-label="Maximum price"
                onChange={(event) => setPriceEdit({
                  query: searchParams.toString(),
                  value: Number(event.target.value),
                })}
                onPointerUp={() => updateParams({ maxPrice: priceDraft >= MAX_PRICE ? "" : priceDraft })}
                onKeyUp={() => updateParams({ maxPrice: priceDraft >= MAX_PRICE ? "" : priceDraft })}
                className="h-1.5 w-full cursor-pointer accent-[#e87500]"
              />
            </FilterSection>

            <FilterSection title="Material">
              <div className="space-y-2">
                {MATERIALS.map((item) => (
                  <label key={item} className="flex cursor-pointer items-center gap-2 text-xs text-[#47382b]">
                    <input
                      type="checkbox"
                      checked={material === item}
                      onChange={() => updateParams({ material: material === item ? "" : item })}
                      className="h-3.5 w-3.5 accent-[#e87500]"
                    />
                    {item}
                  </label>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="Color">
              <div className="flex flex-wrap gap-2">
                {COLORS.map(([name, swatch]) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    aria-label={`Filter by ${name}`}
                    aria-pressed={color === name}
                    onClick={() => updateParams({ color: color === name ? "" : name })}
                    className={`h-5 w-5 rounded-full border transition ${color === name ? "border-[#e87500] ring-2 ring-[#e87500]/30 ring-offset-1" : "border-[#d7cabe] hover:scale-110"}`}
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
            </FilterSection>

            <FilterSection title="Customer rating">
              <div className="space-y-2">
                {[4, 3].map((rating) => (
                  <label key={rating} className="flex cursor-pointer items-center gap-2 text-xs text-[#47382b]">
                    <input
                      type="checkbox"
                      checked={minRating === String(rating)}
                      onChange={() => updateParams({ minRating: minRating === String(rating) ? "" : rating })}
                      className="h-3.5 w-3.5 accent-[#e87500]"
                    />
                    <span className="inline-flex text-[#ed9b00]">
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star key={index} size={12} className={index < rating ? "fill-current" : "text-[#d7cabe]"} />
                      ))}
                    </span>
                    <span>&amp; above</span>
                  </label>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="Availability">
              <div className="space-y-2 pb-1">
                {[["in-stock", "In stock"], ["out-of-stock", "Out of stock"]].map(([value, label]) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2 text-xs text-[#47382b]">
                    <input
                      type="checkbox"
                      checked={availability === value}
                      onChange={() => updateParams({ availability: availability === value ? "" : value })}
                      className="h-3.5 w-3.5 accent-[#e87500]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="Offers">
              <label className="flex cursor-pointer items-center gap-2 pb-1 text-xs text-[#47382b]">
                <input
                  type="checkbox"
                  checked={onSale}
                  onChange={() => updateParams({ onSale: onSale ? "" : "true" })}
                  className="h-3.5 w-3.5 accent-[#e87500]"
                />
                On sale
              </label>
            </FilterSection>
          </aside>}

          <section
            aria-label="Furniture products"
            className={`min-w-0 ${filterOpen ? "lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1" : ""}`}
          >
            <form onSubmit={handleSearch} className="flex items-center gap-2 rounded-lg border border-[#dccfc1] bg-white p-1.5 shadow-sm">
              <Search size={18} className="ml-2 shrink-0 text-[#4c392a]" />
              <input
                key={searchTerm}
                type="search"
                name="search"
                defaultValue={searchTerm}
                placeholder="Search furniture, e.g., sofa, bed, dining..."
                aria-label="Search furniture"
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-xs text-[#351d0e] outline-none placeholder:text-[#998b7e] sm:text-sm"
              />
              <button type="submit" className="rounded-md bg-[#e87500] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#ca6100] sm:px-6 sm:text-sm">
                Search
              </button>
            </form>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#58483a]">
                Showing {pageStart}–{pageEnd} of {pagination.total} products
                {searchTerm && <span className="ml-1 text-[#8b735e]">for “{searchTerm}”</span>}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFilters}
                  aria-expanded={filterOpen}
                  aria-controls={filterOpen ? "shop-filter-sidebar" : undefined}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition ${filterOpen ? "bg-[#e87500] text-white" : "border border-[#ded2c6] bg-white text-[#4d3b2b] hover:border-[#e87500]"}`}
                >
                  <SlidersHorizontal size={15} />
                  {filterOpen ? "Hide filters" : "Filters"}
                </button>
                <label htmlFor="shop-sort" className="whitespace-nowrap text-xs font-semibold">Sort by:</label>
                <select
                  id="shop-sort"
                  value={sort}
                  onChange={(event) => updateParams({ sort: event.target.value === "featured" ? "" : event.target.value })}
                  className="rounded-md border border-[#ded2c6] bg-white px-3 py-2 text-xs text-[#3b2b1f] outline-none focus:border-[#e87500]"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                </select>
                <button
                  type="button"
                  onClick={() => setListView(false)}
                  aria-label="Grid view"
                  aria-pressed={!listView}
                  className={`hidden h-9 w-9 items-center justify-center rounded-md sm:flex ${!listView ? "bg-[#e87500] text-white" : "border border-[#ded2c6] bg-white text-[#4d3b2b]"}`}
                >
                  <Grid2X2 size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setListView(true)}
                  aria-label="List view"
                  aria-pressed={listView}
                  className={`hidden h-9 w-9 items-center justify-center rounded-md sm:flex ${listView ? "bg-[#e87500] text-white" : "border border-[#ded2c6] bg-white text-[#4d3b2b]"}`}
                >
                  <List size={17} />
                </button>
              </div>
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
                  <nav className="mt-7 flex flex-wrap items-center justify-center gap-1.5" aria-label="Product pages">
                    <button
                      type="button"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="inline-flex items-center gap-1 rounded-md border border-[#e5d8ca] bg-white px-3 py-2 text-xs text-[#695340] hover:bg-[#f4eadc] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>
                    {Array.from({ length: pagination.totalPages }, (_, index) => index + 1)
                      .filter((page) => page === 1 || page === pagination.totalPages || Math.abs(page - currentPage) <= 1)
                      .map((page, index, visiblePages) => (
                        <span key={page} className="contents">
                          {index > 0 && page - visiblePages[index - 1] > 1 && <span className="px-1 text-xs text-[#806d5d]">…</span>}
                          <button
                            type="button"
                            onClick={() => goToPage(page)}
                            aria-current={page === currentPage ? "page" : undefined}
                            className={`h-9 min-w-9 rounded-md border px-2 text-xs font-semibold ${page === currentPage ? "border-[#e87500] bg-[#e87500] text-white" : "border-[#e5d8ca] bg-white text-[#4b3929] hover:bg-[#fff3e5]"}`}
                          >
                            {page}
                          </button>
                        </span>
                      ))}
                    <button
                      type="button"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage >= pagination.totalPages}
                      className="inline-flex items-center gap-1 rounded-md border border-[#e5d8ca] bg-white px-3 py-2 text-xs text-[#695340] hover:bg-[#f4eadc] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </nav>
                )}
              </>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-[#d9c4aa] bg-white px-5 py-14 text-center">
                <h2 className="text-lg font-semibold text-[#351d0e]">No products found</h2>
                <p className="mt-2 text-sm text-[#8b735e]">Try changing your search or filters.</p>
                <button type="button" onClick={clearAll} className="mt-4 text-sm font-bold text-[#d9650b] hover:underline">Clear filters</button>
              </div>
            )}
          </section>
        </div>
      </PageContainer>
    </main>
  );
};

export default Shop;
