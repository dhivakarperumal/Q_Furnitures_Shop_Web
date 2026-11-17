import { useContext } from "react";
import { Armchair, Heart, Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import { resolveMediaUrl } from "../../utils/media";
import { getProductStock } from "../../utils/stock";

function getProductImage(product) {
  let images = product.images;
  if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch {
      images = [images];
    }
  }

  const imageIndex = Number(product.main_image_index) || 0;
  const galleryImage = Array.isArray(images) ? images[imageIndex] || images[0] : "";
  const variantImage = product.variants?.find((variant) => variant.image || variant.images?.length);
  const image = galleryImage || product.image || variantImage?.image || variantImage?.images?.[0];
  return resolveMediaUrl(image);
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function getComboItemCount(product) {
  return Array.isArray(product.combo_items) ? product.combo_items.length : 0;
}

export default function ProductCard({ product, compact = false }) {
  const { cart, wishlist, addToCart, updateCartQuantity, toggleWishlist } = useContext(StoreContext);
  const productId = product.id ?? product.product_id;
  const image = getProductImage(product);
  const defaultVariant = product.variants?.[0] || null;
  const defaultVariantColor = String(defaultVariant?.colorName || defaultVariant?.color || defaultVariant?.colour || "Default");
  const defaultVariantSize = String(defaultVariant?.size || defaultVariant?.selectedSizes?.[0] || "Free Size");
  const price = Number(product.offer_price ?? product.selling_price ?? product.mrp) || 0;
  const mrp = Number(product.mrp) || 0;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const isCombo = product.product_type === "Combo Product";
  const comboItemCount = getComboItemCount(product);
  const stock = Number(product.total_stock) || 0;
  const availableStock = getProductStock(product, defaultVariant, defaultVariantSize);
  const rating = Number(product.rating) || 0;
  const isWishlisted = wishlist.some((item) =>
    String(item.product_id ?? item.productId ?? item.id) === String(productId),
  );
  const cartItem = cart.find((item) =>
    String(item.product_id ?? item.productId ?? item.id) === String(productId) &&
    String(item.colorName || item.variant_color || "Default").trim().toLowerCase() === defaultVariantColor.trim().toLowerCase() &&
    String(item.size || item.variant_size || "Free Size").trim().toLowerCase() === defaultVariantSize.trim().toLowerCase(),
  );

  return (
    <article className={`group flex h-full flex-col overflow-hidden border border-[#eee4d8] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(53,29,14,0.12)] ${compact ? "rounded-xl shadow-[0_3px_12px_rgba(53,29,14,0.05)]" : "rounded-2xl shadow-[0_8px_24px_rgba(53,29,14,0.06)]"}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f7f1e9]">
        <Link to={`/products/${productId}`} aria-label={`View ${product.name} details`} className="absolute inset-0">
          {image ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[#c7b5a2]">
              <Armchair size={54} strokeWidth={1.2} />
            </div>
          )}
        </Link>
        {discount > 0 && (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-emerald-700 px-3 py-1 text-[11px] font-bold tracking-wide text-white">
            {discount}% OFF
          </span>
        )}
        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          aria-label={isWishlisted ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
          aria-pressed={isWishlisted}
          className={`absolute right-2 top-2 z-10 flex items-center justify-center rounded-full bg-white/95 shadow-sm transition hover:scale-105 ${compact ? "h-8 w-8" : "h-10 w-10"} ${isWishlisted ? "text-rose-600" : "text-[#634d3b] hover:text-rose-600"}`}
        >
          <Heart size={compact ? 16 : 18} fill={isWishlisted ? "currentColor" : "none"} />
        </button>
        {stock <= 0 && (
          <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-[#351d0e]/90 px-3 py-1 text-xs font-semibold text-white">
            Out of stock
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a06e46]">
          {isCombo ? "Furniture combo" : product.category || "Furniture"}
        </p>
        <h3 className="mt-1 line-clamp-2 min-h-12 text-base font-semibold leading-6 text-[#351d0e]">
          <Link to={`/products/${productId}`} className="transition hover:text-[#a34720]">
            {product.name}
          </Link>
        </h3>
        {isCombo && (
          <p className="mt-1 text-xs font-medium text-[#8b735e]">
            Includes {comboItemCount} {comboItemCount === 1 ? "product" : "products"}
          </p>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-sm text-[#8b735e]">
          <Star size={15} className="fill-[#d49a46] text-[#d49a46]" />
          <span className="font-semibold text-[#493522]">{rating.toFixed(1)}</span>
          <span className="text-xs">rating</span>
        </div>

        <div className={`mt-auto flex items-end justify-between gap-2 ${compact ? "pt-2" : "pt-4"}`}>
          <div>
            <p className="text-lg font-bold text-[#351d0e]">{formatPrice(price)}</p>
            {mrp > price && <p className="text-xs text-[#9a8979] line-through">{formatPrice(mrp)}</p>}
            {isCombo && mrp > price && <p className="text-xs font-semibold text-emerald-700">Save {formatPrice(mrp - price)}</p>}
          </div>
          {cartItem ? (
            <div className="inline-flex h-10 items-center overflow-hidden rounded-xl border border-primary/30 bg-white">
              <button
                type="button"
                onClick={() => updateCartQuantity(cartItem.id, Number(cartItem.quantity) - 1)}
                disabled={Number(cartItem.quantity) <= 1}
                aria-label={`Decrease ${product.name} quantity`}
                className="flex h-full w-9 items-center justify-center text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus size={15} />
              </button>
              <span aria-live="polite" className="min-w-7 text-center text-sm font-semibold text-[#351d0e]">
                {cartItem.quantity}
              </span>
              <button
                type="button"
                onClick={() => updateCartQuantity(cartItem.id, Number(cartItem.quantity) + 1)}
                disabled={Number(cartItem.quantity) >= availableStock}
                aria-label={`Increase ${product.name} quantity`}
                className="flex h-full w-9 items-center justify-center text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => addToCart(product)}
              disabled={stock <= 0}
              aria-label={`Add ${product.name} to cart`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-[#c7b5a2]"
            >
              <ShoppingBag size={16} />
              <span>Add to cart</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
