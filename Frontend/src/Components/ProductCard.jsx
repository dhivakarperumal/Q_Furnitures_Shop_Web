import { useContext } from "react";
import { Armchair, Heart, ShoppingBag, Star } from "lucide-react";
import { StoreContext } from "../PrivateRouter/StoreContext";
import { resolveMediaUrl } from "../utils/media";

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

export default function ProductCard({ product }) {
  const { cart, wishlist, addToCart, toggleWishlist } = useContext(StoreContext);
  const productId = product.id ?? product.product_id;
  const image = getProductImage(product);
  const price = Number(product.offer_price ?? product.selling_price ?? product.mrp) || 0;
  const mrp = Number(product.mrp) || 0;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const stock = Number(product.total_stock) || 0;
  const rating = Number(product.rating) || 0;
  const isWishlisted = wishlist.some(
    (item) => String(item.product_id ?? item.productId ?? item.id) === String(productId),
  );
  const isInCart = cart.some(
    (item) => String(item.product_id ?? item.productId ?? item.id) === String(productId),
  );

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#eee4d8] bg-white shadow-[0_8px_24px_rgba(53,29,14,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(53,29,14,0.12)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f7f1e9]">
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#c7b5a2]">
            <Armchair size={54} strokeWidth={1.2} />
          </div>
        )}
        {discount > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-[#a34720] px-3 py-1 text-[11px] font-bold tracking-wide text-white">
            {discount}% OFF
          </span>
        )}
        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          aria-label={isWishlisted ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
          aria-pressed={isWishlisted}
          className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-sm transition hover:scale-105 ${isWishlisted ? "text-rose-600" : "text-[#634d3b] hover:text-rose-600"}`}
        >
          <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
        </button>
        {stock <= 0 && (
          <span className="absolute bottom-3 left-3 rounded-full bg-[#351d0e]/90 px-3 py-1 text-xs font-semibold text-white">
            Out of stock
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a06e46]">
          {product.category || "Furniture"}
        </p>
        <h3 className="mt-1 line-clamp-2 min-h-12 text-base font-semibold leading-6 text-[#351d0e]">
          {product.name}
        </h3>
        <div className="mt-2 flex items-center gap-1.5 text-sm text-[#8b735e]">
          <Star size={15} className="fill-[#d49a46] text-[#d49a46]" />
          <span className="font-semibold text-[#493522]">{rating.toFixed(1)}</span>
          <span className="text-xs">rating</span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div>
            <p className="text-lg font-bold text-[#351d0e]">{formatPrice(price)}</p>
            {mrp > price && <p className="text-xs text-[#9a8979] line-through">{formatPrice(mrp)}</p>}
          </div>
          <button
            type="button"
            onClick={() => addToCart(product)}
            disabled={stock <= 0}
            aria-label={`${isInCart ? "Add another" : "Add"} ${product.name} to cart`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#351d0e] px-3 text-xs font-semibold text-white transition hover:bg-[#a34720] disabled:cursor-not-allowed disabled:bg-[#c7b5a2]"
          >
            <ShoppingBag size={16} />
            <span>{isInCart ? "Add more" : "Add to cart"}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
