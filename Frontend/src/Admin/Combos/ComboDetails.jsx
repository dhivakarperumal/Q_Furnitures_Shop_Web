import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  ImageOff,
  LoaderCircle,
  Package,
  Pencil,
  Trash2,
} from "lucide-react";
import api from "../../api";
import { resolveMediaUrl } from "../../utils/media";

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

function getIncludedProductImage(product, variantIndex) {
  const variant = parseArray(product.variants)[Number(variantIndex)] || {};
  const variantImages = parseArray(variant.images);
  const images = parseArray(product.images);
  return resolveMediaUrl(
    variantImages[0] || variant.image || images[Number(product.main_image_index) || 0] ||
    images[0] || product.image || "",
  );
}

function getIncludedProductPrice(product, variantIndex) {
  const variant = parseArray(product.variants)[Number(variantIndex)] || {};
  return Number(
    variant.selling_price ?? variant.offer_price ?? product.selling_price ??
    product.offer_price ?? product.mrp,
  ) || 0;
}

function formatPrice(value) {
  return `₹${(Number(value) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function ComboDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [combo, setCombo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [includedProducts, setIncludedProducts] = useState([]);
  const [includedProductsLoading, setIncludedProductsLoading] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setIncludedProducts([]);

    api.get(`/combos/${id}`)
      .then(async ({ data }) => {
        if (!active) return;
        setCombo(data);
        setActiveImage(0);
        const items = parseArray(data.combo_items);
        setIncludedProductsLoading(items.length > 0);

        const productResults = await Promise.all(items.map(async (item) => {
          try {
            const response = await api.get(`/products/${item.product_id}`);
            return { item, product: response.data, error: "" };
          } catch (requestError) {
            console.error(`Included product ${item.product_id} request failed:`, requestError);
            return {
              item,
              product: null,
              error: requestError.response?.data?.message || "Product details could not be loaded.",
            };
          }
        }));
        if (active) setIncludedProducts(productResults);
      })
      .catch((requestError) => {
        console.error("Combo details request failed:", requestError);
        if (active) {
          toast.error(requestError.response?.data?.message || "Failed to load combo details.");
          navigate("/admin/combos", { replace: true });
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setIncludedProductsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!combo || combo.legacy_product_id) return;
    if (!window.confirm(`Delete "${combo.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/combos/${id}`);
      toast.success("Combo removed.");
      navigate("/admin/combos");
    } catch (requestError) {
      console.error("Combo deletion failed:", requestError);
      toast.error(requestError.response?.data?.message || "Could not delete this combo.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <LoaderCircle className="mb-4 animate-spin text-orange-500" size={42} />
        <p className="font-bold text-slate-500">Loading combo details...</p>
      </div>
    );
  }

  if (!combo) return null;

  const images = parseArray(combo.images);
  const items = parseArray(combo.combo_items);
  const specifications = [
    { label: "Brand", value: combo.brand },
    { label: "Model", value: combo.combo_code || combo.product_code },
    { label: "Subcategory", value: combo.subcategory },
    { label: "Material", value: combo.material_type || combo.material },
    { label: "Wood type", value: combo.wood_type },
    { label: "Colour", value: combo.colour || combo.color },
    { label: "Finish", value: combo.finish_type },
    {
      label: "Dimensions (H × W × D)",
      value: [combo.height, combo.width, combo.depth].filter(Boolean).join(" × "),
    },
    { label: "Weight", value: combo.weight ? `${combo.weight} kg` : "" },
    { label: "Included products", value: items.length },
    { label: "Warranty", value: combo.warranty_period },
    { label: "Return policy", value: combo.return_policy },
  ].filter((specification) => String(specification.value ?? "").trim());
  const price = combo.selling_price ?? combo.offer_price;
  const statusStyles = combo.status === "Active"
    ? "border-emerald-200 bg-emerald-100 text-emerald-700"
    : combo.status === "Draft"
      ? "border-amber-200 bg-amber-100 text-amber-700"
      : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-12 duration-700">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            to="/admin/combos"
            aria-label="Back to combos"
            className="rounded-xl border border-gray-100 bg-white p-2 text-gray-400 shadow-sm transition-all hover:border-orange-100 hover:text-orange-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black text-slate-800">{combo.name}</h1>
              <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusStyles}`}>
                {combo.status || "Inactive"}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Combo ID: {combo.combo_code || combo.product_code || `CB${combo.id}`} · {combo.category || "Furniture"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/admin/combos/edit/${id}`}
            className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-5 py-3 font-bold text-slate-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95"
          >
            <Pencil size={16} /> Edit Combo
          </Link>
          {!combo.legacy_product_id && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-bold text-white shadow-lg shadow-red-100 transition-all hover:bg-red-700 active:scale-95"
            >
              <Trash2 size={16} /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <div className="group overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-3 shadow-sm sm:rounded-[2.5rem] sm:p-4">
            <div className="aspect-[3/4] overflow-hidden rounded-[1.5rem] bg-gray-50 sm:rounded-[2rem]">
              {images.length ? (
                <img
                  src={resolveMediaUrl(images[activeImage] || images[0])}
                  alt={combo.name}
                  className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-300">
                  <ImageOff size={36} />
                  <span className="text-sm">No combo images</span>
                </div>
              )}
            </div>
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2 px-1 sm:gap-4 sm:px-2">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  aria-label={`Show combo image ${index + 1}`}
                  onClick={() => setActiveImage(index)}
                  className={`aspect-square overflow-hidden rounded-xl border-2 shadow-sm transition-all sm:rounded-2xl ${
                    activeImage === index
                      ? "scale-95 border-blue-500 ring-2 ring-blue-50"
                      : "border-white opacity-70 hover:border-blue-200 hover:opacity-100"
                  }`}
                >
                  <img src={resolveMediaUrl(image)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6 lg:col-span-8 sm:space-y-8">
          <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm sm:rounded-[2.5rem] sm:p-8">
            <div className="flex flex-col justify-between gap-6 border-b border-gray-50 pb-6 sm:flex-row sm:items-start sm:pb-8">
              <div className="max-w-xl space-y-4 text-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-blue-600 sm:text-[10px]">
                    {combo.category || "Furniture combo"}
                  </span>
                  <span className="text-xs font-bold text-amber-500 sm:text-sm">
                    ★ {Number(combo.rating) || 0} <span className="font-medium text-gray-300">Combo rating</span>
                  </span>
                </div>
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-800 sm:text-xs">Description</h2>
                <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
                  {combo.description || "No description provided."}
                </p>
              </div>
              <div className="min-w-[180px] rounded-[2rem] border border-gray-100 bg-gray-50 p-6 text-center shadow-inner sm:min-w-[200px]">
                <p className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 sm:text-[10px]">Commercials</p>
                <div className="flex items-center justify-center gap-2">
                  {Number(combo.mrp) > Number(price) && (
                    <span className="text-xs font-bold text-gray-300 line-through sm:text-sm">{formatPrice(combo.mrp)}</span>
                  )}
                  <p className="text-2xl font-black text-blue-600 sm:text-3xl">{formatPrice(price)}</p>
                </div>
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]">Global Inventory</p>
                  <p className="mt-1 text-lg font-black text-slate-800 sm:text-xl">{Number(combo.total_stock) || 0} Units</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-3 sm:gap-6 sm:pt-8">
              {specifications.map((specification) => (
                <div key={specification.label} className="cursor-default space-y-1 rounded-2xl border border-gray-100/50 bg-gray-50/50 p-3 transition-all hover:bg-white hover:shadow-sm sm:p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 sm:text-[10px]">{specification.label}</p>
                  <p className="break-words text-xs font-bold text-slate-700 sm:text-sm">{specification.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm sm:rounded-[2.5rem] sm:p-8">
            <div className="mb-5 flex items-center gap-2">
              <Package size={18} className="text-orange-500" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-800">Included products</h2>
            </div>
            {includedProductsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((item, index) => (
                  <div key={`${item.product_id}-${index}`} className="h-28 animate-pulse rounded-2xl bg-gray-50" />
                ))}
              </div>
            ) : includedProducts.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {includedProducts.map(({ item, product, error }, index) => {
                  const image = product ? getIncludedProductImage(product, item.variant_index) : "";
                  const selectedPrice = product ? getIncludedProductPrice(product, item.variant_index) : 0;
                  const variantDetails = [
                    item.variant_color || item.color,
                    item.variant_size || item.size,
                    item.variant_material || item.material,
                  ].filter(Boolean).join(" · ");

                  return (
                    <article key={`${item.product_id}-${index}`} className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/60">
                      <div className="flex gap-4 p-3 sm:p-4">
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white sm:h-28 sm:w-28">
                          {image ? (
                            <img src={image} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-gray-300">
                              <ImageOff size={24} />
                            </div>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="line-clamp-2 text-sm font-black text-slate-800">
                            {product?.name || `Product #${item.product_id}`}
                          </p>
                          <p className="mt-1 truncate text-xs font-medium text-slate-500">
                            {product?.product_code ? `SKU: ${product.product_code}` : `Product ID: ${item.product_id}`}
                          </p>
                          {product && (
                            <>
                              <p className="mt-1 truncate text-xs text-slate-500">
                                {[product.category, product.brand].filter(Boolean).join(" · ") || "Furniture"}
                              </p>
                              <p className="mt-auto pt-2 text-base font-black text-blue-600">{formatPrice(selectedPrice)}</p>
                            </>
                          )}
                        </div>
                        <span className="h-fit shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm">
                          Qty {item.quantity || 1}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-white/70 px-4 py-3">
                        <p className="text-xs font-medium text-slate-500">
                          {variantDetails || "Standard variant"}
                        </p>
                        {product && (
                          <p className="text-xs font-semibold text-slate-500">
                            Stock: {Number(product.available_stock ?? product.total_stock) || 0}
                          </p>
                        )}
                        {error && <p role="status" className="w-full text-xs text-amber-700">{error}</p>}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No included products recorded.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default ComboDetails;
