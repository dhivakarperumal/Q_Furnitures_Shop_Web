import { useContext } from "react";
import { Armchair, Heart, Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import { resolveMediaUrl } from "../../utils/media";

function getComboImage(combo) {
  let images = combo.images;
  if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch {
      images = [images];
    }
  }
  const imageIndex = Number(combo.main_image_index) || 0;
  const image = Array.isArray(images) ? images[imageIndex] || images[0] : combo.image;
  return resolveMediaUrl(image);
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export default function ComboOfferCard({ combo }) {
  const navigate = useNavigate();
  const { cart, wishlist, addComboToCart, updateCartQuantity, toggleWishlist } = useContext(StoreContext);
  const image = getComboImage(combo);
  const mrp = Number(combo.mrp) || 0;
  const price = Number(combo.offer_price ?? combo.selling_price) || 0;
  const savings = Math.max(0, mrp - price);
  const discount = mrp > 0 ? Math.round((savings / mrp) * 100) : 0;
  const itemCount = Array.isArray(combo.combo_items) ? combo.combo_items.length : 0;
  const isWishlisted = wishlist.some((item) =>
    item.item_type === "combo" && Number(item.combo_id) === Number(combo.id),
  );
  const cartItem = cart.find((item) => Number(item.combo_id) === Number(combo.id));
  const availableStock = Number(cartItem?.available_stock ?? combo.total_stock) || 0;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#eee4d8] bg-white shadow-[0_8px_24px_rgba(53,29,14,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(53,29,14,0.12)]">
      <div className="relative aspect-[5/4] overflow-hidden bg-[#f7f1e9]">
        <Link to={`/combo/${combo.id}`} aria-label={`View ${combo.name} details`} className="absolute inset-0">
          {image ? (
            <img
              src={image}
              alt={combo.name}
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
          <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-[#ff6a00] px-3 py-1.5 text-[11px] font-bold tracking-wide text-white shadow-sm">
            {discount}% OFF
          </span>
        )}
        <button
          type="button"
          onClick={() => toggleWishlist({ ...combo, item_type: "combo" })}
          aria-label={isWishlisted ? `Remove ${combo.name} from favorites` : `Add ${combo.name} to favorites`}
          aria-pressed={isWishlisted}
          className={`absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-sm transition hover:scale-105 ${
            isWishlisted ? "text-rose-600" : "text-[#634d3b] hover:text-rose-600"
          }`}
        >
          <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#ff6a00]">Furniture combo</p>
        <h3 className="mt-0.5 truncate whitespace-nowrap text-base font-bold leading-6 text-[#351d0e]" title={combo.name}>
          <Link to={`/combo/${combo.id}`} className="transition hover:text-[#a34720]">{combo.name}</Link>
        </h3>
        <div className="mt-1 flex items-center gap-1.5 text-sm text-[#8b735e]">
          <Star size={15} className="fill-[#d49a46] text-[#d49a46]" />
          <span className="font-semibold text-[#493522]">{(Number(combo.rating) || 0).toFixed(1)}</span>
          <span className="text-xs">({Number(combo.review_count) || 0} Reviews)</span>
        </div>
        <div className="mt-auto pt-2">
          <div className="flex items-end gap-2">
            <div className="min-w-0">
              <p className="text-lg font-bold text-[#ff6a00]">{formatPrice(price)}</p>
              {savings > 0 && (
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="text-xs text-[#9a8979] line-through">{formatPrice(mrp)}</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={async () => {
                if (availableStock <= 0) return;
                navigate("/checkout", {
                  state: {
                    buyNowItem: {
                      combo_id: combo.id,
                      quantity: 1,
                      name: combo.name,
                      image,
                      price,
                      item_type: "combo",
                      combo_items: Array.isArray(combo.combo_items) ? combo.combo_items : [],
                    },
                  },
                });
              }}
              disabled={availableStock <= 0}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#ff7a00] px-2 text-xs font-bold text-white transition hover:bg-[#e85d00] disabled:cursor-not-allowed disabled:bg-[#c7b5a2]"
            >
              <ShoppingBag size={16} />
              Buy Now
            </button>
            {cartItem ? (
              <div className="inline-flex h-10 items-center justify-between overflow-hidden rounded-xl border-2 border-[#ff7a00] bg-white text-[#351d0e]">
                <button type="button" onClick={() => updateCartQuantity(cartItem.id, Number(cartItem.quantity) - 1)} disabled={Number(cartItem.quantity) <= 1} aria-label={`Decrease ${combo.name} quantity`} className="flex h-full w-8 items-center justify-center text-[#ff6a00] disabled:opacity-40"><Minus size={14} /></button>
                <span aria-live="polite" className="text-xs font-bold">{cartItem.quantity}</span>
                <button type="button" onClick={() => updateCartQuantity(cartItem.id, Number(cartItem.quantity) + 1)} disabled={Number(cartItem.quantity) >= availableStock} aria-label={`Increase ${combo.name} quantity`} className="flex h-full w-8 items-center justify-center text-[#ff6a00] disabled:opacity-40"><Plus size={14} /></button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => addComboToCart(combo)}
                disabled={availableStock <= 0}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border-2 border-[#ff7a00] bg-white px-2 text-xs font-bold text-[#351d0e] transition hover:bg-[#fff3e8] disabled:cursor-not-allowed disabled:border-[#c7b5a2] disabled:text-[#9a8979]"
              >
                <ShoppingBag size={16} className="text-[#ff6a00]" />
                <span className="truncate">Add to Cart</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
