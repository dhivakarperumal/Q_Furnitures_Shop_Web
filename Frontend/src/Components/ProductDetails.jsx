import { useContext, useEffect, useState } from "react";
import {
  ArrowLeft,
  Armchair,
  Check,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api";
import { StoreContext } from "../PrivateRouter/StoreContext";
import { resolveMediaUrl } from "../utils/media";
import { getProductStock } from "../utils/stock";
import PageContainer from "./CommenComponents/PageContainer";

function parseImages(value) {
  if (Array.isArray(value)) return value.filter((image) => typeof image === "string" && image);
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((image) => typeof image === "string" && image);
    return typeof parsed === "string" && parsed ? [parsed] : [value];
  } catch {
    return [value];
  }
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function getVariantLabel(variant) {
  return [
    variant.colorName || variant.color || variant.colour,
    variant.size || variant.selectedSizes?.join(", "),
    variant.material,
  ].filter(Boolean).join(" · ") || "Standard";
}

function DetailValue({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-5 border-b border-[#eee4d8] py-3 last:border-0">
      <dt className="text-sm text-[#8b735e]">{label}</dt>
      <dd className="text-right text-sm font-semibold text-[#351d0e]">{String(value)}</dd>
    </div>
  );
}

export default function ProductDetails() {
  const { id } = useParams();
  const { addToCart, wishlist, toggleWishlist } = useContext(StoreContext);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let active = true;
    api.get(`/products/${id}`)
      .then(({ data }) => {
        if (active) {
          setProduct(data);
          setError(null);
          setSelectedVariantIndex(0);
          const imageCount = parseImages(data.images).length;
          const mainImageIndex = Number(data.main_image_index) || 0;
          setActiveImageIndex(Math.min(mainImageIndex, Math.max(imageCount - 1, 0)));
          setQuantity(1);
        }
      })
      .catch((requestError) => {
        if (active) {
          console.error("Product details request failed:", requestError);
          setError({
            id,
            message: requestError.response?.data?.message || "This product could not be found.",
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const selectedVariant = variants[selectedVariantIndex] || null;
  const productId = product?.id ?? product?.product_id;
  const gallery = (() => {
    if (!product) return [];
    const images = parseImages(product.images);
    const variantImages = variants.flatMap((variant) => [
      ...parseImages(variant.images),
      ...parseImages(variant.image),
    ]);
    const allImages = [...images, ...variantImages];
    if (!allImages.length && product.image) allImages.push(product.image);
    return [...new Set(allImages)].map(resolveMediaUrl).filter(Boolean);
  })();
  const price = Number(selectedVariant?.selling_price ?? selectedVariant?.offer_price ?? product?.offer_price ?? product?.selling_price ?? product?.mrp) || 0;
  const mrp = Number(selectedVariant?.mrp ?? product?.mrp) || 0;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const selectedSize = selectedVariant?.size || selectedVariant?.selectedSizes?.[0] || "";
  const stock = product ? getProductStock(product, selectedVariant, selectedSize) : 0;
  const isWishlisted = wishlist.some((item) =>
    String(item.product_id ?? item.productId ?? item.id) === String(productId),
  );
  const specifications = product?.specifications || {};
  const shipping = product?.shipping || {};
  const specificationRows = [
    ["Material", specifications.materialType || product?.material_type || product?.material],
    ["Wood type", specifications.woodType || product?.wood_type],
    ["Colour", specifications.colour || product?.colour],
    ["Finish", specifications.finishType || product?.finish_type],
    ["Dimensions", [
      specifications.height || product?.height,
      specifications.width || product?.width,
      specifications.depth || product?.depth,
    ].filter(Boolean).join(" × ")],
    ["Weight", specifications.weight || product?.weight],
    ["Seating capacity", specifications.seatingCapacity || product?.seating_capacity],
    ["Warranty", specifications.warrantyPeriod || product?.warranty_period],
    ["Country of origin", specifications.countryOfOrigin || product?.country_of_origin],
  ];

  const selectVariant = (index) => {
    setSelectedVariantIndex(index);
    setQuantity(1);
    const variant = variants[index];
    const variantImage = parseImages(variant.images)[0] || variant.image;
    if (variantImage) {
      const imageIndex = gallery.indexOf(resolveMediaUrl(variantImage));
      if (imageIndex >= 0) setActiveImageIndex(imageIndex);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    if (quantity > stock) {
      toast.error(`Only ${stock} item${stock === 1 ? "" : "s"} available`);
      return;
    }
    await addToCart(product, selectedVariant, selectedSize, quantity);
  };

  const currentError = error?.id === id ? error.message : "";
  const isLoading = loading || (!currentError && (!product || String(productId) !== String(id)));

  if (isLoading) {
    return (
      <main className="min-h-[65vh] bg-[#fcfaf7] py-10 sm:py-14">
        <PageContainer>
          <div className="grid animate-pulse gap-8 lg:grid-cols-2">
            <div className="aspect-square rounded-[2rem] bg-[#eee4d8]" />
            <div className="space-y-5 py-5">
              <div className="h-4 w-1/3 rounded bg-[#eee4d8]" />
              <div className="h-10 w-4/5 rounded bg-[#eee4d8]" />
              <div className="h-8 w-1/3 rounded bg-[#eee4d8]" />
              <div className="h-24 rounded bg-[#eee4d8]" />
              <div className="h-14 rounded bg-[#eee4d8]" />
            </div>
          </div>
        </PageContainer>
      </main>
    );
  }

  if (currentError || !product) {
    return (
      <main className="min-h-[65vh] bg-[#fcfaf7] py-16">
        <PageContainer>
          <div role="alert" className="mx-auto max-w-xl rounded-3xl border border-[#eee4d8] bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f7f1e9] text-[#a06e46]">
              <Armchair size={30} />
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-[#351d0e]">We couldn’t find that piece</h1>
            <p className="mt-2 text-sm text-[#8b735e]">{currentError || "This product may no longer be available."}</p>
            <Link to="/shop" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#351d0e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a34720]">
              <ArrowLeft size={16} /> Back to the shop
            </Link>
          </div>
        </PageContainer>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fcfaf7] pb-16">
      <PageContainer>
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 py-5 text-xs text-[#8b735e] sm:py-7">
          <Link to="/" className="transition hover:text-[#d9650b]">Home</Link>
          <ChevronRight size={14} />
          <Link to="/shop" className="transition hover:text-[#d9650b]">Shop</Link>
          {product.category && (
            <>
              <ChevronRight size={14} />
              <Link to={`/shop?category=${encodeURIComponent(product.category)}`} className="transition hover:text-[#d9650b]">{product.category}</Link>
            </>
          )}
          <ChevronRight size={14} />
          <span className="max-w-[45vw] truncate font-semibold text-[#351d0e]" aria-current="page">{product.name}</span>
        </nav>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)] lg:gap-12 xl:gap-16">
          <section aria-label="Product images" className="min-w-0">
            <div className="group relative aspect-square overflow-hidden rounded-[1.75rem] border border-[#eee4d8] bg-[#f4eee6] sm:rounded-[2rem]">
              {gallery[activeImageIndex] ? (
                <img
                  src={gallery[activeImageIndex]}
                  alt={product.name}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[#c7b5a2]"><Armchair size={96} strokeWidth={1} /></div>
              )}
              {discount > 0 && (
                <span className="absolute left-4 top-4 rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold tracking-wide text-white shadow-sm">
                  SAVE {discount}%
                </span>
              )}
              <button
                type="button"
                onClick={() => toggleWishlist(product)}
                aria-label={isWishlisted ? "Remove from favorites" : "Add to favorites"}
                aria-pressed={isWishlisted}
                className={`absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-md transition hover:scale-105 ${isWishlisted ? "text-rose-600" : "text-[#634d3b] hover:text-rose-600"}`}
              >
                <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
              </button>
              <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-[#634d3b] backdrop-blur">
                {gallery.length ? `${activeImageIndex + 1} / ${gallery.length}` : "Product view"}
              </span>
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {gallery.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    aria-label={`View product image ${index + 1}`}
                    aria-pressed={activeImageIndex === index}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-[#f4eee6] transition sm:h-24 sm:w-24 ${activeImageIndex === index ? "border-[#d9650b] shadow-sm" : "border-transparent hover:border-[#d7cabe]"}`}
                  >
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="lg:sticky lg:top-8">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#a06e46]">
              <span>{product.category || "Q Living collection"}</span>
              {product.subcategory && <><span className="h-1 w-1 rounded-full bg-[#c7b5a2]" /><span>{product.subcategory}</span></>}
            </div>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-[#351d0e] sm:text-4xl xl:text-[2.75rem]">
              {product.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff4df] px-3 py-1.5 text-sm font-bold text-[#4c392a]">
                <Star size={15} className="fill-[#ed9b00] text-[#ed9b00]" />
                {Number(product.rating || 0).toFixed(1)}
              </span>
              <span className="text-sm text-[#8b735e]">Customer favourite</span>
              {product.product_code && <span className="ml-auto text-xs text-[#9a8979]">SKU {product.product_code}</span>}
            </div>

            <div className="mt-6 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span className="text-3xl font-bold tracking-tight text-[#351d0e] sm:text-4xl">{formatPrice(price)}</span>
              {mrp > price && <span className="pb-1 text-base text-[#9a8979] line-through">{formatPrice(mrp)}</span>}
              {discount > 0 && <span className="pb-1 text-sm font-bold text-emerald-700">{discount}% off</span>}
            </div>
            <p className="mt-1 text-xs text-[#8b735e]">Inclusive of all taxes</p>

            {product.description && (
              <p className="mt-6 max-w-2xl text-sm leading-7 text-[#725d4b]">{product.description}</p>
            )}

            {variants.length > 0 && (
              <fieldset className="mt-7">
                <legend className="mb-3 text-sm font-bold text-[#351d0e]">
                  Choose your style
                  {selectedVariant && <span className="ml-2 font-normal text-[#8b735e]">{getVariantLabel(selectedVariant)}</span>}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {variants.map((variant, index) => (
                    <button
                      key={`${getVariantLabel(variant)}-${index}`}
                      type="button"
                      onClick={() => selectVariant(index)}
                      aria-pressed={selectedVariantIndex === index}
                      className={`relative rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition sm:text-sm ${selectedVariantIndex === index ? "border-[#d9650b] bg-[#fff7ed] text-[#8c3d0c] ring-2 ring-[#d9650b]/10" : "border-[#e5d8ca] bg-white text-[#634d3b] hover:border-[#c7a98c]"}`}
                    >
                      {getVariantLabel(variant)}
                      {selectedVariantIndex === index && <Check size={13} className="absolute -right-1.5 -top-1.5 rounded-full bg-[#d9650b] p-0.5 text-white" />}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="mt-7 rounded-2xl border border-[#eee4d8] bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#351d0e]">{stock > 0 ? "Ready for your home" : "Currently unavailable"}</p>
                  <p className={`mt-1 text-xs ${stock > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    {stock > 0 ? `${stock} in stock` : "This item is out of stock"}
                  </p>
                </div>
                <div className="inline-flex h-10 items-center overflow-hidden rounded-xl border border-[#e5d8ca]">
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="flex h-full w-10 items-center justify-center text-[#634d3b] transition hover:bg-[#f7f1e9] disabled:opacity-40"
                  ><Minus size={15} /></button>
                  <span aria-live="polite" className="min-w-9 text-center text-sm font-semibold text-[#351d0e]">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.min(stock, current + 1))}
                    disabled={quantity >= stock}
                    aria-label="Increase quantity"
                    className="flex h-full w-10 items-center justify-center text-[#634d3b] transition hover:bg-[#f7f1e9] disabled:opacity-40"
                  ><Plus size={15} /></button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={stock <= 0}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#351d0e] px-5 text-sm font-bold text-white transition hover:bg-[#a34720] disabled:cursor-not-allowed disabled:bg-[#c7b5a2]"
              >
                <ShoppingBag size={18} />
                {stock > 0 ? "Add to cart" : "Out of stock"}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2.5 rounded-xl bg-[#f5efe7] p-3.5">
                <Truck size={18} className="mt-0.5 shrink-0 text-[#a06e46]" />
                <div>
                  <p className="text-xs font-bold text-[#493522]">Thoughtful delivery</p>
                  <p className="mt-1 text-[11px] leading-4 text-[#8b735e]">
                    {shipping.estimatedDeliveryDays ? `${shipping.estimatedDeliveryDays} day delivery` : "Delivery options at checkout"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl bg-[#f5efe7] p-3.5">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#a06e46]" />
                <div>
                  <p className="text-xs font-bold text-[#493522]">Made to last</p>
                  <p className="mt-1 text-[11px] leading-4 text-[#8b735e]">
                    {specifications.warrantyPeriod || product.warranty_period || "Quality checked"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-12 grid gap-5 border-t border-[#e9ded2] pt-9 md:grid-cols-2 lg:mt-16 lg:gap-10 lg:pt-12">
          <div className="rounded-2xl border border-[#eee4d8] bg-white p-5 sm:p-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a06e46]">The details</p>
            <h2 className="mt-2 text-xl font-semibold text-[#351d0e]">Designed for everyday living</h2>
            <p className="mt-3 text-sm leading-7 text-[#725d4b]">
              {product.description || `Bring comfort and character to your home with the ${product.name}. Thoughtfully selected for quality, style, and everyday use.`}
            </p>
            {shipping.assemblyRequired && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#f7f1e9] px-3 py-2 text-xs font-semibold text-[#634d3b]">
                <Check size={14} className="text-emerald-700" /> Assembly required
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-[#eee4d8] bg-white p-5 sm:p-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a06e46]">Specifications</p>
            <h2 className="mt-2 text-xl font-semibold text-[#351d0e]">Good to know</h2>
            <dl className="mt-3">
              {specificationRows.map(([label, value]) => <DetailValue key={label} label={label} value={value} />)}
              {!specificationRows.some(([, value]) => value) && (
                <p className="py-3 text-sm text-[#8b735e]">Contact us for more information about this product.</p>
              )}
            </dl>
          </div>
        </section>
      </PageContainer>
    </main>
  );
}
