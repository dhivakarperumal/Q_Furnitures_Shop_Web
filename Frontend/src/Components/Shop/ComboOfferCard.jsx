import { useContext } from "react";
import { Armchair, Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { Link } from "react-router-dom";
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
  const { cart, addComboToCart, updateCartQuantity } = useContext(StoreContext);
  const image = getComboImage(combo);
  const mrp = Number(combo.mrp) || 0;
  const price = Number(combo.offer_price ?? combo.selling_price) || 0;
  const savings = Math.max(0, mrp - price);
  const discount = mrp > 0 ? Math.round((savings / mrp) * 100) : 0;
  const itemCount = Array.isArray(combo.combo_items) ? combo.combo_items.length : 0;
  const cartItem = cart.find((item) => Number(item.combo_id) === Number(combo.id));
  const availableStock = Number(cartItem?.available_stock ?? combo.total_stock) || 0;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#eee4d8] bg-white shadow-[0_8px_24px_rgba(53,29,14,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(53,29,14,0.12)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f7f1e9]">
        <Link to={`/combo/${combo.id}`} aria-label={`View ${combo.name} details`} className="absolute inset-0">
          {image ? (
            <img
              src={image}
              alt={combo.name}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[#c7b5a2]">
              <Armchair size={54} strokeWidth={1.2} />
            </div>
          )}
        </Link>
        {discount > 0 && (
          <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-emerald-700 px-3 py-1 text-[11px] font-bold tracking-wide text-white">
            {discount}% OFF
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a06e46]">Furniture combo</p>
        <h3 className="mt-1 line-clamp-2 min-h-12 text-base font-semibold leading-6 text-[#351d0e]">
          <Link to={`/combo/${combo.id}`} className="transition hover:text-[#a34720]">{combo.name}</Link>
        </h3>
        <p className="mt-1 text-xs font-medium text-[#8b735e]">
          Includes {itemCount} {itemCount === 1 ? "product" : "products"}
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-sm text-[#8b735e]">
          <Star size={15} className="fill-[#d49a46] text-[#d49a46]" />
          <span className="font-semibold text-[#493522]">{(Number(combo.rating) || 0).toFixed(1)}</span>
          <span className="text-xs">rating</span>
        </div>
        <div className="mt-auto pt-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-lg font-bold text-[#351d0e]">{formatPrice(price)}</p>
              {savings > 0 && (
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-xs text-[#9a8979] line-through">{formatPrice(mrp)}</p>
                  <p className="text-xs font-semibold text-emerald-700">Save {formatPrice(savings)}</p>
                </div>
              )}
            </div>
            {cartItem ? (
              <div className="inline-flex h-10 items-center overflow-hidden rounded-xl border border-primary/30 bg-white">
                <button
                  type="button"
                  onClick={() => updateCartQuantity(cartItem.id, Number(cartItem.quantity) - 1)}
                  disabled={Number(cartItem.quantity) <= 1}
                  aria-label={`Decrease ${combo.name} quantity`}
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
                  aria-label={`Increase ${combo.name} quantity`}
                  className="flex h-full w-9 items-center justify-center text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={15} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => addComboToCart(combo)}
                disabled={availableStock <= 0}
                aria-label={`Add ${combo.name} to cart`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-[#c7b5a2]"
              >
                <ShoppingBag size={16} />
                <span>{availableStock > 0 ? "Add to cart" : "Out of stock"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
