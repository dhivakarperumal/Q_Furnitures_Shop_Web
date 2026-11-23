import { useContext, useEffect, useMemo, useState } from "react";
import {
  Armchair,
  Camera,
  CheckCircle2,
  Heart,
  LoaderCircle,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  X,
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
import { openBuyNowCheckout } from "../../utils/buyNow";

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
  const [zoomPosition, setZoomPosition] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [componentResult, setComponentResult] = useState({ key: "", components: [], error: "" });
  const [relatedResult, setRelatedResult] = useState({ key: "", combos: [], error: "" });
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState("");
  const [myReview, setMyReview] = useState(null);
  const [myReviewError, setMyReviewError] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewImage, setReviewImage] = useState(null);
  const [uploadingReviewImage, setUploadingReviewImage] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const requestKey = `${id}:${reloadKey}`;
  const comboLoading = comboResult.key !== requestKey;
  const combo = comboLoading ? null : comboResult.combo;
  const comboError = comboLoading ? "" : comboResult.error;

  useEffect(() => {
    setActiveImage(0);
    setZoomPosition(null);
  }, [id]);

  useEffect(() => {
    setZoomPosition(null);
  }, [activeImage]);

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

  useEffect(() => {
    let active = true;
    setReviews([]);
    setReviewsLoading(true);
    setReviewsError("");
    api.get(`/reviews/combo/${id}`)
      .then(({ data }) => {
        if (!Array.isArray(data?.reviews)) {
          throw new Error("The server returned an invalid review list.");
        }
        if (active) setReviews(data.reviews);
      })
      .catch((error) => {
        console.error("Combo reviews request failed:", error);
        if (active) {
          setReviewsError(error.response?.data?.message || error.message || "Could not load combo reviews.");
        }
      })
      .finally(() => {
        if (active) setReviewsLoading(false);
      });

    if (user?.id || user?.user_id) {
      setMyReview(null);
      setMyReviewError("");
      api.get(`/reviews/combo/${id}/mine`)
        .then(({ data }) => {
          if (active) setMyReview(data?.review || null);
        })
        .catch((error) => {
          console.error("Combo review status request failed:", error);
          if (active) {
            setMyReviewError(error.response?.data?.message || error.message || "Could not check your review status.");
          }
        });
    } else {
      setMyReview(null);
      setMyReviewError("");
    }

    return () => {
      active = false;
    };
  }, [id, user?.id, user?.user_id]);

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
  const averageReviewRating = reviews.length
    ? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length
    : Number(combo?.rating || 0);

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    if (!user?.user_id) {
      toast.error("Please login to write a review");
      navigate("/login");
      return;
    }
    if (!comment.trim()) {
      toast.error("Please enter your review");
      return;
    }

    setSubmittingReview(true);
    try {
      const { data } = await api.post("/reviews/combo/customer", {
        combo_id: Number(combo.id),
        rating,
        comment: comment.trim(),
        review_image: reviewImage,
      });
      setMyReview(data.review);
      setComment("");
      setReviewImage(null);
      toast.success("Your review was submitted for approval");
    } catch (error) {
      console.error("Combo review submission failed:", error);
      toast.error(error.response?.data?.message || "Could not submit your review");
      if (error.response?.status === 409) {
        api.get(`/reviews/combo/${id}/mine`)
          .then(({ data }) => setMyReview(data?.review || null))
          .catch((statusError) => {
            console.error("Combo review status request failed:", statusError);
            setMyReviewError(statusError.response?.data?.message || statusError.message || "Could not check your review status.");
          });
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReviewImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file to upload");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Review image is too large. Maximum size is 5 MB.");
      return;
    }

    setUploadingReviewImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await api.post("/reviews/upload", formData);
      setReviewImage(data.url);
      toast.success("Review image uploaded");
    } catch (error) {
      console.error("Combo review image upload failed:", error);
      toast.error(error.response?.data?.message || "Review image upload failed");
    } finally {
      setUploadingReviewImage(false);
    }
  };

  const handleBuyNow = () => {
    if (!user?.user_id) {
      toast.error("Please login to continue with your purchase");
      navigate("/login");
      return;
    }
    openBuyNowCheckout(navigate, {
      combo_id: combo.id,
      quantity: selectedQuantity,
      name: combo.name,
      image: resolveMediaUrl(gallery[activeImageIndex] || gallery[0] || combo.image || ""),
      price: Number(combo.offer_price ?? combo.selling_price) || 0,
      item_type: "combo",
      combo_items: Array.isArray(combo.combo_items) ? combo.combo_items : [],
    });
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
                <div
                  className={`relative ${zoomPosition ? "z-30" : ""}`}
                  onPointerLeave={() => setZoomPosition(null)}
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-[#f4ece2]">
                    {gallery.length ? (
                      <img
                        src={resolveMediaUrl(gallery[activeImageIndex] || gallery[0])}
                        alt={combo.name}
                        className="h-full w-full object-contain"
                        onPointerMove={(event) => {
                          if (event.pointerType === "touch") return;
                          const bounds = event.currentTarget.getBoundingClientRect();
                          const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
                          const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
                          setZoomPosition({
                            x,
                            y,
                            lensX: Math.max(0.2, Math.min(0.8, x)),
                            lensY: Math.max(0.2, Math.min(0.8, y)),
                          });
                        }}
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
                    {zoomPosition && gallery.length > 0 && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute h-2/5 w-2/5 -translate-x-1/2 -translate-y-1/2 border border-white/80 bg-white/20 shadow-[0_0_0_1px_rgba(53,29,14,0.25)]"
                        style={{
                          left: `${zoomPosition.lensX * 100}%`,
                          top: `${zoomPosition.lensY * 100}%`,
                        }}
                      />
                    )}
                  </div>
                  {zoomPosition && gallery.length > 0 && (
                    <div
                      aria-hidden="true"
                      className="absolute left-full top-0 z-40 ml-4 hidden aspect-[4/3] w-full overflow-hidden rounded-3xl border border-[#e8d8c7] bg-[#f4ece2] shadow-2xl lg:block"
                      style={{
                        backgroundImage: `url("${resolveMediaUrl(gallery[activeImageIndex] || gallery[0])}")`,
                        backgroundPosition: `${zoomPosition.x * 100}% ${zoomPosition.y * 100}%`,
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "250% 250%",
                      }}
                    />
                  )}
                  {gallery.length > 1 && (
                    <div className="mt-3 grid grid-cols-5 gap-3">
                      {gallery.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => {
                            setZoomPosition(null);
                            setActiveImage(index);
                          }}
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
                      {averageReviewRating.toFixed(1)}
                    </span>
                    <span className="text-sm text-[#9a8979]">
                      {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
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

              <section aria-labelledby="combo-reviews-heading" className="mt-10 overflow-hidden rounded-3xl border border-[#eee4d8] bg-white p-5 sm:p-8">
                <div className="flex flex-col gap-5 rounded-2xl bg-[#fcfaf7] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a06e46]">Feedback from our customers</p>
                    <h2 id="combo-reviews-heading" className="mt-1 text-2xl font-semibold text-[#351d0e]">Customer reviews</h2>
                    <p className="mt-1 text-sm text-[#8b735e]">Reviews are for this combo and can be submitted once per account.</p>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-[#eee4d8] bg-white px-4 py-3">
                    <span className="text-3xl font-bold leading-none text-[#351d0e]">
                      {reviews.length ? averageReviewRating.toFixed(1) : "—"}
                    </span>
                    <span>
                      <span className="flex items-center gap-0.5" aria-label={`${averageReviewRating.toFixed(1)} out of 5 stars`}>
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star
                            key={index}
                            size={14}
                            className={index < Math.round(averageReviewRating) ? "fill-[#d49a46] text-[#d49a46]" : "text-[#d9cfc4]"}
                          />
                        ))}
                      </span>
                      <span className="mt-1 block text-xs text-[#8b735e]">
                        {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                      </span>
                    </span>
                  </div>
                </div>

                {reviewsLoading ? (
                  <div className="mt-5 space-y-3">
                    {Array.from({ length: 2 }, (_, index) => (
                      <div key={index} className="h-28 animate-pulse rounded-2xl bg-[#f1e9df]" />
                    ))}
                  </div>
                ) : reviewsError ? (
                  <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{reviewsError}</p>
                ) : reviews.length ? (
                  <div className="mt-5 space-y-4">
                    {reviews.map((review) => (
                      <article key={review.id} className="rounded-2xl border border-[#eee4d8] bg-white p-4 shadow-[0_6px_18px_rgba(53,29,14,0.04)] sm:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff0df] text-sm font-bold text-[#a34720]">
                              {String(review.user_name || "Customer").trim().charAt(0).toUpperCase()}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-[#351d0e]">{review.user_name || "Customer"}</span>
                              {review.created_at && (
                                <span className="mt-1 block text-xs text-[#9a8979]">
                                {new Date(review.created_at).toLocaleDateString()}
                                </span>
                              )}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff7e8] px-3 py-1.5 text-xs font-bold text-[#634d3b]" aria-label={`${review.rating} out of 5 stars`}>
                            <span className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }, (_, index) => (
                                <Star
                                  key={index}
                                  size={13}
                                  className={index < Number(review.rating) ? "fill-[#d49a46] text-[#d49a46]" : "text-[#d9cfc4]"}
                                />
                              ))}
                            </span>
                            {Number(review.rating).toFixed(1)}
                          </span>
                        </div>
                        <p className="mt-4 whitespace-pre-line rounded-xl bg-[#fcfaf7] p-4 text-sm leading-7 text-[#634d3b]">{review.comment}</p>
                        {review.review_image && (
                          <img
                            src={resolveMediaUrl(review.review_image)}
                            alt={`Photo for ${combo.name} review`}
                            loading="lazy"
                            className="mt-4 max-h-64 max-w-full rounded-xl border border-[#eee4d8] bg-[#fcfaf7] object-contain p-1"
                          />
                        )}
                        {review.admin_reply && (
                          <div className="mt-4 rounded-xl border border-[#f1e2cf] border-l-4 border-l-[#d49a46] bg-[#fffaf2] px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-[#8b5a35]">Q Living reply</p>
                            <p className="mt-1 text-sm leading-6 text-[#634d3b]">{review.admin_reply}</p>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 rounded-xl bg-[#fcfaf7] px-4 py-6 text-center text-sm text-[#8b735e]">
                    No published reviews yet. Be the first to share your experience.
                  </p>
                )}

                <div className="mt-8 rounded-2xl bg-[#fcfaf7] p-5 sm:p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a06e46]">Your feedback matters</p>
                  <h3 className="mt-1 text-lg font-semibold text-[#351d0e]">Write a review</h3>
                  {myReviewError ? (
                    <p role="alert" className="mt-3 text-sm text-red-700">{myReviewError}</p>
                  ) : myReview ? (
                    <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      <CheckCircle2 size={18} />
                      {myReview.status === "Published" ? "You have reviewed this combo." : "Your review is awaiting approval."}
                    </p>
                  ) : user?.user_id ? (
                    <form onSubmit={handleReviewSubmit} className="mt-4 max-w-2xl space-y-4">
                      <p className="text-sm text-[#8b735e]">
                        Reviewing as <span className="font-semibold text-[#493522]">{user.username || user.name || "your account"}</span>
                      </p>
                      <fieldset>
                        <legend className="mb-2 text-sm font-medium text-[#634d3b]">Your rating</legend>
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }, (_, index) => {
                            const value = index + 1;
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setRating(value)}
                                aria-label={`${value} star${value === 1 ? "" : "s"}`}
                                aria-pressed={rating === value}
                                className="rounded p-1 transition hover:scale-110"
                              >
                                <Star size={23} className={value <= rating ? "fill-[#d49a46] text-[#d49a46]" : "text-[#d9cfc4]"} />
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>
                      <label className="block text-sm font-medium text-[#634d3b]">
                        Your review
                        <textarea
                          value={comment}
                          onChange={(event) => setComment(event.target.value)}
                          maxLength={5000}
                          rows={4}
                          required
                          placeholder="Tell us what you think about this combo..."
                          className="mt-2 w-full resize-y rounded-xl border border-[#e5d8ca] bg-white px-4 py-3 text-sm text-[#351d0e] outline-none transition focus:border-[#a34720] focus:ring-2 focus:ring-[#a34720]/10"
                        />
                      </label>
                      <div>
                        <label htmlFor="combo-review-image" className="mb-2 block text-sm font-medium text-[#634d3b]">
                          Add a photo (optional)
                        </label>
                        <input
                          id="combo-review-image"
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleReviewImageUpload}
                          disabled={uploadingReviewImage || submittingReview}
                          className="sr-only"
                        />
                        <label
                          htmlFor="combo-review-image"
                          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[#e5d8ca] px-4 text-sm font-semibold text-[#634d3b] transition hover:border-[#a34720] hover:bg-[#fcfaf7]"
                        >
                          {uploadingReviewImage ? (
                            <LoaderCircle size={16} className="animate-spin" />
                          ) : (
                            <Camera size={16} />
                          )}
                          {uploadingReviewImage ? "Uploading image…" : "Upload review image"}
                        </label>
                        <p className="mt-1 text-xs text-[#9a8979]">JPG, PNG, GIF or WEBP up to 5 MB.</p>
                        {reviewImage && (
                          <div className="mt-3 flex items-start gap-3">
                            <img
                              src={resolveMediaUrl(reviewImage)}
                              alt="Selected review upload"
                              className="h-24 w-24 rounded-xl border border-[#eee4d8] object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setReviewImage(null)}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                            >
                              <X size={14} />
                              Remove image
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={submittingReview || uploadingReviewImage || !comment.trim()}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#351d0e] px-5 text-sm font-semibold text-white transition hover:bg-[#a34720] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submittingReview && <LoaderCircle size={16} className="animate-spin" />}
                        Submit review
                      </button>
                      <p className="text-xs text-[#9a8979]">You can submit one review for this combo. Reviews are published after approval.</p>
                    </form>
                  ) : (
                    <p className="mt-3 text-sm text-[#8b735e]">
                      <Link to="/login" className="font-semibold text-[#a34720] hover:underline">Log in</Link> to write a review.
                    </p>
                  )}
                </div>
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
