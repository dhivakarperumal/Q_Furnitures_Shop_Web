import { useContext, useEffect, useMemo, useState } from "react";
import {
  Armchair,
  Heart,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../api";
import { AuthContext } from "../../PrivateRouter/AuthContext";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import { getProductStock } from "../../utils/stock";
import { resolveMediaUrl } from "../../utils/media";
import PageContainer from "../CommenComponents/PageContainer";
import PageHeader from "../CommenComponents/PageHeader";
import ComboOfferCard from "./ComboOfferCard";

function parseImages(value) {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [value];
    } catch {
      return [value];
    }
  }
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function parseRecords(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function getProductImage(product, variant) {
  const variantImages = parseImages(variant?.images);
  if (variant?.image || variantImages.length) return variant?.image || variantImages[0];
  const images = parseImages(product?.images);
  return images[Number(product?.main_image_index) || 0] || images[0] || product?.image || "";
}

function ComboDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { cart, wishlist, addComboToCart, toggleWishlist } = useContext(StoreContext);
  const [comboResult, setComboResult] = useState({ key: "", combo: null, error: "" });
  const [reloadKey, setReloadKey] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [componentResult, setComponentResult] = useState({ key: "", components: [], error: "" });
  const [relatedResult, setRelatedResult] = useState({ key: "", combos: [], error: "" });
  const requestKey = `${id}:${reloadKey}`;
  const comboLoading = comboResult.key !== requestKey;
  const combo = comboLoading ? null : comboResult.combo;
  const comboError = comboLoading ? "" : comboResult.error;

  useEffect(() => {
    let active = true;
    api.get(`/combos/${id}`)
      .then(({ data }) => {
        if (data.status !== "Active") {
          throw new Error("This combo is not currently available.");
        }
        if (active) setComboResult({ key: requestKey, combo: data, error: "" });
      })
      .catch((error) => {
        console.error("Combo details request failed:", error);
        if (active) {
          setComboResult({
            key: requestKey,
            combo: null,
            error: error.response?.data?.message || error.message || "Could not load this combo.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [id, reloadKey, requestKey]);

  const comboItems = useMemo(() => parseRecords(combo?.combo_items), [combo]);

  useEffect(() => {
    if (!combo || !comboItems.length) return undefined;

    let active = true;
    Promise.all(comboItems.map(async (item) => {
      const { data } = await api.get(`/products/${item.product_id}`);
      return { item, product: data };
    }))
      .then((loadedComponents) => {
        if (active) setComponentResult({ key: requestKey, components: loadedComponents, error: "" });
      })
      .catch((error) => {
        console.error("Combo component request failed:", error);
        if (active) {
          setComponentResult({
            key: requestKey,
            components: [],
            error: error.response?.data?.message || error.message || "Could not load included products.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [combo, comboItems, requestKey]);

  useEffect(() => {
    if (!combo) return undefined;
    let active = true;
    api.get("/combos", { params: { page: 1, limit: 100, status: "Active" } })
      .then(({ data }) => {
        if (!Array.isArray(data?.combos)) {
          throw new Error("The combos response did not contain a combo list.");
        }
        const related = data.combos.filter((item) =>
          String(item.id) !== String(combo.id) &&
          String(item.category || "").trim().toLowerCase() === String(combo.category || "").trim().toLowerCase(),
        );
        if (active) setRelatedResult({ key: requestKey, combos: related.slice(0, 4), error: "" });
      })
      .catch((error) => {
        console.error("Related combos request failed:", error);
        if (active) {
          setRelatedResult({
            key: requestKey,
            combos: [],
            error: error.response?.data?.message || error.message || "Could not load related combos.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [combo, requestKey]);

  const gallery = useMemo(() => {
    const images = parseImages(combo?.images);
    if (images.length) return images;
    return combo?.image ? [combo.image] : [];
  }, [combo]);
  const activeImageIndex = gallery.length ? activeImage % gallery.length : 0;
  const componentResultIsCurrent = componentResult.key === requestKey;
  const components = componentResultIsCurrent ? componentResult.components : [];
  const componentsError = componentResultIsCurrent ? componentResult.error : "";
  const componentsLoading = Boolean(combo && comboItems.length && !componentResultIsCurrent);
  const relatedResultIsCurrent = relatedResult.key === requestKey;
  const relatedCombos = relatedResultIsCurrent ? relatedResult.combos : [];
  const relatedError = relatedResultIsCurrent ? relatedResult.error : "";
  const relatedLoading = Boolean(combo && !relatedResultIsCurrent);
  const price = Number(combo?.offer_price ?? combo?.selling_price) || 0;
  const mrp = Number(combo?.mrp) || 0;
  const savings = Math.max(0, mrp - price);
  const discount = mrp > 0 ? Math.round((savings / mrp) * 100) : 0;
  const cartItem = cart.find((item) => Number(item.combo_id) === Number(combo?.id));
  const isWishlisted = wishlist.some((item) =>
    item.item_type === "combo" && Number(item.combo_id) === Number(combo?.id),
  );
  const componentStock = components.length === comboItems.length && comboItems.length
    ? Math.min(...components.map(({ item, product }) => {
      const variants = parseRecords(product.variants);
      const variantIndex = Number(item.variant_index) || 0;
      const variant = variants[variantIndex] || null;
      if ((!variants.length && variantIndex !== 0) || (variants.length && !variant)) return 0;
      const stock = getProductStock(product, variant, item.variant_size || variant?.size || "");
      return Math.floor(stock / Math.max(1, Number(item.quantity) || 1));
    }))
    : 0;
  const availableStock = componentsError
    ? 0
    : cartItem
      ? Math.min(componentStock, Number(cartItem.available_stock) || 0)
      : componentStock;
  const selectedQuantity = availableStock > 0 ? Math.min(quantity, availableStock) : 1;
  const specifications = parseRecords(combo?.specifications)
    .filter((specification) => specification?.name && specification?.value);

  const handleBuyNow = async () => {
    if (!user?.user_id) {
      toast.error("Please login to continue with your purchase");
      navigate("/login");
      return;
    }
    if (await addComboToCart(combo, selectedQuantity)) navigate("/checkout");
  };

  return (
    <>
      <PageHeader title={combo?.name || "Combo details"} />
      <main className="min-h-[60vh] bg-[#fcfaf7] py-8 sm:py-12">
        <PageContainer>
          {comboLoading ? (
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
              <div className="aspect-[4/3] animate-pulse rounded-3xl bg-[#f1e9df]" />
              <div className="space-y-5">
                <div className="h-5 w-32 animate-pulse rounded bg-[#f1e9df]" />
                <div className="h-10 w-3/4 animate-pulse rounded bg-[#f1e9df]" />
                <div className="h-32 animate-pulse rounded bg-[#f1e9df]" />
              </div>
            </div>
          ) : comboError ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-12 text-center">
              <p className="font-medium text-red-800">{comboError}</p>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="mt-4 rounded-lg bg-[#351d0e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a34720]"
              >
                Try again
              </button>
            </div>
          ) : combo ? (
            <>
              <Link to="/combo" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#8b735e] transition hover:text-[#351d0e]">
                <span aria-hidden="true">←</span> Back to combo offers
              </Link>

              <section className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
                <div>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-[#f4ece2]">
                    {gallery.length ? (
                      <img
                        src={resolveMediaUrl(gallery[activeImageIndex] || gallery[0])}
                        alt={combo.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#c7b5a2]">
                        <Armchair size={76} strokeWidth={1.1} />
                      </div>
                    )}
                    {discount > 0 && (
                      <span className="absolute left-4 top-4 rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white">
                        {discount}% OFF
                      </span>
                    )}
                    {gallery.length > 1 && (
                      <>
                        <button
                          type="button"
                          aria-label="Show previous combo image"
                          onClick={() => setActiveImage((index) => (index - 1 + gallery.length) % gallery.length)}
                          className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#351d0e] shadow transition hover:bg-white"
                        >
                          <span aria-hidden="true">‹</span>
                        </button>
                        <button
                          type="button"
                          aria-label="Show next combo image"
                          onClick={() => setActiveImage((index) => (index + 1) % gallery.length)}
                          className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#351d0e] shadow transition hover:bg-white"
                        >
                          <span aria-hidden="true">›</span>
                        </button>
                      </>
                    )}
                  </div>
                  {gallery.length > 1 && (
                    <div className="mt-3 grid grid-cols-5 gap-3">
                      {gallery.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => setActiveImage(index)}
                          aria-label={`Show combo image ${index + 1}`}
                          aria-pressed={activeImageIndex === index}
                          className={`aspect-square overflow-hidden rounded-xl border-2 transition ${activeImageIndex === index ? "border-[#a34720]" : "border-transparent hover:border-[#d9c4aa]"}`}
                        >
                          <img src={resolveMediaUrl(image)} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-[#eee4d8] bg-white p-5 shadow-[0_8px_24px_rgba(53,29,14,0.06)] sm:p-8">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a06e46]">
                    {combo.category || "Furniture combo"}
                    {combo.subcategory ? ` · ${combo.subcategory}` : ""}
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-[#351d0e] sm:text-4xl">
                    {combo.name}
                  </h1>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#493522]">
                      <Star size={16} className="fill-[#d49a46] text-[#d49a46]" />
                      {Number(combo.rating || 0).toFixed(1)}
                    </span>
                    <span className="text-sm text-[#9a8979]">
                      Includes {comboItems.length} {comboItems.length === 1 ? "product" : "products"}
                    </span>
                    {combo.combo_code && <span className="text-xs text-[#9a8979]">SKU: {combo.combo_code}</span>}
                  </div>

                  <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-3xl font-bold text-[#351d0e]">{formatPrice(price)}</span>
                    {mrp > price && (
                      <>
                        <span className="text-base text-[#9a8979] line-through">{formatPrice(mrp)}</span>
                        <span className="text-sm font-bold text-emerald-700">{discount}% off</span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#9a8979]">Inclusive of all taxes</p>
                  {savings > 0 && (
                    <p className="mt-2 text-sm font-semibold text-emerald-700">Combo savings: {formatPrice(savings)}</p>
                  )}
                  <p className="mt-6 whitespace-pre-line text-sm leading-7 text-[#725d4b]">
                    {combo.description || "A thoughtfully selected furniture bundle for your home."}
                  </p>

                  <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                    <h2 className="text-sm font-bold text-[#351d0e]">Included in this combo</h2>
                    {componentsLoading ? (
                      <div className="mt-3 space-y-3">
                        {Array.from({ length: Math.min(comboItems.length, 3) }, (_, index) => (
                          <div key={index} className="h-14 animate-pulse rounded-lg bg-white/80" />
                        ))}
                      </div>
                    ) : componentsError ? (
                      <p role="alert" className="mt-3 text-xs text-red-700">{componentsError}</p>
                    ) : components.length ? (
                      <ul className="mt-3 space-y-3">
                        {components.map(({ item, product }) => {
                          const variants = parseRecords(product.variants);
                          const variant = variants[Number(item.variant_index) || 0] || null;
                          const componentPrice = Number(
                            variant?.selling_price ?? variant?.offer_price ??
                            product.selling_price ?? product.offer_price ?? product.mrp,
                          ) || 0;
                          const variantLabel = [
                            item.variant_color || variant?.colorName || variant?.color || variant?.colour,
                            item.variant_size || variant?.size,
                            item.variant_material || variant?.material,
                          ].filter(Boolean).join(" · ");
                          const componentImage = getProductImage(product, variant);
                          return (
                            <li key={`${product.id}-${item.variant_index}`} className="flex items-center gap-3">
                              {componentImage ? (
                                <img src={resolveMediaUrl(componentImage)} alt="" className="h-14 w-14 rounded-lg object-cover" />
                              ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white text-[#c7b5a2]">
                                  <Armchair size={24} />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-[#493522]">{product.name}</p>
                                {variantLabel && <p className="truncate text-xs text-[#8b735e]">{variantLabel}</p>}
                                <p className="text-xs text-[#8b735e]">
                                  Qty {item.quantity} · {formatPrice(componentPrice)} each
                                  {product.product_code ? ` · SKU ${product.product_code}` : ""}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-[#8b735e]">Included product information is not available.</p>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <div className="inline-flex h-11 items-center overflow-hidden rounded-xl border border-[#e5d8ca]">
                      <button
                        type="button"
                        onClick={() => setQuantity((value) => Math.max(1, Math.min(availableStock || 1, value - 1)))}
                        disabled={selectedQuantity <= 1}
                        aria-label="Decrease combo quantity"
                        className="flex h-full w-10 items-center justify-center text-[#634d3b] transition hover:bg-[#f7f1e9] disabled:opacity-40"
                      >
                        <Minus size={16} />
                      </button>
                      <span aria-live="polite" className="min-w-10 text-center text-sm font-semibold text-[#351d0e]">{selectedQuantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((value) => Math.min(availableStock, Math.min(value, availableStock) + 1))}
                        disabled={selectedQuantity >= availableStock}
                        aria-label="Increase combo quantity"
                        className="flex h-full w-10 items-center justify-center text-[#634d3b] transition hover:bg-[#f7f1e9] disabled:opacity-40"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <p className={`text-xs font-semibold ${availableStock ? "text-emerald-700" : "text-red-700"}`}>
                      {componentsLoading ? "Checking stock…" : availableStock ? `${availableStock} available` : "Out of stock"}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <button
                      type="button"
                      onClick={() => addComboToCart(combo, selectedQuantity)}
                      disabled={!availableStock || componentsLoading || Boolean(componentsError)}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#351d0e] px-4 text-sm font-semibold text-white transition hover:bg-[#a34720] disabled:cursor-not-allowed disabled:bg-[#c7b5a2]"
                    >
                      <ShoppingBag size={18} />
                      Add to cart
                    </button>
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      disabled={!availableStock || componentsLoading || Boolean(componentsError)}
                      className="min-h-12 rounded-xl bg-[#a34720] px-4 text-sm font-semibold text-white transition hover:bg-[#813718] disabled:cursor-not-allowed disabled:bg-[#c7b5a2]"
                    >
                      Buy now
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleWishlist({ ...combo, item_type: "combo" })}
                      aria-label={isWishlisted ? "Remove from favorites" : "Add to favorites"}
                      aria-pressed={isWishlisted}
                      className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#e5d8ca] px-4 text-sm font-semibold transition hover:border-rose-300 hover:bg-rose-50 ${isWishlisted ? "text-rose-600" : "text-[#634d3b]"}`}
                    >
                      <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
                      <span className="sm:hidden">Favorite</span>
                    </button>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-3 border-t border-[#eee4d8] pt-5 text-xs text-[#725d4b] sm:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <Truck size={17} className="shrink-0 text-[#a06e46]" />
                      {combo.delivery_available === false || combo.delivery_available === 0 ? "Delivery unavailable" : "Delivery available"}
                    </div>
                    <div className="flex items-center gap-2"><ShieldCheck size={17} className="shrink-0 text-[#a06e46]" /> Secure checkout</div>
                    <div className="flex items-center gap-2"><RotateCcw size={17} className="shrink-0 text-[#a06e46]" /> Quality assured</div>
                  </div>
                </div>
              </section>

              <section className="mt-10 overflow-hidden rounded-3xl border border-[#eee4d8] bg-white p-5 sm:p-8">
                <h2 className="text-xl font-semibold text-[#351d0e]">Combo details</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#725d4b]">
                  {combo.description || "No additional description is available for this combo."}
                </p>
                {(specifications.length > 0 || combo.warranty_period || combo.estimated_delivery_days ||
                  (combo.delivery_charges !== "" && combo.delivery_charges != null)) && (
                  <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {specifications.map((specification, index) => (
                      <div key={`${specification.name}-${index}`} className="rounded-xl bg-[#fcfaf7] p-4">
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-[#9a8979]">{specification.name}</dt>
                        <dd className="mt-1 text-sm font-medium text-[#493522]">{specification.value}</dd>
                      </div>
                    ))}
                    {combo.warranty_period && (
                      <div className="rounded-xl bg-[#fcfaf7] p-4">
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-[#9a8979]">Warranty</dt>
                        <dd className="mt-1 text-sm font-medium text-[#493522]">{combo.warranty_period}</dd>
                      </div>
                    )}
                    {combo.estimated_delivery_days && (
                      <div className="rounded-xl bg-[#fcfaf7] p-4">
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-[#9a8979]">Estimated delivery</dt>
                        <dd className="mt-1 text-sm font-medium text-[#493522]">{combo.estimated_delivery_days} days</dd>
                      </div>
                    )}
                    {combo.delivery_charges !== "" && combo.delivery_charges != null && (
                      <div className="rounded-xl bg-[#fcfaf7] p-4">
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-[#9a8979]">Delivery charges</dt>
                        <dd className="mt-1 text-sm font-medium text-[#493522]">
                          {combo.free_delivery ? "Free delivery" : formatPrice(combo.delivery_charges)}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
              </section>

              <section aria-labelledby="related-combos-heading" className="mt-10 rounded-3xl border border-[#eee4d8] bg-white p-5 sm:p-8">
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a06e46]">You may also like</p>
                  <h2 id="related-combos-heading" className="mt-2 text-2xl font-semibold text-[#351d0e]">Related combos</h2>
                </div>
                {relatedLoading ? (
                  <div className="flex gap-5 overflow-hidden">
                    {Array.from({ length: 3 }, (_, index) => (
                      <div key={index} className="aspect-[4/5] w-[min(78vw,280px)] shrink-0 animate-pulse rounded-2xl bg-[#f1e9df]" />
                    ))}
                  </div>
                ) : relatedError ? (
                  <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{relatedError}</p>
                ) : relatedCombos.length ? (
                  <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3" aria-label="Related combos">
                    {relatedCombos.map((item) => (
                      <div key={item.id} className="w-[min(78vw,280px)] shrink-0 snap-start">
                        <ComboOfferCard combo={item} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#8b735e]">There are no related combos to show right now.</p>
                )}
              </section>
            </>
          ) : null}
        </PageContainer>
      </main>
    </>
  );
}

export default ComboDetails;
