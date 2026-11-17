import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Package,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import api from "../../api";
import { resolveMediaUrl } from "../../utils/media";
import { getProductStock } from "../../utils/stock";

const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100";
const labelClass = "mb-1.5 block text-xs font-semibold tracking-wide text-slate-600";

function parseArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getVariants(product) {
  return parseArray(product?.variants);
}

function getVariant(product, index) {
  return getVariants(product)[Number(index)] || null;
}

function getImage(product) {
  const images = parseArray(product?.images);
  const mainImageIndex = Number(product?.main_image_index) || 0;
  return resolveMediaUrl(images[mainImageIndex] || images[0] || product?.image || "");
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function getUnitPrice(product, variant) {
  return Number(
    variant?.selling_price ?? variant?.offer_price ?? product?.selling_price ??
    product?.offer_price ?? product?.mrp,
  ) || 0;
}

function getVariantSizes(variant) {
  if (Array.isArray(variant?.selectedSizes) && variant.selectedSizes.length) {
    return variant.selectedSizes;
  }
  if (variant?.size) return [variant.size];
  return Object.keys(variant?.sizesStock || {});
}

function getVariantLabel(variant, size) {
  return [
    variant?.colorName || variant?.color || variant?.colour,
    size,
    variant?.material,
  ].filter(Boolean).join(" · ") || "Default option";
}

function getDefaultSelection(product) {
  const variants = getVariants(product);
  const variant = variants[0] || null;
  const size = getVariantSizes(variant)[0] || "";
  return {
    product_id: Number(product.id ?? product.product_id),
    quantity: 1,
    variant_index: 0,
    variant_color: variant?.colorName || variant?.color || variant?.colour || "",
    variant_size: size,
    variant_material: variant?.material || "",
  };
}

function ComboBuilder({
  items,
  onChange,
  onSummaryChange,
  form,
  onFormChange,
  categories,
  currentProductId,
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [results, setResults] = useState([]);
  const [productCache, setProductCache] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [productsError, setProductsError] = useState("");
  const selectedIds = useMemo(
    () => new Set(items.map((item) => String(item.product_id))),
    [items],
  );
  const selectedKey = items.map((item) => String(item.product_id)).sort().join(",");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoadingProducts(true);
      setProductsError("");
      try {
        const { data } = await api.get("/products", {
          params: { page: 1, limit: 100, search: search.trim(), status: "Active" },
        });
        if (!Array.isArray(data?.products)) {
          throw new Error("The products response did not contain a product list.");
        }
        const available = data.products.filter((product) =>
          String(product.id ?? product.product_id) !== String(currentProductId || "") &&
          product.product_type !== "Combo Product",
        );
        if (active) {
          setResults(available);
          setProductCache((previous) => ({
            ...previous,
            ...Object.fromEntries(available.map((product) => [String(product.id ?? product.product_id), product])),
          }));
        }
      } catch (error) {
        console.error("Combo component products request failed:", error);
        if (active) {
          setProductsError(error.response?.data?.message || error.message || "Could not load products.");
        }
      } finally {
        if (active) setLoadingProducts(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search, currentProductId]);

  useEffect(() => {
    if (!selectedKey) {
      setLoadingSelected(false);
      return undefined;
    }
    const missingIds = [...new Set(selectedKey.split(","))]
      .filter((productId) => !productCache[productId]);
    if (!missingIds.length) return undefined;

    let active = true;
    setLoadingSelected(true);
    Promise.all(missingIds.map((productId) =>
      api.get(`/products/${productId}`).then(({ data }) => [productId, data]),
    ))
      .then((loadedProducts) => {
        if (active) {
          setProductCache((previous) => ({
            ...previous,
            ...Object.fromEntries(loadedProducts),
          }));
        }
      })
      .catch((error) => {
        console.error("Selected combo products request failed:", error);
        if (active) {
          setProductsError(error.response?.data?.message || error.message || "Could not load selected products.");
        }
      })
      .finally(() => {
        if (active) setLoadingSelected(false);
      });

    return () => {
      active = false;
    };
  }, [selectedKey, productCache]);

  const selectedProducts = useMemo(() => items.map((item) => ({
    item,
    product: productCache[String(item.product_id)],
  })), [items, productCache]);
  const summary = useMemo(() => {
    const resolved = selectedProducts.filter(({ product }) => product);
    const componentTotal = resolved.reduce(({ total }, { item, product }) => {
      const variant = getVariant(product, item.variant_index);
      return { total: total + getUnitPrice(product, variant) * Number(item.quantity || 1) };
    }, { total: 0 }).total;
    const originalTotal = form.price_mode === "manual"
      ? Number(form.mrp) || 0
      : componentTotal;
    const availableComboStock = resolved.length
      ? Math.min(...resolved.map(({ item, product }) => {
        const variant = getVariant(product, item.variant_index);
        const stock = getProductStock(product, variant, item.variant_size);
        return Math.floor(stock / Math.max(1, Number(item.quantity) || 1));
      }))
      : 0;
    const stockState = availableComboStock <= 0
      ? "Out of stock"
      : availableComboStock <= 5
        ? "Low stock"
        : "In stock";
    const discount = Math.max(0, Number(form.offer) || 0);
    const automaticPrice = Math.max(
      0,
      form.offer_type === "Percentage"
        ? originalTotal * (1 - Math.min(100, discount) / 100)
        : originalTotal - discount,
    );
    const finalPrice = form.price_mode === "manual"
      ? Number(form.offer_price) || 0
      : automaticPrice;

    return {
      originalTotal,
      availableComboStock,
      stockState,
      automaticPrice,
      finalPrice,
      savings: Math.max(0, originalTotal - finalPrice),
      resolvedCount: resolved.length,
    };
  }, [form.mrp, form.offer, form.offer_price, form.offer_type, form.price_mode, selectedProducts]);

  useEffect(() => {
    onSummaryChange(summary);
  }, [onSummaryChange, summary]);

  const addProduct = (product) => {
    const productId = Number(product.id ?? product.product_id);
    if (!productId || selectedIds.has(String(productId))) return;
    setProductCache((previous) => ({ ...previous, [String(productId)]: product }));
    onChange([...items, getDefaultSelection(product)]);
  };

  const updateQuantity = (itemIndex, rawQuantity) => {
    const item = items[itemIndex];
    const product = productCache[String(item.product_id)];
    if (!product) return;
    const variant = getVariant(product, item.variant_index);
    const availableStock = getProductStock(product, variant, item.variant_size);
    const quantity = Math.min(availableStock || 1, Math.max(1, Number(rawQuantity) || 1));
    onChange(items.map((current, index) => index === itemIndex ? { ...current, quantity } : current));
  };

  const updateVariant = (itemIndex, value) => {
    const [variantIndexString, ...sizeParts] = value.split("|");
    const variantIndex = Number(variantIndexString) || 0;
    const size = sizeParts.join("|");
    const item = items[itemIndex];
    const product = productCache[String(item.product_id)];
    const variant = getVariant(product, variantIndex);
    const availableStock = getProductStock(product, variant, size);
    const quantity = Math.min(Number(item.quantity) || 1, availableStock || 1);
    onChange(items.map((current, index) => index === itemIndex
      ? {
        ...current,
        quantity,
        variant_index: variantIndex,
        variant_color: variant?.colorName || variant?.color || variant?.colour || "",
        variant_size: size,
        variant_material: variant?.material || "",
      }
      : current));
  };

  const setFormField = (event) => {
    onFormChange(event.target.name, event.target.value);
  };
  const filteredResults = results.filter((product) =>
    !categoryFilter || String(product.category || "") === categoryFilter,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4 sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm"><Package size={19} /></span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Add existing products</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Search by product name or SKU, then choose its available variant and quantity.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative block">
            <span className="sr-only">Search products by name or SKU</span>
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products by name or SKU..."
              className={`${fieldClass} pl-10`}
            />
          </label>
          <label>
            <span className="sr-only">Filter products by category</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={fieldClass}>
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id || category.name} value={category.name}>{category.name}</option>
              ))}
            </select>
          </label>
        </div>

        {productsError && <p role="alert" className="mt-3 flex items-center gap-2 text-xs text-rose-700"><AlertCircle size={15} />{productsError}</p>}
        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
          {loadingProducts ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin text-orange-500" /> Loading products…</div>
          ) : filteredResults.length ? filteredResults.map((product) => {
            const productId = String(product.id ?? product.product_id);
            const image = getImage(product);
            const price = getUnitPrice(product, getVariant(product, 0));
            const selected = selectedIds.has(productId);
            return (
              <div key={productId} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
                {image ? (
                  <img src={image} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Package size={22} /></div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{product.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{product.product_code || "No SKU"} · {product.category || "Furniture"}</p>
                  <p className="mt-1 text-xs font-bold text-orange-700">{formatPrice(price)}</p>
                </div>
                <button
                  type="button"
                  disabled={selected}
                  onClick={() => addProduct(product)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-emerald-100 disabled:text-emerald-700"
                >
                  {selected ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                  {selected ? "Added" : "Add"}
                </button>
              </div>
            );
          }) : (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-7 text-center text-sm text-slate-500">
              No active products match this search and category.
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Combo contents</h3>
            <p className="mt-1 text-xs text-slate-500">Select at least two unique products for a combo.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{items.length} selected</span>
        </div>

        {!items.length ? (
          <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/30 px-4 py-8 text-center">
            <Package size={24} className="mx-auto text-orange-400" />
            <p className="mt-2 text-sm font-semibold text-slate-700">No products in this combo yet</p>
            <p className="mt-1 text-xs text-slate-500">Use the search above to add products from your catalog.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => {
              const product = productCache[String(item.product_id)];
              if (!product) {
                return (
                  <div key={item.product_id} className="flex items-center gap-2 rounded-xl border border-slate-100 p-4 text-sm text-slate-500">
                    <LoaderCircle size={16} className="animate-spin text-orange-500" />
                    {loadingSelected ? "Loading selected product…" : "Product details unavailable"}
                  </div>
                );
              }

              const variants = getVariants(product);
              const variant = getVariant(product, item.variant_index);
              const sizes = getVariantSizes(variant);
              const selectedSize = item.variant_size || sizes[0] || "";
              const selectedOptionValue = `${Number(item.variant_index) || 0}|${selectedSize}`;
              const image = getImage(product);
              const unitPrice = getUnitPrice(product, variant);
              const componentStock = getProductStock(product, variant, selectedSize);
              const maxComboStock = Math.floor(componentStock / Math.max(1, Number(item.quantity) || 1));
              const variantOptions = variants.length
                ? variants.flatMap((option, variantIndex) => {
                  const optionSizes = getVariantSizes(option);
                  return (optionSizes.length ? optionSizes : [""]).map((size) => ({
                    value: `${variantIndex}|${size}`,
                    label: getVariantLabel(option, size),
                  }));
                })
                : [];
              return (
                <article key={item.product_id} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[100px_minmax(0,1fr)_auto] sm:items-start">
                  {image ? (
                    <img src={image} alt={product.name} className="h-24 w-full rounded-xl object-cover sm:w-24" />
                  ) : (
                    <div className="flex h-24 items-center justify-center rounded-xl bg-slate-100 text-slate-400 sm:w-24"><Package size={26} /></div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-bold text-slate-900">{product.name}</h4>
                        <p className="mt-1 text-xs text-slate-500">SKU: {product.product_code || "—"}</p>
                      </div>
                      <p className="text-sm font-bold text-slate-900">{formatPrice(unitPrice)} <span className="font-normal text-slate-400">each</span></p>
                    </div>
                    {variantOptions.length > 0 && (
                      <label className="mt-3 block">
                        <span className={labelClass}>Variant</span>
                        <select
                          value={variantOptions.some((option) => option.value === selectedOptionValue) ? selectedOptionValue : variantOptions[0].value}
                          onChange={(event) => updateVariant(index, event.target.value)}
                          className={fieldClass}
                        >
                          {variantOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                    )}
                    <div className="mt-3 flex flex-wrap items-end gap-4">
                      <label className="w-28">
                        <span className={labelClass}>Quantity</span>
                        <input
                          type="number"
                          min="1"
                          max={Math.max(1, componentStock)}
                          value={item.quantity}
                          onChange={(event) => updateQuantity(index, event.target.value)}
                          className={fieldClass}
                        />
                      </label>
                      <p className="pb-2 text-xs text-slate-500">
                        Subtotal: <span className="font-bold text-slate-800">{formatPrice(unitPrice * Number(item.quantity || 1))}</span>
                      </p>
                      <p className={`pb-2 text-xs font-semibold ${maxComboStock ? "text-emerald-700" : "text-rose-600"}`}>
                        {componentStock} available · combo stock {maxComboStock}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                    aria-label={`Remove ${product.name} from combo`}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-100 px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 sm:mt-0"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {loadingSelected && (
        <p className="flex items-center gap-2 text-xs text-slate-500"><LoaderCircle size={14} className="animate-spin" /> Refreshing selected product stock and pricing…</p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-900">Combo pricing</h3>
          <p className="mt-1 text-xs text-slate-500">Use the selected products’ total or enter a custom MRP.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-6">
          <label className="sm:col-span-3">
            <span className={labelClass}>Price calculation</span>
            <select name="price_mode" value={form.price_mode} onChange={setFormField} className={fieldClass}>
              <option value="auto">Automatic MRP and offer price</option>
              <option value="manual">Manual MRP and offer price</option>
            </select>
          </label>
          <label className="sm:col-span-3">
            <span className={labelClass}>MRP</span>
            <input
              name="mrp"
              type="number"
              min="0"
              step="0.01"
              value={form.price_mode === "manual" ? form.mrp : summary.originalTotal.toFixed(2)}
              onChange={setFormField}
              readOnly={form.price_mode !== "manual"}
              className={`${fieldClass} ${form.price_mode !== "manual" ? "bg-slate-50" : ""}`}
            />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>Offer type</span>
            <select name="offer_type" value={form.offer_type} onChange={setFormField} className={fieldClass}>
              <option value="Percentage">Percentage</option>
              <option value="Fixed Amount">Fixed Amount</option>
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>{form.offer_type === "Percentage" ? "Offer (%)" : "Offer amount (₹)"}</span>
            <input
              name="offer"
              type="number"
              min="0"
              max={form.offer_type === "Percentage" ? 100 : undefined}
              step="0.01"
              value={form.offer}
              onChange={setFormField}
              className={fieldClass}
            />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>Offer price</span>
            <input
              name="offer_price"
              type="number"
              min="0"
              max={summary.originalTotal || undefined}
              step="0.01"
              value={form.price_mode === "manual" ? form.offer_price : summary.automaticPrice.toFixed(2)}
              onChange={setFormField}
              readOnly={form.price_mode !== "manual"}
              className={`${fieldClass} ${form.price_mode !== "manual" ? "bg-slate-50" : ""}`}
            />
          </label>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["MRP", formatPrice(summary.originalTotal)],
            ["Offer price", formatPrice(summary.finalPrice)],
            ["Customer savings", formatPrice(summary.savings)],
            ["Available combo stock", `${summary.availableComboStock} (${summary.stockState})`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 text-base font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

export default ComboBuilder;
