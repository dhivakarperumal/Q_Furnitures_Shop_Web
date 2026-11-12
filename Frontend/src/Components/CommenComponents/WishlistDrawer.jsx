import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiHeart, FiShoppingCart, FiX, FiTrash2 } from "react-icons/fi";
import { StoreContext } from "../../PrivateRouter/StoreContext";

const resolveImageUrl = (image) => {
  if (!image || typeof image !== "string" || /^(https?:|data:|blob:)/i.test(image)) return image;
  const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
};

const WishlistDrawer = ({ isOpen, onClose }) => {
  const { wishlist, loadingWishlist, toggleWishlist, addToCart } = useContext(StoreContext);
  const navigate = useNavigate();
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const goTo = (path) => {
    onClose();
    navigate(path);
  };

  const handleAddToCart = async (item) => {
    const matchingVariant = item.variants?.find(
      (variant) => variant.color === item.colorName || variant.colorName === item.colorName,
    ) || item.variants?.[0] || null;
    await addToCart(item, matchingVariant, item.size, quantities[item.id] || 1);
  };

  const handleAddAllToCart = async () => {
    for (const item of wishlist) {
      await handleAddToCart(item);
    }
  };

  const updateQuantity = (itemId, amount) => {
    setQuantities((current) => ({
      ...current,
      [itemId]: Math.max(1, (current[itemId] || 1) + amount),
    }));
  };

  return (
    <div
      className={`fixed inset-0 z-[60] overflow-hidden transition-opacity duration-300 ${isOpen ? "visible opacity-100" : "invisible opacity-0"}`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Close favorites"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/40"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Favorites"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <FiHeart className="text-primary" size={22} />
            <div>
              <h2 className="text-lg font-bold text-gray-800">Your Favorites</h2>
              <p className="text-xs text-gray-500">{wishlist.length} {wishlist.length === 1 ? "item" : "items"}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close favorites" className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-primary">
            <FiX size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loadingWishlist ? (
            <p className="py-12 text-center text-sm text-gray-500">Loading your favorites...</p>
          ) : wishlist.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <FiHeart className="mb-4 text-primary-light" size={48} />
              <h3 className="text-lg font-semibold text-gray-700">No favorites yet</h3>
              <p className="mt-2 text-sm text-gray-500">Save your favorite sarees here.</p>
              <button type="button" onClick={() => goTo("/shop")} className="mt-6 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark">
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {wishlist.map((item) => (
                <div key={item.id || item.product_id} className="flex gap-3 rounded-lg border border-gray-200 p-3">
                  <img
                    src={resolveImageUrl(item.image) || "https://ui-avatars.com/api/?name=Product&background=f3f4f6&color=240046"}
                    alt={item.name || "Product"}
                    className="h-20 w-16 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-gray-800">{item.name || "Product"}</h3>
                      <button type="button" onClick={() => toggleWishlist(item)} aria-label={`Remove ${item.name || "item"}`} className="shrink-0 rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500">
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-primary">₹{Number(item.price || 0).toFixed(2)}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                      {item.colorName && <span>Color: {item.colorName}</span>}
                      {item.size && <span>Size: {item.size}</span>}
                    </div>
                    <div className="mt-2 flex w-full items-center justify-between gap-2">
                      <div className="flex h-8 w-24 items-center overflow-hidden rounded-lg border border-gray-200">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          disabled={(quantities[item.id] || 1) <= 1}
                          aria-label="Decrease quantity"
                          className="flex h-full flex-1 items-center justify-center text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-xs font-semibold text-gray-700">{quantities[item.id] || 1}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          aria-label="Increase quantity"
                          className="flex h-full flex-1 items-center justify-center text-gray-600 transition hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item)}
                        title="Add to Cart"
                        aria-label={`Add ${item.name || "item"} to cart`}
                        className="ml-auto rounded-lg bg-primary p-2 text-white transition hover:bg-primary-dark"
                      >
                        <FiShoppingCart size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {wishlist.length > 0 && !loadingWishlist && (
          <div className="space-y-2 border-t border-gray-100 bg-white px-5 py-4">
            <button type="button" onClick={handleAddAllToCart} className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-dark">
              Add All Products to Cart
            </button>
            <button type="button" onClick={() => goTo("/shop")} className="w-full rounded-lg border border-primary py-3 text-sm font-semibold text-primary transition hover:bg-primary/10">
              Continue Shopping
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};

export default WishlistDrawer;