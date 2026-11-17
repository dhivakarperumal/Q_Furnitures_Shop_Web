import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
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
import ProductCard, { ProductListCard } from "./ProductCard";

const MAX_PRICE = 600000;
const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];
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
  const [isOpen, setIsOpen] = useState(true);
  const contentId = useId();

  return (
    <section className="border-t border-[#eee4d8] py-3.5">
      <h3 className="text-[13px] font-bold text-[#302218]">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={() => setIsOpen((open) => !open)}
          className="flex w-full items-center justify-between text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e87500]"
        >
          {title}
          <ChevronDown
            size={15}
            className={`text-[#745d48] transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}
          />
        </button>
      </h3>
      <div id={contentId} hidden={!isOpen} className="pt-2.5">
        {children}
      </div>
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
  const [sortOpen, setSortOpen] = useState(false);
  const [priceEdit, setPriceEdit] = useState(null);
  const sortDropdownRef = useRef(null);
  const sortMenuRef = useRef(null);
  const sortButtonRef = useRef(null);
  const priceDraft = priceEdit?.query === searchParams.toString() ? priceEdit.value : maxPrice;
  const productsPerPage = filterOpen ? 12 : 15;
  const selectedSortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label || "Featured";

  useEffect(() => {
    if (!sortOpen) return undefined;

    sortMenuRef.current?.querySelector("button")?.focus();
    const handlePointerDown = (event) => {
      if (!sortDropdownRef.current?.contains(event.target)) setSortOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSortOpen(false);
        sortButtonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sortOpen]);

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
    ? filterOpen
      ? "grid-cols-1 sm:grid-cols-2"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    : filterOpen
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

  return (
    <>
      <PageHeader title="Shop Furniture" />
      <main className="min-h-[60vh] bg-[#fcfaf7] pb-12 text-[#302218]">
      <PageContainer>
        <p className="py-4 text-sm text-[#594333] sm:text-base">Discover quality furniture for every space.</p>

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
            className="min-w-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <form onSubmit={handleSearch} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#dccfc1] bg-white p-1.5 shadow-sm sm:max-w-[560px]">
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
              <div className="flex items-center gap-2">
                <span id="sort-by-label" className="whitespace-nowrap text-xs font-semibold text-[#8b4b12]">Sort by:</span>
                <div ref={sortDropdownRef} className="relative">
                  <button
                    ref={sortButtonRef}
                    type="button"
                    id="shop-sort"
                    aria-labelledby="sort-by-label shop-sort-value"
                    aria-haspopup="menu"
                    aria-expanded={sortOpen}
                    aria-controls="shop-sort-menu"
                    onClick={() => setSortOpen((open) => !open)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown" && !sortOpen) {
                        event.preventDefault();
                        setSortOpen(true);
                      }
                    }}
                    className={`inline-flex h-9 min-w-[132px] items-center justify-between gap-3 rounded-lg border bg-[#fff8ef] px-3 text-xs font-semibold text-[#633b1d] outline-none transition focus-visible:ring-2 focus-visible:ring-[#e87500]/30 ${sortOpen ? "border-[#e87500] shadow-[0_0_0_2px_rgba(232,117,0,0.12)]" : "border-[#e87500]/60 hover:border-[#e87500]"}`}
                  >
                    <span id="shop-sort-value">{selectedSortLabel}</span>
                    <ChevronDown size={14} aria-hidden="true" className={`shrink-0 text-[#c45d00] transition-transform ${sortOpen ? "rotate-180" : ""}`} />
                  </button>
                  {sortOpen && (
                    <div
                      ref={sortMenuRef}
                      id="shop-sort-menu"
                      role="menu"
                      aria-labelledby="sort-by-label"
                      onKeyDown={(event) => {
                        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
                        event.preventDefault();
                        const menuItems = Array.from(sortMenuRef.current?.querySelectorAll('[role="menuitemradio"]') || []);
                        const currentIndex = menuItems.indexOf(document.activeElement);
                        const nextIndex = event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? menuItems.length - 1
                            : (currentIndex + (event.key === "ArrowDown" ? 1 : -1) + menuItems.length) % menuItems.length;
                        menuItems[nextIndex]?.focus();
                      }}
                      className="absolute right-0 z-30 mt-2 w-52 origin-top-right overflow-hidden rounded-xl border border-[#efc18d] bg-white p-1.5 shadow-[0_12px_30px_rgba(53,29,14,0.16)]"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          role="menuitemradio"
                          aria-checked={sort === option.value}
                          onClick={() => {
                            updateParams({ sort: option.value === "featured" ? "" : option.value });
                            setSortOpen(false);
                            sortButtonRef.current?.focus();
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-medium transition ${sort === option.value ? "bg-[#fff0df] font-bold text-[#a84e00]" : "text-[#554333] hover:bg-[#fff7ed] hover:text-[#a84e00]"}`}
                        >
                          {option.label}
                          {sort === option.value && <Check size={14} aria-hidden="true" className="text-[#e87500]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#58483a]">
                Showing {pageStart}–{pageEnd} of {pagination.total} products
                {searchTerm && <span className="ml-1 text-[#8b735e]">for “{searchTerm}”</span>}
              </p>
              <button
                type="button"
                onClick={toggleFilters}
                aria-expanded={filterOpen}
                aria-controls={filterOpen ? "shop-filter-sidebar" : undefined}
                aria-label={filterOpen ? "Hide filters" : "Show filters"}
                className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition ${filterOpen ? "bg-[#e87500] text-white" : "border border-[#efc18d] bg-[#fff8ef] text-[#8b4b12] hover:border-[#e87500] hover:bg-[#fff0df]"}`}
              >
                <SlidersHorizontal size={15} />
                {filterOpen ? "Hide filters" : "Filters"}
              </button>
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
              listView ? (
                <div className={`mt-4 grid gap-3 ${productGridClass}`}>
                  {Array.from({ length: productsPerPage }, (_, index) => (
                    <div key={index} className="flex h-[112px] overflow-hidden rounded-xl border border-[#eee4d8] bg-white">
                      <div className="w-[38%] animate-pulse bg-[#f1e9df]" />
                      <div className="flex-1 space-y-2 p-3">
                        <div className="h-3 w-1/3 animate-pulse rounded bg-[#f1e9df]" />
                        <div className="h-4 w-3/4 animate-pulse rounded bg-[#f1e9df]" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-[#f1e9df]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
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
              )
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
                  {products.map((product) => listView
                    ? <ProductListCard key={product.id} product={product} />
                    : <ProductCard key={product.id} product={product} compact />)}
                </div>

                {pagination.totalPages > 1 && (
                  <nav
                    className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-[#f0dfce] bg-gradient-to-r from-white via-[#fffaf4] to-white px-3 py-3 shadow-[0_6px_20px_rgba(53,29,14,0.05)] sm:flex-row sm:justify-between sm:px-4"
                    aria-label="Product pages"
                  >
                    <p className="text-xs text-[#806d5d]">
                      Page <span className="font-bold text-[#8b4b12]">{currentPage}</span> of {pagination.totalPages}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#edd7c0] bg-white px-3 text-xs font-semibold text-[#695340] transition hover:border-[#e87500] hover:bg-[#fff3e5] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft size={14} /> Previous
                      </button>
                      {Array.from({ length: pagination.totalPages }, (_, index) => index + 1)
                        .filter((page) => page === 1 || page === pagination.totalPages || Math.abs(page - currentPage) <= 1)
                        .map((page, index, visiblePages) => (
                          <span key={page} className="contents">
                            {index > 0 && page - visiblePages[index - 1] > 1 && <span className="px-1 text-sm font-semibold text-[#b19a84]">…</span>}
                            <button
                              type="button"
                              onClick={() => goToPage(page)}
                              aria-current={page === currentPage ? "page" : undefined}
                              className={`h-9 min-w-9 rounded-lg border px-2 text-xs font-bold transition ${page === currentPage ? "border-[#e87500] bg-gradient-to-b from-[#f58a1f] to-[#e87500] text-white shadow-[0_3px_8px_rgba(232,117,0,0.28)]" : "border-[#edd7c0] bg-white text-[#4b3929] hover:border-[#e87500] hover:bg-[#fff3e5]"}`}
                            >
                              {page}
                            </button>
                          </span>
                        ))}
                      <button
                        type="button"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= pagination.totalPages}
                        className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#edd7c0] bg-white px-3 text-xs font-semibold text-[#695340] transition hover:border-[#e87500] hover:bg-[#fff3e5] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
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
    </>
  );
};

export default Shop;
