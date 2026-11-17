import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from "react";
import { toast } from "react-hot-toast";
import api from "../api";
import { AuthContext } from "./AuthContext";
import { getProductStock } from "../utils/stock";

export const StoreContext = createContext();

const resolveStoredImage = (image) => {
    if (!image || typeof image !== "string" || /^(https?:|data:|blob:)/i.test(image)) return image;
    const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
    return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
};

export const StoreProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [cartState, setCartState] = useState({ userId: null, items: [] });
    const [wishlistState, setWishlistState] = useState({ userId: null, items: [] });
    const [loadingCart, setLoadingCart] = useState(false);
    const [loadingWishlist, setLoadingWishlist] = useState(false);
    const [productsCache, setProductsCache] = useState([]);
    const [videosCache, setVideosCache] = useState([]);
    const [bannersCache, setBannersCache] = useState({});
    const [categoriesCache, setCategoriesCache] = useState([]);
    const [lastFetchTime, setLastFetchTime] = useState(0);
    const cartFetchSequence = useRef(0);
    const wishlistFetchSequence = useRef(0);
    const cart = user?.user_id === cartState.userId ? cartState.items : [];
    const wishlist = user?.user_id === wishlistState.userId ? wishlistState.items : [];

    // ─── Fetch cart from backend ─────────────────────────────────
    const fetchCart = useCallback(async () => {
        const requestSequence = ++cartFetchSequence.current;
        if (!user?.user_id) {
            setCartState({ userId: null, items: [] });
            setLoadingCart(false);
            return;
        }
        try {
            setLoadingCart(true);
            const res = await api.get("/cart");
            if (requestSequence === cartFetchSequence.current) {
                setCartState({
                    userId: user.user_id,
                    items: (Array.isArray(res.data) ? res.data : []).map(item => ({
                        ...item,
                        image: resolveStoredImage(item.image),
                    })),
                });
            }
        } catch (err) {
            console.error("Fetch cart error:", err);
        } finally {
            if (requestSequence === cartFetchSequence.current) setLoadingCart(false);
        }
    }, [user?.user_id]);

    // ─── Fetch wishlist from backend ─────────────────────────────
    const fetchWishlist = useCallback(async () => {
        const requestSequence = ++wishlistFetchSequence.current;
        if (!user?.user_id) {
            setWishlistState({ userId: null, items: [] });
            setLoadingWishlist(false);
            return;
        }
        try {
            setLoadingWishlist(true);
            const res = await api.get("/favorites");
            if (requestSequence === wishlistFetchSequence.current) {
                setWishlistState({
                    userId: user.user_id,
                    items: Array.isArray(res.data) ? res.data : [],
                });
            }
        } catch (err) {
            console.error("Fetch wishlist error:", err);
        } finally {
            if (requestSequence === wishlistFetchSequence.current) setLoadingWishlist(false);
        }
    }, [user?.user_id]);

    // Load cart + wishlist when user logs in
    useEffect(() => {
        fetchCart();
        fetchWishlist();
    }, [fetchCart, fetchWishlist]);

    // ─── CART ACTIONS ────────────────────────────────────────────

    const addToCart = async (product, variant = null, size = null, qty = 1) => {
        if (!user?.user_id) {
            toast.error("Please login to add items to cart");
            return false;
        }

        const productId = product?.product_id ?? product?.productId ?? product?.id;
        if (!productId || !Number.isInteger(Number(productId)) || Number(productId) < 1) {
            console.error("Add to cart skipped: product has no valid id", product);
            toast.error("Unable to add this product to cart");
            return false;
        }

        const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
        const selectedVariant = variant || product.variants?.[0] || null;
        const selectedSize = size || selectedVariant?.size || selectedVariant?.selectedSizes?.[0] ||
            (hasVariants ? "Free Size" : "");
        const quantity = Number(qty);
        if (!Number.isSafeInteger(quantity) || quantity < 1) {
            toast.error("Choose a valid quantity");
            return false;
        }
        const availableStock = getProductStock(product, selectedVariant, selectedSize);
        if (availableStock < 1) {
            toast.error("This product is out of stock");
            return false;
        }
        if (quantity > availableStock) {
            toast.error(`Only ${availableStock} item${availableStock === 1 ? "" : "s"} available`);
            return false;
        }
        const variantColor = selectedVariant?.colorName || selectedVariant?.color || selectedVariant?.colour || "Default";
        
        try {
            await api.post("/cart", {
                product_id: Number(productId),
                variant_color: variantColor,
                variant_size: selectedSize,
                quantity,
            });
            toast.success("Added to cart!");
            await fetchCart();
            return true;
        } catch (err) {
            console.error("Add to cart error:", err);
            toast.error(err.response?.data?.message || "Failed to add to cart");
            return false;
        }
    };

    const addComboToCart = async (combo, qty = 1) => {
        if (!user?.user_id) {
            toast.error("Please login to add items to cart");
            return false;
        }

        const comboId = combo?.combo_id ?? combo?.id;
        if (!comboId || !Number.isInteger(Number(comboId)) || Number(comboId) < 1) {
            console.error("Add to cart skipped: combo has no valid id", combo);
            toast.error("Unable to add this combo to cart");
            return false;
        }
        const quantity = Number(qty);
        if (!Number.isSafeInteger(quantity) || quantity < 1) {
            toast.error("Choose a valid quantity");
            return false;
        }

        try {
            await api.post("/cart", { combo_id: Number(comboId), quantity });
            toast.success("Combo added to cart!");
            await fetchCart();
            return true;
        } catch (err) {
            console.error("Add combo to cart error:", err);
            toast.error(err.response?.data?.message || "Failed to add combo to cart");
            return false;
        }
    };

    const removeFromCart = async (cartItemId) => {
        try {
            await api.delete(`/cart/${cartItemId}`);
            toast.error("Removed from cart");
            await fetchCart();
        } catch (err) {
            console.error("Remove cart error:", err);
            toast.error("Failed to remove item");
        }
    };

    const updateCartQuantity = async (cartItemId, qty) => {
        if (qty < 1) return;
        const targetItem = cart.find(i => i.id === cartItemId);
        if (!targetItem) return;

        try {
            await api.put(`/cart/${cartItemId}`, { quantity: qty });
            await fetchCart();
        } catch (err) {
            console.error("Update qty error:", err);
            toast.error(err.response?.data?.message || "Failed to update quantity");
        }
    };

    const clearCart = async () => {
        if (!user?.user_id) {
            setCartState({ userId: null, items: [] });
            return;
        }
        try {
            await api.delete("/cart/clear");
            setCartState({ userId: user.user_id, items: [] });
        } catch (err) {
            console.error("Clear cart error:", err);
        }
    };

    // ─── WISHLIST ACTIONS ────────────────────────────────────────

    const toggleWishlist = async (item) => {
        if (!user?.user_id) {
            toast.error("Please login to manage wishlist");
            return;
        }

        const isCombo = item.item_type === "combo" || item.combo_id != null;
        const itemId = isCombo
            ? item.combo_id ?? String(item.id).replace(/^combo-/, "")
            : item.product_id ?? item.productId ?? item.id;
        const isAlready = wishlist.some((favorite) => {
            const favoriteIsCombo = favorite.item_type === "combo" || favorite.combo_id != null;
            if (favoriteIsCombo !== isCombo) return false;
            const favoriteId = isCombo
                ? favorite.combo_id ?? String(favorite.id).replace(/^combo-/, "")
                : favorite.product_id ?? favorite.productId ?? favorite.id;
            return String(favoriteId) === String(itemId);
        });

        try {
            if (isAlready) {
                await api.delete(isCombo ? `/favorites/combos/${itemId}` : `/favorites/${itemId}`);
                toast.success("Removed from favorites");
            } else {
                if (isCombo) {
                    await api.post(`/favorites/combos/${itemId}`);
                } else {
                    await api.post("/favorites", { product_id: Number(itemId) });
                }
                toast.success(isCombo ? "Combo added to favorites!" : "Added to favorites!");
            }
            await fetchWishlist();
        } catch (err) {
            console.error("Toggle wishlist error:", err);
            toast.error("Failed to update wishlist");
        }
    };

    return (
        <StoreContext.Provider value={{
            cart, wishlist,
            addToCart, addComboToCart, removeFromCart, updateCartQuantity, clearCart,
            toggleWishlist,
            loadingCart, loadingWishlist,
            fetchCart, fetchWishlist,
            productsCache, setProductsCache,
            videosCache, setVideosCache,
            bannersCache, setBannersCache,
            categoriesCache, setCategoriesCache,
            lastFetchTime, setLastFetchTime
        }}>
            {children}
        </StoreContext.Provider>
    );
};
