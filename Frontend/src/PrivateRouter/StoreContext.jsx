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

const getFirstStoredImage = (images) => {
    if (!images) return null;
    try {
        const parsed = typeof images === "string" ? JSON.parse(images) : images;
        return Array.isArray(parsed) ? parsed[0] || null : parsed;
    } catch {
        return typeof images === "string" ? images : null;
    }
};

export const StoreProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [cart, setCart] = useState([]);
    const [wishlistState, setWishlistState] = useState({ userId: null, items: [] });
    const [loadingCart, setLoadingCart] = useState(false);
    const [loadingWishlist, setLoadingWishlist] = useState(false);
    const [productsCache, setProductsCache] = useState([]);
    const [videosCache, setVideosCache] = useState([]);
    const [bannersCache, setBannersCache] = useState({});
    const [categoriesCache, setCategoriesCache] = useState([]);
    const [lastFetchTime, setLastFetchTime] = useState(0);
    const wishlistFetchSequence = useRef(0);
    const wishlist = user?.user_id === wishlistState.userId ? wishlistState.items : [];

    // ─── Fetch cart from backend ─────────────────────────────────
    const fetchCart = useCallback(async () => {
        if (!user?.user_id) { setCart([]); return; }
        try {
            setLoadingCart(true);
            const res = await api.get(`/cart/${user.user_id}`);
            setCart((Array.isArray(res.data) ? res.data : []).map(item => ({
                ...item,
                image: resolveStoredImage(item.image),
            })));
        } catch (err) {
            console.error("Fetch cart error:", err);
        } finally {
            setLoadingCart(false);
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
            return;
        }

        const productId = product?.product_id ?? product?.productId ?? product?.id;
        if (!productId || !Number.isInteger(Number(productId)) || Number(productId) < 1) {
            console.error("Add to cart skipped: product has no valid id", product);
            toast.error("Unable to add this product to cart");
            return;
        }

        const selectedVariant = variant || product.variants?.[0] || null;
        const selectedSize = size || selectedVariant?.selectedSizes?.[0] || "Free Size";
        const availableStock = getProductStock(product, selectedVariant, selectedSize);
        if (availableStock < 1) {
            toast.error("This product is out of stock");
            return;
        }
        if (qty > availableStock) {
            toast.error(`Only ${availableStock} item${availableStock === 1 ? "" : "s"} available`);
            return;
        }
        const variantColor = selectedVariant?.colorName || selectedVariant?.color || "Default";
        
        // Correctly parse images if they are stored as JSON strings
        const variantImage = getFirstStoredImage(selectedVariant?.images) || getFirstStoredImage(product.images);
        
        const price = parseFloat(product.offer_price || product.price || 0);

        try {
            await api.post("/cart", {
                user_id: user.user_id,
                product_id: Number(productId),
                variant_color: variantColor,
                variant_size: selectedSize,
                image: variantImage,
                email: user.email || "",
                price: price,
                total_price: price * qty, 
                quantity: qty,
            });
            toast.success("Added to cart!");
            await fetchCart(); // Refresh from backend to get image + full details
        } catch (err) {
            console.error("Add to cart error:", err);
            toast.error(err.response?.data?.message || "Failed to add to cart");
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
            await api.put(`/cart/${cartItemId}`, {
                quantity: qty,
                price: targetItem.price
            });
            setCart(prev => prev.map(item =>
                item.id === cartItemId ? {
                    ...item,
                    quantity: qty,
                    total_price: item.price * qty
                } : item
            ));
        } catch (err) {
            console.error("Update qty error:", err);
            toast.error("Failed to update quantity");
        }
    };

    const clearCart = async () => {
        if (!user?.user_id) { setCart([]); return; }
        try {
            await api.delete(`/cart/clear/${user.user_id}`);
            setCart([]);
        } catch (err) {
            console.error("Clear cart error:", err);
        }
    };

    // ─── WISHLIST ACTIONS ────────────────────────────────────────

    const toggleWishlist = async (product) => {
        if (!user?.user_id) {
            toast.error("Please login to manage wishlist");
            return;
        }

        const productId = product.product_id ?? product.productId ?? product.id;
        const isAlready = wishlist.some(w =>
            String(w.product_id ?? w.productId ?? w.id) === String(productId)
        );

        try {
            if (isAlready) {
                await api.delete(`/favorites/${productId}`);
                toast.error("Removed from favorites");
            } else {
                await api.post("/favorites", { product_id: Number(productId) });
                toast.success("Added to favorites!");
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
            addToCart, removeFromCart, updateCartQuantity, clearCart,
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
