import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiMinus, FiPlus, FiShoppingCart, FiTrash2, FiX } from "react-icons/fi";
import { StoreContext } from "../../PrivateRouter/StoreContext";

const CartDrawer = ({ isOpen, onClose }) => {
  const { cart, loadingCart, removeFromCart, updateCartQuantity } = useContext(StoreContext);
  const navigate = useNavigate();

  const totalItems = cart.reduce((total, item) => total + Number(item.quantity || 0), 0);
  const totalAmount = cart.reduce(
    (total, item) => total + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );

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

  return (
    <div
      className={`fixed inset-0 z-[60] overflow-hidden transition-opacity duration-300 ${isOpen ? "visible opacity-100" : "invisible opacity-0"}`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Close cart"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/40"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <FiShoppingCart className="text-primary" size={22} />
            <div>
              <h2 className="text-lg font-bold text-gray-800">Your Cart</h2>
              <p className="text-xs text-gray-500">{totalItems} {totalItems === 1 ? "item" : "items"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-primary"
          >
            <FiX size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loadingCart ? (
            <p className="py-12 text-center text-sm text-gray-500">Loading your cart...</p>
          ) : cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <FiShoppingCart className="mb-4 text-primary-light" size={48} />
              <h3 className="text-lg font-semibold text-gray-700">Your cart is empty</h3>
              <p className="mt-2 text-sm text-gray-500">Add something beautiful to get started.</p>
              <button
                type="button"
                onClick={() => goTo("/shop")}
                className="mt-6 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => {
                const itemSubtotal = Number(item.price || 0) * Number(item.quantity || 0);
                return (
                  <div key={item.id} className="flex gap-3 rounded-lg border border-gray-200 p-3">
                    <img
                      src={item.image || "https://ui-avatars.com/api/?name=Product&background=f3f4f6&color=240046"}
                      alt={item.name || "Product"}
                      className="h-20 w-16 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold text-gray-800">{item.name}</h3>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          aria-label={`Remove ${item.name || "item"}`}
                          className="shrink-0 rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-primary">₹{Number(item.price || 0).toFixed(2)}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {item.colorName && (
                          <span className="flex items-center gap-1.5">
                            <span
                              className="h-3 w-3 rounded-full border border-gray-300"
                              style={{ backgroundColor: item.colorHex || "#d1d5db" }}
                            />
                            Color: {item.colorName}
                          </span>
                        )}
                        {item.size && <span>Size: {item.size}</span>}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center overflow-hidden rounded-lg border border-gray-200">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, Number(item.quantity || 1) - 1)}
                            disabled={Number(item.quantity || 1) <= 1}
                            aria-label="Decrease quantity"
                            className="p-1.5 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <FiMinus size={14} />
                          </button>
                          <span className="min-w-7 text-center text-sm font-semibold text-gray-700">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, Number(item.quantity || 0) + 1)}
                            aria-label="Increase quantity"
                            className="p-1.5 text-gray-600 transition hover:bg-gray-100"
                          >
                            <FiPlus size={14} />
                          </button>
                        </div>
                        <span className="text-sm font-bold text-gray-800">₹{itemSubtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {cart.length > 0 && !loadingCart && (
          <div className="border-t border-gray-100 bg-white px-5 py-4">
            <div className="mb-1 flex justify-between text-sm text-gray-600">
              <span>Total Items</span>
              <span>{totalItems}</span>
            </div>
            <div className="mb-4 flex justify-between text-lg font-bold text-gray-800">
              <span>Total Amount</span>
              <span className="text-primary">₹{totalAmount.toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={() => goTo("/checkout")}
              className="w-full rounded-lg bg-primary py-3 font-semibold text-white transition hover:bg-primary-dark"
            >
              Checkout
            </button>
            <button
              type="button"
              onClick={() => goTo("/shop")}
              className="mt-2 w-full rounded-lg border border-primary py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};

export default CartDrawer;