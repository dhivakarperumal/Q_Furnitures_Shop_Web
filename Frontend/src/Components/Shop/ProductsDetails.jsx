import { useContext, useEffect, useMemo, useState } from "react";
import {
  Armchair,
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
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../api";
import { AuthContext } from "../../PrivateRouter/AuthContext";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import { resolveMediaUrl } from "../../utils/media";
import { getProductStock } from "../../utils/stock";
import PageContainer from "../CommenComponents/PageContainer";
import PageHeader from "../CommenComponents/PageHeader";
import ProductCard from "./ProductCard";

const TABS = [
  { id: "details", label: "Product details" },
  { id: "reviews", label: "Reviews" },
];

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

function getReviewDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { wishlist, addToCart, toggleWishlist } = useContext(StoreContext);
  const [product, setProduct] = useState(null);
  const [productLoading, setProductLoading] = useState(true);
  const [productError, setProductError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [activeVariant, setActiveVariant] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("details");
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [relatedError, setRelatedError] = useState("");
  const [comboComponents, setComboComponents] = useState([]);
  const [comboComponentsLoading, setComboComponentsLoading] = useState(false);
  const [comboComponentsError, setComboComponentsError] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState("");
  const [myReview, setMyReview] = useState(null);
  const [myReviewError, setMyReviewError] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let active = true;
    setProduct(null);
    setProductLoading(true);
    setProductError("");

    api.get(`/products/${id}`)
      .then(({ data }) => {
        if (active) setProduct(data);
      })
      .catch((error) => {
        console.error("Product details request failed:", error);
        if (active) {
          setProductError(error.response?.data?.message || error.message || "Could not load this product.");
        }
      })
      .finally(() => {
        if (active) setProductLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  useEffect(() => {
    setActiveImage(0);
    setActiveVariant(0);
    setSelectedSize("");
    setQuantity(1);
  }, [id]);

  useEffect(() => {
    if (!product) return;
    let active = true;

    setRelatedLoading(true);
    setRelatedError("");
    api.get("/products", { params: { page: 1, limit: 100, status: "Active" } })
      .then(({ data }) => {
        if (!Array.isArray(data?.products)) {
          throw new Error("The products response did not contain a product list.");
        }
        const related = data.products.filter((item) =>
          String(item.id ?? item.product_id) !== String(product.id) &&
          String(item.category || "").trim().toLowerCase() === String(product.category || "").trim().toLowerCase(),
        );
        if (active) setRelatedProducts(related.slice(0, 4));
      })
      .catch((error) => {
        console.error("Related products request failed:", error);
        if (active) setRelatedError(error.response?.data?.message || error.message || "Could not load related products.");
      })
      .finally(() => {
        if (active) setRelatedLoading(false);
      });

    return () => {
      active = false;
    };
  }, [product]);

  useEffect(() => {
    if (!product || product.product_type !== "Combo Product") {
      setComboComponents([]);
      return undefined;
    }

    const comboItems = parseRecords(product.combo_items);
    if (!comboItems.length) {
      setComboComponents([]);
      setComboComponentsError("");
      return undefined;
    }

    let active = true;
    setComboComponentsLoading(true);
    setComboComponentsError("");
    Promise.all(comboItems.map(async (item) => {
      const { data } = await api.get(`/products/${item.product_id}`);
      return { item, product: data };
    }))
      .then((components) => {
        if (active) setComboComponents(components);
      })
      .catch((error) => {
        console.error("Combo components request failed:", error);
        if (active) {
          setComboComponentsError(error.response?.data?.message || error.message || "Could not load included products.");
        }
      })
      .finally(() => {
        if (active) setComboComponentsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [product]);

  useEffect(() => {
    let active = true;
    setReviews([]);
    setReviewsLoading(true);
    setReviewsError("");
    api.get(`/reviews/product/${id}`)
      .then(({ data }) => {
        if (!Array.isArray(data?.reviews)) {
          throw new Error("The server returned an invalid review list.");
        }
        if (active) setReviews(data.reviews);
      })
      .catch((error) => {
        console.error("Product reviews request failed:", error);
        if (active) {
          setReviewsError(error.response?.data?.message || error.message || "Could not load product reviews.");
        }
      })
      .finally(() => {
        if (active) setReviewsLoading(false);
      });

    if (user?.id) {
      setMyReview(null);
      setMyReviewError("");
      api.get(`/reviews/product/${id}/mine`)
        .then(({ data }) => {
          if (active) setMyReview(data?.review || null);
        })
        .catch((error) => {
          console.error("Customer review status request failed:", error);
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
  }, [id, user?.id]);

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const variant = variants[activeVariant] || null;
  const variantSizes = Array.isArray(variant?.selectedSizes)
    ? variant.selectedSizes
    : variant?.size
      ? [variant.size]
      : [];
  const effectiveSize = selectedSize || variantSizes[0] || "";
  const availableStock = product ? getProductStock(product, variant, effectiveSize) : 0;
  const price = Number(
    variant?.selling_price ?? variant?.offer_price ?? product?.selling_price ??
    product?.offer_price ?? product?.mrp,
  ) || 0;
  const mrp = Number(variant?.mrp ?? product?.mrp) || 0;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const colorName = String(variant?.colorName || variant?.color || variant?.colour || "Default");
  const productId = product?.id ?? product?.product_id;
  const isCombo = product?.product_type === "Combo Product";
  const isWishlisted = wishlist.some((item) =>
    String(item.product_id ?? item.productId ?? item.id) === String(productId),
  );
  const gallery = useMemo(() => {
    const variantImages = parseImages(variant?.images);
    if (variant?.image && !variantImages.length) variantImages.push(variant.image);
    if (variantImages.length) return variantImages;
    const productImages = parseImages(product?.images);
    if (productImages.length) return productImages;
    return product?.image ? [product.image] : [];
  }, [product, variant]);

  const specifications = [
    { label: "Brand", value: product?.brand },
    { label: "Model", value: product?.model_number },
    { label: "Material", value: product?.material_type || product?.material },
    { label: "Wood type", value: product?.wood_type },
    { label: "Colour", value: product?.colour },
    { label: "Finish", value: product?.finish_type },
    {
      label: "Dimensions (H × W × D)",
      value: [product?.height, product?.width, product?.depth].filter(Boolean).join(" × "),
    },
    { label: "Weight", value: product?.weight ? `${product.weight} kg` : "" },
    { label: "Seating capacity", value: product?.seating_capacity },
    { label: "Warranty", value: product?.warranty_period },
    { label: "Origin", value: product?.country_of_origin },
  ].filter((item) => item.value);

  const changeVariant = (index) => {
    setActiveVariant(index);
    setActiveImage(0);
    setSelectedSize("");
    setQuantity(1);
  };

  const handleBuyNow = async () => {
    if (!user?.user_id) {
      toast.error("Please login to continue with your purchase");
      navigate("/login");
      return;
    }
    const added = await addToCart(product, variant, effectiveSize, quantity);
    if (added) navigate("/checkout");
  };

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
      const { data } = await api.post("/reviews/customer", {
        product_id: Number(productId),
        rating,
        comment: comment.trim(),
      });
      setMyReview(data.review);
      setComment("");
      toast.success("Your review was submitted for approval");
    } catch (error) {
      console.error("Customer review submission failed:", error);
      toast.error(error.response?.data?.message || "Could not submit your review");
      if (error.response?.status === 409) {
        api.get(`/reviews/product/${id}/mine`)
          .then(({ data }) => setMyReview(data?.review || null))
          .catch((statusError) => {
            console.error("Customer review status request failed:", statusError);
            setMyReviewError(statusError.response?.data?.message || statusError.message || "Could not check your review status.");
          });
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <>
      <PageHeader title={product?.name || "Product details"} />
      <main className="min-h-[60vh] bg-[#fcfaf7] py-8 sm:py-12">
        <PageContainer>
          {productLoading ? (
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="aspect-[4/3] animate-pulse rounded-3xl bg-[#f1e9df]" />
              <div className="space-y-5">
                <div className="h-5 w-32 animate-pulse rounded bg-[#f1e9df]" />
                <div className="h-10 w-3/4 animate-pulse rounded bg-[#f1e9df]" />
                <div className="h-32 animate-pulse rounded bg-[#f1e9df]" />
              </div>
            </div>
          ) : productError ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-12 text-center">
              <p className="font-medium text-red-800">{productError}</p>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="mt-4 rounded-lg bg-[#351d0e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a34720]"
              >
                Try again
              </button>
            </div>
          ) : product ? (
            <>
              <Link to="/shop" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#8b735e] transition hover:text-[#351d0e]">
                <span aria-hidden="true">←</span> Back to shop
              </Link>

              <section className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
                <div>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-[#f4ece2]">
                    {gallery.length ? (
                      <img
                        src={resolveMediaUrl(gallery[activeImage] || gallery[0])}
                        alt={product.name}
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
                          aria-label="Show previous product image"
                          onClick={() => setActiveImage((index) => (index - 1 + gallery.length) % gallery.length)}
                          className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#351d0e] shadow transition hover:bg-white"
                        >
                          <span aria-hidden="true">‹</span>
                        </button>
                        <button
                          type="button"
                          aria-label="Show next product image"
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
                          aria-label={`Show product image ${index + 1}`}
                          aria-pressed={activeImage === index}
                          className={`aspect-square overflow-hidden rounded-xl border-2 transition ${activeImage === index ? "border-[#a34720]" : "border-transparent hover:border-[#d9c4aa]"}`}
                        >
                          <img src={resolveMediaUrl(image)} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-[#eee4d8] bg-white p-5 shadow-[0_8px_24px_rgba(53,29,14,0.06)] sm:p-8">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a06e46]">
                    {product.category || "Furniture"}
                    {product.subcategory ? ` · ${product.subcategory}` : ""}
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-[#351d0e] sm:text-4xl">
                    {product.name}
                  </h1>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#493522]">
                      <Star size={16} className="fill-[#d49a46] text-[#d49a46]" />
                      {Number(product.rating || 0).toFixed(1)}
                    </span>
                    <span className="text-sm text-[#9a8979]">({reviews.length} customer {reviews.length === 1 ? "review" : "reviews"})</span>
                    {product.product_code && (
                      <span className="text-xs text-[#9a8979]">SKU: {product.product_code}</span>
                    )}
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
                  {isCombo && mrp > price && (
                    <p className="mt-2 text-sm font-semibold text-emerald-700">Combo savings: {formatPrice(mrp - price)}</p>
                  )}

                  <p className="mt-6 whitespace-pre-line text-sm leading-7 text-[#725d4b]">
                    {product.description || "Thoughtfully designed to bring comfort and character to your home."}
                  </p>

                  {isCombo && (
                    <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                      <h2 className="text-sm font-bold text-[#351d0e]">Included in this combo</h2>
                      {comboComponentsLoading ? (
                        <p className="mt-3 text-xs text-[#8b735e]">Loading included products…</p>
                      ) : comboComponentsError ? (
                        <p role="alert" className="mt-3 text-xs text-red-700">{comboComponentsError}</p>
                      ) : comboComponents.length ? (
                        <ul className="mt-3 space-y-3">
                          {comboComponents.map(({ item, product: component }) => {
                            const componentVariant = parseRecords(component.variants)[Number(item.variant_index) || 0];
                            const componentPrice = Number(
                              componentVariant?.selling_price ?? componentVariant?.offer_price ??
                              component.selling_price ?? component.offer_price ?? component.mrp,
                            ) || 0;
                            const variantLabel = [
                              item.variant_color || componentVariant?.colorName || componentVariant?.color || componentVariant?.colour,
                              item.variant_size || componentVariant?.size,
                              item.variant_material || componentVariant?.material,
                            ].filter(Boolean).join(" · ");
                            const componentImages = parseImages(component.images);
                            const componentImage = componentImages[Number(component.main_image_index) || 0] || componentImages[0] || component.image;
                            return (
                              <li key={`${component.id}-${item.variant_index}`} className="flex items-center gap-3">
                                {componentImage ? (
                                  <img src={resolveMediaUrl(componentImage)} alt="" className="h-14 w-14 rounded-lg object-cover" />
                                ) : (
                                  <div className="h-14 w-14 rounded-lg bg-white" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-[#493522]">{component.name}</p>
                                  {variantLabel && <p className="truncate text-xs text-[#8b735e]">{variantLabel}</p>}
                                  <p className="text-xs text-[#8b735e]">Qty {item.quantity} · {formatPrice(componentPrice)} each</p>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-[#8b735e]">Included product information is not available.</p>
                      )}
                    </div>
                  )}

                  {variants.length > 0 && (
                    <div className="mt-6">
                      <p className="mb-3 text-sm font-semibold text-[#493522]">
                        Finish: <span className="font-normal text-[#8b735e]">{colorName}</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {variants.map((item, index) => {
                          const label = item.colorName || item.color || item.colour || `Option ${index + 1}`;
                          return (
                            <button
                              key={`${label}-${index}`}
                              type="button"
                              onClick={() => changeVariant(index)}
                              aria-pressed={activeVariant === index}
                              className={`rounded-full border px-4 py-2 text-sm transition ${activeVariant === index ? "border-[#351d0e] bg-[#351d0e] text-white" : "border-[#e5d8ca] text-[#634d3b] hover:border-[#a34720]"}`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {variantSizes.length > 1 && (
                    <div className="mt-5">
                      <p className="mb-3 text-sm font-semibold text-[#493522]">Size</p>
                      <div className="flex flex-wrap gap-2">
                        {variantSizes.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              setSelectedSize(size);
                              setQuantity(1);
                            }}
                            aria-pressed={effectiveSize === size}
                            className={`rounded-lg border px-4 py-2 text-sm transition ${effectiveSize === size ? "border-[#351d0e] bg-[#351d0e] text-white" : "border-[#e5d8ca] text-[#634d3b] hover:border-[#a34720]"}`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <div className="inline-flex h-11 items-center overflow-hidden rounded-xl border border-[#e5d8ca]">
                      <button
                        type="button"
                        onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                        className="flex h-full w-10 items-center justify-center text-[#634d3b] transition hover:bg-[#f7f1e9] disabled:opacity-40"
                      >
                        <Minus size={16} />
                      </button>
                      <span aria-live="polite" className="min-w-10 text-center text-sm font-semibold text-[#351d0e]">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((value) => Math.min(availableStock, value + 1))}
                        disabled={quantity >= availableStock}
                        aria-label="Increase quantity"
                        className="flex h-full w-10 items-center justify-center text-[#634d3b] transition hover:bg-[#f7f1e9] disabled:opacity-40"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <p className={`text-xs font-semibold ${availableStock ? "text-emerald-700" : "text-red-700"}`}>
                      {availableStock ? `${availableStock} available` : "Out of stock"}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <button
                      type="button"
                      onClick={() => addToCart(product, variant, effectiveSize, quantity)}
                      disabled={!availableStock}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#351d0e] px-4 text-sm font-semibold text-white transition hover:bg-[#a34720] disabled:cursor-not-allowed disabled:bg-[#c7b5a2]"
                    >
                      <ShoppingBag size={18} />
                      Add to cart
                    </button>
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      disabled={!availableStock}
                      className="min-h-12 rounded-xl bg-[#a34720] px-4 text-sm font-semibold text-white transition hover:bg-[#813718] disabled:cursor-not-allowed disabled:bg-[#c7b5a2]"
                    >
                      Buy now
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleWishlist(product)}
                      aria-label={isWishlisted ? "Remove from favorites" : "Add to favorites"}
                      aria-pressed={isWishlisted}
                      className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#e5d8ca] px-4 text-sm font-semibold transition hover:border-rose-300 hover:bg-rose-50 ${isWishlisted ? "text-rose-600" : "text-[#634d3b]"}`}
                    >
                      <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
                      <span className="sm:hidden">Favorite</span>
                    </button>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-3 border-t border-[#eee4d8] pt-5 text-xs text-[#725d4b] sm:grid-cols-3">
                    <div className="flex items-center gap-2"><Truck size={17} className="shrink-0 text-[#a06e46]" /> Delivery available</div>
                    <div className="flex items-center gap-2"><ShieldCheck size={17} className="shrink-0 text-[#a06e46]" /> Secure checkout</div>
                    <div className="flex items-center gap-2"><RotateCcw size={17} className="shrink-0 text-[#a06e46]" /> Quality assured</div>
                  </div>
                </div>
              </section>

              <section className="mt-10 overflow-hidden rounded-3xl border border-[#eee4d8] bg-white">
                <div role="tablist" aria-label="Product information" className="flex overflow-x-auto border-b border-[#eee4d8]">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      id={`product-tab-${tab.id}`}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      aria-controls={`product-panel-${tab.id}`}
                      onClick={() => setActiveTab(tab.id)}
                      className={`shrink-0 border-b-2 px-5 py-4 text-sm font-semibold transition sm:px-7 ${activeTab === tab.id ? "border-[#a34720] text-[#351d0e]" : "border-transparent text-[#8b735e] hover:text-[#351d0e]"}`}
                    >
                      {tab.label}{tab.id === "reviews" ? ` (${reviews.length})` : ""}
                    </button>
                  ))}
                </div>

                {activeTab === "details" && (
                  <div id="product-panel-details" role="tabpanel" aria-labelledby="product-tab-details" className="p-5 sm:p-8">
                    <h2 className="text-xl font-semibold text-[#351d0e]">Product details</h2>
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#725d4b]">
                      {product.description || "No additional description is available for this product."}
                    </p>
                    {specifications.length > 0 && (
                      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {specifications.map((item) => (
                          <div key={item.label} className="rounded-xl bg-[#fcfaf7] p-4">
                            <dt className="text-[11px] font-bold uppercase tracking-wide text-[#9a8979]">{item.label}</dt>
                            <dd className="mt-1 text-sm font-medium text-[#493522]">{item.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                )}

                {activeTab === "reviews" && (
                  <div id="product-panel-reviews" role="tabpanel" aria-labelledby="product-tab-reviews" className="p-5 sm:p-8">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                      <div>
                        <h2 className="text-xl font-semibold text-[#351d0e]">Customer reviews</h2>
                        <p className="mt-1 text-sm text-[#8b735e]">Reviews shown here are for this product only.</p>
                      </div>
                      {reviews.length > 0 && (
                        <p className="text-sm font-semibold text-[#493522]">
                          {(
                            reviews.reduce((total, item) => total + Number(item.rating || 0), 0) / reviews.length
                          ).toFixed(1)} / 5 average
                        </p>
                      )}
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
                          <article key={review.id} className="rounded-2xl border border-[#eee4d8] bg-[#fcfaf7] p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-[#351d0e]">{review.user_name}</p>
                                {getReviewDate(review.created_at) && (
                                  <p className="mt-1 text-xs text-[#9a8979]">{getReviewDate(review.created_at)}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
                                {Array.from({ length: 5 }, (_, index) => (
                                  <Star
                                    key={index}
                                    size={15}
                                    className={index < Number(review.rating) ? "fill-[#d49a46] text-[#d49a46]" : "text-[#d9cfc4]"}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#634d3b]">{review.comment}</p>
                            {review.review_image && (
                              <img
                                src={resolveMediaUrl(review.review_image)}
                                alt={`Photo for ${product.name} review`}
                                loading="lazy"
                                className="mt-4 max-h-56 rounded-xl object-cover"
                              />
                            )}
                            {review.admin_reply && (
                              <div className="mt-4 rounded-xl border-l-2 border-[#d49a46] bg-white px-4 py-3">
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

                    <div className="mt-7 border-t border-[#eee4d8] pt-6">
                      <h3 className="text-lg font-semibold text-[#351d0e]">Write a review</h3>
                      {myReviewError ? (
                        <p role="alert" className="mt-3 text-sm text-red-700">{myReviewError}</p>
                      ) : myReview ? (
                        <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                          <CheckCircle2 size={18} />
                          {myReview.status === "Published" ? "You have reviewed this product." : "Your review is awaiting approval."}
                        </p>
                      ) : user?.user_id ? (
                        <form onSubmit={handleReviewSubmit} className="mt-4 max-w-2xl space-y-4">
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
                              placeholder="Tell us what you think about this product..."
                              className="mt-2 w-full resize-y rounded-xl border border-[#e5d8ca] bg-white px-4 py-3 text-sm text-[#351d0e] outline-none transition focus:border-[#a34720] focus:ring-2 focus:ring-[#a34720]/10"
                            />
                          </label>
                          <button
                            type="submit"
                            disabled={submittingReview || !comment.trim()}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#351d0e] px-5 text-sm font-semibold text-white transition hover:bg-[#a34720] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {submittingReview && <LoaderCircle size={16} className="animate-spin" />}
                            Submit review
                          </button>
                          <p className="text-xs text-[#9a8979]">You can submit one review for this product. Reviews are published after approval.</p>
                        </form>
                      ) : (
                        <p className="mt-3 text-sm text-[#8b735e]">
                          <Link to="/login" className="font-semibold text-[#a34720] hover:underline">Log in</Link> to write a review.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <section aria-labelledby="related-products-heading" className="mt-10 rounded-3xl border border-[#eee4d8] bg-white p-5 sm:p-8">
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a06e46]">You may also like</p>
                  <h2 id="related-products-heading" className="mt-2 text-2xl font-semibold text-[#351d0e]">Related products</h2>
                </div>
                {relatedLoading ? (
                  <div className="flex gap-5 overflow-hidden">
                    {Array.from({ length: 4 }, (_, index) => (
                      <div key={index} className="aspect-[4/5] w-[min(78vw,280px)] shrink-0 animate-pulse rounded-2xl bg-[#f1e9df]" />
                    ))}
                  </div>
                ) : relatedError ? (
                  <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{relatedError}</p>
                ) : relatedProducts.length ? (
                  <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3" aria-label="Related products">
                    {relatedProducts.map((item) => (
                      <div key={item.id} className="w-[min(78vw,280px)] shrink-0 snap-start">
                        <ProductCard product={item} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#8b735e]">There are no related products to show right now.</p>
                )}
              </section>
            </>
          ) : null}
        </PageContainer>
      </main>
    </>
  );
}

export default ProductDetails;
