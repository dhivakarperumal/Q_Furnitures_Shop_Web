import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FiPlus, FiMinus, FiTrash2, FiSave, FiUser, FiPackage, FiSearch, FiCheckCircle, FiMapPin, FiTruck, FiArrowRight, FiX, FiClock } from "react-icons/fi";
import { useNavigate, useOutletContext } from "react-router-dom";
import api from "../../api";
import { toast, Toaster } from "react-hot-toast";

const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function calculateOrderTotals(items, discountType, discountValue, gstRate) {
    const subtotal = roundCurrency(items.reduce((sum, item) => sum + Number(item.total || 0), 0));
    const discount = roundCurrency(Math.max(0, Number(discountValue) || 0));
    const rate = roundCurrency(Math.max(0, Number(gstRate) || 0));
    const discountAmount = discountType === "percentage"
        ? Math.min(subtotal, roundCurrency(subtotal * discount / 100))
        : Math.min(subtotal, roundCurrency(discount));
    const gstAmount = roundCurrency(subtotal * rate / 100);

    return {
        subtotal,
        discount_amount: discountAmount,
        gst_amount: gstAmount,
        total_amount: roundCurrency(subtotal + gstAmount - discountAmount),
    };
}

const CreateOrder = () => {
    const navigate = useNavigate();
    const { shopProductSearch } = useOutletContext();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [createdOrderId, setCreatedOrderId] = useState("");
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [productSort, setProductSort] = useState("default");
    const [products, setProducts] = useState([]);
    const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [selectedSize, setSelectedSize] = useState("");
    const [users, setUsers] = useState([]);
    const [userSearchTerm, setUserSearchTerm] = useState("");
    const [isGuest, setIsGuest] = useState(true);

    const [formData, setFormData] = useState({
        user_id: "", // For future use if logged in admin has a user_id
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        address: "", // legacy
        street_address: "",
        city: "",
        district: "",
        state: "",
        country: "India",
        zip_code: "",
        order_type: "Shop",
        payment_method: "Cash",
        status: "Delivered",
        items: [],
        discount_type: "percentage",
        discount_value: 0,
        gst_rate: 3,
        total_amount: 0,
        created_at: new Date().toISOString().slice(0, 16) // Default to current time for the datetime-local input
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [prodRes, userRes, catRes] = await Promise.all([
                    api.get("/products", { params: { page: 1, limit: 100 } }),
                    api.get("/auth/users"),
                    api.get("/categories")
                ]);
                const productList = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.products;
                if (!Array.isArray(productList) || !Array.isArray(userRes.data) || !Array.isArray(catRes.data)) {
                    throw new Error("The product, customer, or category response was invalid.");
                }
                setProducts(productList);
                setUsers(userRes.data);
                setCategories(catRes.data);
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Failed to load initial data");
            }
        };
        fetchData();
    }, []);

    const getProductVariants = (product) => {
        if (!product) return [];
        if (Array.isArray(product.variants)) return product.variants;
        if (typeof product.variants === "string") {
            try {
                const parsed = JSON.parse(product.variants);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    };

    const resolveImageUrl = (image) => {
        if (!image) return "";
        let imageUrl = image;
        if (Array.isArray(image)) imageUrl = image[0];
        if (typeof imageUrl !== "string") return "";
        if (imageUrl.startsWith("[")) {
            try {
                const parsed = JSON.parse(imageUrl);
                imageUrl = Array.isArray(parsed) ? parsed[0] : "";
            } catch {
                return "";
            }
        }
        if (!imageUrl) return "";
        if (/^(https?:|data:|blob:)/i.test(imageUrl)) return imageUrl;
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
        return `${backendUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
    };

    const getDefaultSize = (variant) => {
        const stockSizes = Object.entries(variant?.sizesStock || {})
            .find(([, stock]) => parseInt(stock, 10) > 0);
        return stockSizes?.[0] || variant?.size || variant?.selectedSizes?.[0] || "Free Size";
    };

    const handleProductClick = (product) => {
        const firstVariant = getProductVariants(product)[0] || {
            color: "#9A4D16",
            colorName: "Standard",
            images: [],
            sizesStock: {}
        };
        setSelectedProductForVariant(product);
        setSelectedVariant(firstVariant);
        setSelectedSize(getDefaultSize(firstVariant));
    };

    const confirmAddItem = () => {
        if (!selectedVariant || !selectedSize) {
            toast.error("Please select color and size");
            return;
        }

        const product = selectedProductForVariant;
        const colorName = selectedVariant.colorName || selectedVariant.color || "Standard";

        // Check if same product with same variant already in cart
        const existingItemIndex = formData.items.findIndex(item =>
            item.product_id === product.id &&
            item.variant_color === colorName &&
            item.variant_size === selectedSize
        );

        const price = Number(
            selectedVariant.selling_price ??
            selectedVariant.offer_price ??
            product.selling_price ??
            product.offer_price ??
            product.price ??
            0
        );
        let updatedItems = [...formData.items];

        if (existingItemIndex > -1) {
            updatedItems[existingItemIndex].quantity += 1;
            updatedItems[existingItemIndex].total = updatedItems[existingItemIndex].price * updatedItems[existingItemIndex].quantity;
            toast.success("Increased quantity for item in cart");
        } else {
            const newItem = {
                product_id: product.id,
                name: product.name,
                price: price,
                quantity: 1,
                total: price,
                variant_color: colorName,
                variant_size: selectedSize,
                image: resolveImageUrl(selectedVariant.images?.[0] || product.variants?.[0]?.images?.[0])
            };
            updatedItems.push(newItem);
        }

        updateTotal(updatedItems);

        setSelectedProductForVariant(null);
        setProductSearchTerm("");
    };

    const handleRemoveItem = (index) => {
        const updatedItems = formData.items.filter((_, i) => i !== index);
        updateTotal(updatedItems);
    };

    const handleQuantityChange = (index, qty) => {
        const updatedItems = [...formData.items];
        updatedItems[index].quantity = parseInt(qty) || 1;
        updatedItems[index].total = updatedItems[index].price * updatedItems[index].quantity;
        updateTotal(updatedItems);
    };

    const handleProductQuantityChange = (productId, amount) => {
        const updatedItems = [...formData.items];
        const productItemIndexes = updatedItems
            .map((item, index) => item.product_id === productId ? index : -1)
            .filter(index => index !== -1);
        const itemIndex = productItemIndexes[productItemIndexes.length - 1];

        if (itemIndex === undefined) return;

        const item = updatedItems[itemIndex];
        if (amount < 0 && item.quantity <= 1) {
            updatedItems.splice(itemIndex, 1);
        } else {
            item.quantity += amount;
            item.total = item.price * item.quantity;
        }

        updateTotal(updatedItems);
    };

    const updatePricing = (changes) => {
        setFormData((previous) => {
            const next = { ...previous, ...changes };
            return {
                ...next,
                ...calculateOrderTotals(next.items, next.discount_type, next.discount_value, next.gst_rate),
            };
        });
    };

    const updateTotal = (items) => updatePricing({ items });
    const orderTotals = calculateOrderTotals(
        formData.items,
        formData.discount_type,
        formData.discount_value,
        formData.gst_rate,
    );
    const discountValue = Number(formData.discount_value);
    const gstRate = Number(formData.gst_rate);
    const pricingError = !Number.isFinite(discountValue) || discountValue < 0
        ? "Enter a valid discount."
        : formData.discount_type === "percentage" && discountValue > 100
            ? "Percentage discount cannot exceed 100%."
            : formData.discount_type === "fixed" && discountValue > orderTotals.subtotal
                ? "Fixed discount cannot exceed the subtotal."
                : !Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100
                    ? "GST rate must be between 0% and 100%."
                    : "";

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { customer_name, customer_phone, street_address, city, state, zip_code } = formData;

        if (pricingError) {
            toast.error(pricingError);
            return;
        }
        if (!customer_name || !customer_phone || !street_address || !city || !state || !zip_code) {
            toast.error("Please fill all mandatory fields (Name, Phone, Street, City, State, and Zip Code)");
            return;
        }

        setLoading(true);
        try {
            const response = await api.post("/orders", { ...formData, ...orderTotals, order_type: "Shop" });
            const orderId = response.data?.order_id;
            if (!orderId) {
                console.error("Order creation response did not include an order ID:", response.data);
                toast.error("Order was saved, but its ID was not returned. Check Billing.");
                setTimeout(() => navigate("/admin/orders/billing"), 4000);
                return;
            }
            setCreatedOrderId(orderId);
            toast.success(`Order ${orderId} created successfully!`);
            setTimeout(() => navigate("/admin/orders/billing"), 4000);
        } catch (error) {
            console.error("Order Creation Error:", error);
            toast.error(error.response?.data?.message || "Failed to create order.");
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p => {
        const searchTerm = shopProductSearch.trim().toLowerCase();
        const matchesSearch = String(p.name || "").toLowerCase().includes(searchTerm) ||
            p.product_code?.toLowerCase().includes(searchTerm);
        const matchesCategory = !selectedCategory || p.category === selectedCategory.name;
        const isAvailable = String(p.status || "").toLowerCase() === "active" && Number(p.total_stock || p.stock || 0) > 0;
        return matchesSearch && matchesCategory && isAvailable;
    }).sort((a, b) => {
        if (productSort === "name") {
            return String(a.name || "").localeCompare(String(b.name || ""));
        }
        if (productSort === "price-asc" || productSort === "price-desc") {
            const priceA = Number(a.selling_price ?? a.offer_price ?? a.price ?? 0);
            const priceB = Number(b.selling_price ?? b.offer_price ?? b.price ?? 0);
            return productSort === "price-asc" ? priceA - priceB : priceB - priceA;
        }
        return 0;
    });

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.username?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.phone?.includes(userSearchTerm) ||
        u.email?.toLowerCase().includes(userSearchTerm.toLowerCase())
    );

    const handleSelectUser = (user) => {
        setFormData(prev => ({
            ...prev,
            user_id: user.user_id || user.id,
            customer_name: user.name || user.username || "",
            customer_email: user.email || "",
            customer_phone: user.phone || "",
            street_address: user.street_address || "",
            city: user.city || "",
            district: user.district || "",
            state: user.state || "",
            country: user.country || "India",
            zip_code: user.zip_code || ""
        }));
        setUserSearchTerm(user.name || user.username || "");
        setIsGuest(false);
    };

    return (
        <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Toaster position="top-right" />

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-[minmax(8rem,0.55fr)_minmax(0,2.45fr)_minmax(17rem,1.2fr)] lg:overflow-hidden">
                {step === 1 && (
                    <aside className="min-h-0 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:col-start-1 lg:row-start-1">
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Categories</h2>
                        <nav className="mt-3 flex flex-col gap-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedCategory(null);
                                    setSelectedProductForVariant(null);
                                }}
                                aria-pressed={!selectedCategory}
                                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold transition ${!selectedCategory ? "bg-orange-100 text-primary-dark" : "text-slate-600 hover:bg-orange-50 hover:text-primary-dark"}`}
                            >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-orange-50 text-primary-dark">
                                    <FiPackage size={16} />
                                </span>
                                All Categories
                            </button>
                            {categories.map(category => (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedCategory(category);
                                        setSelectedProductForVariant(null);
                                    }}
                                    aria-pressed={selectedCategory?.id === category.id}
                                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold transition ${selectedCategory?.id === category.id ? "bg-orange-100 text-primary-dark" : "text-slate-600 hover:bg-orange-50 hover:text-primary-dark"}`}
                                >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-orange-50 text-primary-dark">
                                        {category.images?.[0] ? (
                                            <img src={resolveImageUrl(category.images[0])} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <FiPackage size={16} />
                                        )}
                                    </span>
                                    <span className="line-clamp-2 min-w-0">{category.name}</span>
                                </button>
                            ))}
                        </nav>
                    </aside>
                )}

                <div className={`min-h-0 space-y-4 overflow-y-auto lg:row-start-1 lg:overflow-y-auto ${step === 1 ? "lg:col-start-2" : "lg:col-start-1 lg:col-span-2"}`}>
                    {step === 1 ? (
                        /* Step 1: Product Selection */
                        <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:p-5">
                            <div className="space-y-5">
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className="text-sm font-black text-slate-700">Products</h2>
                                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                        Sort
                                        <select
                                            value={productSort}
                                            onChange={(event) => setProductSort(event.target.value)}
                                            className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-primary"
                                            aria-label="Sort products"
                                        >
                                            <option value="default">Default</option>
                                            <option value="name">Name A-Z</option>
                                            <option value="price-asc">Price: Low to High</option>
                                            <option value="price-desc">Price: High to Low</option>
                                        </select>
                                    </label>
                                </div>
                                {filteredProducts.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                                        {filteredProducts.map(product => {
                                            const productImage = getProductVariants(product)[0]?.images?.[0] || product.image;
                                            const price = product.selling_price || product.offer_price || product.price || 0;
                                            const productQuantity = formData.items
                                                .filter(item => item.product_id === product.id)
                                                .reduce((total, item) => total + item.quantity, 0);
                                            return (
                                                <div
                                                    key={product.id}
                                                    className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => handleProductClick(product)}
                                                        aria-label={`Choose options for ${product.name}`}
                                                        className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                                                    >
                                                        <div className="aspect-[4/3] bg-gray-50">
                                                            {productImage ? (
                                                                <img
                                                                    src={resolveImageUrl(productImage)}
                                                                    alt={product.name}
                                                                    className="h-full w-full object-cover"
                                                                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                                                                />
                                                            ) : (
                                                                <div className="flex h-full items-center justify-center text-gray-300">
                                                                    <FiPackage size={28} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="px-2.5 pt-2">
                                                            <p className="line-clamp-2 min-h-8 text-xs font-bold leading-4 text-slate-800">{product.name}</p>
                                                            {product.product_code && (
                                                                <p className="truncate text-[9px] font-semibold text-gray-400">{product.product_code}</p>
                                                            )}
                                                        </div>
                                                    </button>
                                                    <div className="flex min-h-9 items-center justify-between gap-1 px-2.5 pb-2">
                                                        <span className="truncate text-xs font-black text-primary-dark">{formatCurrency(price)}</span>
                                                        {productQuantity === 0 ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleProductClick(product)}
                                                                aria-label={`Add ${product.name}`}
                                                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-dark"
                                                            >
                                                                <FiPlus size={15} />
                                                            </button>
                                                        ) : (
                                                            <div className="flex shrink-0 items-center gap-1 rounded-full bg-orange-50 p-0.5 text-primary-dark">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleProductQuantityChange(product.id, -1)}
                                                                    aria-label={`Decrease ${product.name} quantity`}
                                                                    className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-orange-100"
                                                                >
                                                                    <FiMinus size={12} />
                                                                </button>
                                                                <span className="min-w-4 text-center text-xs font-black">{productQuantity}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleProductQuantityChange(product.id, 1)}
                                                                    aria-label={`Increase ${product.name} quantity`}
                                                                    className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-orange-100"
                                                                >
                                                                    <FiPlus size={12} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm font-medium text-gray-400">
                                        No available products match your filters.
                                    </p>
                                )}
                            </div>

                            {/* Product options popup */}
                            {selectedProductForVariant && createPortal(
                                <div
                                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
                                    onClick={() => setSelectedProductForVariant(null)}
                                >
                                    <div
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="product-options-title"
                                        className="w-full max-w-lg space-y-6 rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-primary-dark">Choose product options</p>
                                                <h3 id="product-options-title" className="mt-1 text-lg font-black text-slate-800">
                                                    {selectedProductForVariant.name}
                                                </h3>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedProductForVariant(null)}
                                                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-slate-800"
                                                aria-label="Close product options"
                                            >
                                                <FiX />
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Select Color</p>
                                            <div className="flex flex-wrap gap-3">
                                                {getProductVariants(selectedProductForVariant).length > 0 ? getProductVariants(selectedProductForVariant).map((variant, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedVariant(variant);
                                                            setSelectedSize(getDefaultSize(variant));
                                                        }}
                                                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${selectedVariant === variant ? "border-primary bg-orange-50 text-primary-dark" : "border-gray-200 text-slate-600 hover:border-primary"}`}
                                                        aria-pressed={selectedVariant === variant}
                                                        aria-label={`Select color ${variant.colorName || variant.color || `option ${index + 1}`}`}
                                                    >
                                                        <span
                                                            className="h-6 w-6 rounded-full border border-gray-200"
                                                            style={{ backgroundColor: variant.color || "#9A4D16" }}
                                                        />
                                                        {variant.colorName || variant.color || `Color ${index + 1}`}
                                                    </button>
                                                )) : (
                                                    <span className="inline-flex items-center gap-2 rounded-xl border border-primary bg-orange-50 px-3 py-2 text-sm font-bold text-primary-dark">
                                                        <span className="h-6 w-6 rounded-full border border-gray-200 bg-[#9A4D16]" />
                                                        Standard
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {selectedVariant && (
                                            <div className="space-y-3">
                                                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Select Size</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(selectedVariant.sizesStock || {}).length > 0 ? Object.entries(selectedVariant.sizesStock || {}).map(([size, stock]) => (
                                                        <button
                                                            key={size}
                                                            type="button"
                                                            disabled={parseInt(stock, 10) <= 0}
                                                            onClick={() => setSelectedSize(size)}
                                                            className={`rounded-xl border px-4 py-2 text-xs font-black transition ${selectedSize === size ? "border-primary bg-primary text-white" : "border-gray-200 bg-white text-gray-600"} ${parseInt(stock, 10) <= 0 ? "cursor-not-allowed opacity-30" : "hover:border-primary"}`}
                                                            aria-pressed={selectedSize === size}
                                                        >
                                                            {size} <span className="ml-1 opacity-70">({stock})</span>
                                                        </button>
                                                    )) : (
                                                        <span className="rounded-xl border border-primary bg-primary px-4 py-2 text-xs font-black text-white">
                                                            {selectedSize || "Free Size"}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={confirmAddItem}
                                            disabled={!selectedVariant || !selectedSize}
                                            className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark py-4 text-sm font-black uppercase tracking-widest text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark active:scale-95 disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none"
                                        >
                                            Add Selection to Order
                                        </button>
                                    </div>
                                </div>,
                                document.body
                            )}

                        </div>
                    ) : (
                        /* Step 2: Customer Details */
                        <div className="space-y-5 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-6 animate-in slide-in-from-right-4 duration-500">

                            {createdOrderId && (
                                <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                    <span className="flex items-center gap-2 font-semibold">
                                        <FiCheckCircle className="shrink-0" />
                                        Order created successfully
                                    </span>
                                    <span className="rounded-lg bg-white px-3 py-1 font-mono font-black tracking-wide">{createdOrderId}</span>
                                </div>
                            )}

                            {/* User Selection */}
                            <div className="space-y-4 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50/80 to-white p-4 sm:p-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">Address Details</label>
                                    <div className="grid grid-cols-2 gap-2 sm:flex">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsGuest(true);
                                                setFormData(prev => ({
                                                    ...prev, user_id: "", customer_name: "", customer_phone: "", customer_email: "", street_address: "", city: "", district: "", state: "", zip_code: "", country: "India"
                                                }));
                                                setUserSearchTerm("");
                                            }}
                                            className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wide transition-all ${isGuest ? "border-primary bg-primary text-white shadow-sm shadow-orange-200" : "border-slate-200 bg-white text-slate-500 hover:border-orange-200 hover:text-primary-dark"}`}
                                        >Guest Customer</button>
                                        <button
                                            type="button"
                                            onClick={() => setIsGuest(false)}
                                            className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wide transition-all ${!isGuest ? "border-primary bg-primary text-white shadow-sm shadow-orange-200" : "border-slate-200 bg-white text-slate-500 hover:border-orange-200 hover:text-primary-dark"}`}
                                        >Registered Customer</button>
                                    </div>
                                </div>

                                {!isGuest && (
                                    <div className="relative mt-4">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                            <FiSearch className="text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search registered users by name, email or phone..."
                                            value={userSearchTerm}
                                            onChange={(e) => setUserSearchTerm(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100/70"
                                        />
                                        {userSearchTerm && filteredUsers.length > 0 && (
                                            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                                                {filteredUsers.map(user => (
                                                    <button
                                                        key={user.id}
                                                        type="button"
                                                        onClick={() => handleSelectUser(user)}
                                                        className="flex w-full flex-col border-b border-slate-100 px-5 py-3 text-left transition-colors last:border-0 hover:bg-orange-50/60"
                                                    >
                                                        <span className="text-sm font-bold text-slate-800">{user.name || user.username}</span>
                                                        <div className="mt-1 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                            <span>{user.phone}</span>
                                                            {user.email && <span>• {user.email}</span>}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Customer Details</h3>
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-500">
                                        <FiUser className="text-primary" /> Customer Name *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Full name"
                                        value={formData.customer_name}
                                        onChange={(e) => setFormData(p => ({ ...p, customer_name: e.target.value }))}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100/70"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-500">
                                        <FiUser className="text-primary" /> Phone Number *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Contact number"
                                        value={formData.customer_phone}
                                        onChange={(e) => setFormData(p => ({ ...p, customer_phone: e.target.value }))}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100/70"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-500">
                                        <FiUser className="text-primary" /> Email Address
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="Optional email"
                                        value={formData.customer_email}
                                        onChange={(e) => setFormData(p => ({ ...p, customer_email: e.target.value }))}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100/70"
                                    />
                                </div>
                            </div>
                            </div>
                            {/* Order Time Selection */}

                            <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-700">
                                    <FiMapPin className="text-primary" />
                                    Shipping Details
                                    <span className="text-primary">*</span>
                                </h3>

                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                    <div className="lg:col-span-3">
                                        <input
                                            type="text"
                                            placeholder="Street Address / Area / Landmark"
                                            value={formData.street_address}
                                            onChange={(e) => setFormData(p => ({ ...p, street_address: e.target.value }))}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100/70"
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="City"
                                        value={formData.city}
                                        onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100/70"
                                    />
                                    <input
                                        type="text"
                                        placeholder="District"
                                        value={formData.district}
                                        onChange={(e) => setFormData(p => ({ ...p, district: e.target.value }))}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100/70"
                                    />
                                    <input
                                        type="text"
                                        placeholder="State"
                                        value={formData.state}
                                        onChange={(e) => setFormData(p => ({ ...p, state: e.target.value }))}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100/70"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Zip Code"
                                        value={formData.zip_code}
                                        onChange={(e) => setFormData(p => ({ ...p, zip_code: e.target.value }))}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100/70"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Country"
                                        value={formData.country}
                                        onChange={(e) => setFormData(p => ({ ...p, country: e.target.value }))}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100/70"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50/70 to-white p-4 sm:p-5">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-700">Payment & Order Type</label>
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Order Type</label>
                                        <div className="w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-primary-dark">Shop Order</div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Payment Type</label>
                                        <select
                                            value={formData.payment_method}
                                            onChange={(e) => setFormData(p => ({ ...p, payment_method: e.target.value }))}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100/70"
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="UPI">UPI</option>
                                            <option value="Card">Card</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Order Status</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100/70"
                                        >
                                            <option value="Order Placed">Order Placed</option>
                                            <option value="Packing">Packing</option>
                                            <option value="Shipping">Shipping</option>
                                            <option value="Out for Delivery">Out for Delivery</option>
                                            <option value="Delivered">Delivered</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Summary */}
                <div className="min-h-0 overflow-y-auto lg:col-start-3 lg:row-start-1 lg:overflow-y-auto">
                    <div className="sticky top-0 flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-secondary-dark to-secondary-light p-5 text-white shadow-xl shadow-stone-900/15 sm:p-6">
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            <div className="mb-6 flex items-center justify-between gap-3">
                                <h3 className="text-xl font-bold">Order Summary</h3>
                                <div className="flex gap-2 text-sm font-bold opacity-60">
                                    <span>Total Items</span>
                                    <span>{formData.items.length}</span>
                                </div>
                            </div>

                            <div className="space-y-4 border-b border-white/10 pb-6 mb-6">

                                {formData.items.length > 0 ? (
                                    <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                                        {formData.items.map((item, index) => (
                                            <div
                                                key={`${item.product_id}-${item.variant_color}-${item.variant_size}-${index}`}
                                                className="flex items-center gap-3 border-b border-white/10 pb-3 last:border-0"
                                            >
                                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/10">
                                                    {item.image ? (
                                                        <img
                                                            src={resolveImageUrl(item.image)}
                                                            alt=""
                                                            className="h-full w-full object-cover"
                                                            onError={(event) => { event.currentTarget.style.display = "none"; }}
                                                        />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center text-white/50">
                                                            <FiPackage size={18} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-bold text-white">{item.name}</p>
                                                    <p className="mt-1 truncate text-xs text-white/60">
                                                        {item.variant_color} · {item.variant_size}
                                                    </p>
                                                    <div className="mt-2 flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleQuantityChange(index, item.quantity - 1)}
                                                                disabled={item.quantity <= 1}
                                                                aria-label={`Decrease ${item.name} quantity`}
                                                                className="rounded-md border border-white/15 p-1 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                                            >
                                                                <FiMinus size={12} />
                                                            </button>
                                                            <span className="min-w-4 text-center text-xs font-bold">{item.quantity}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleQuantityChange(index, item.quantity + 1)}
                                                                aria-label={`Increase ${item.name} quantity`}
                                                                className="rounded-md border border-white/15 p-1 text-white transition hover:bg-white/10"
                                                            >
                                                                <FiPlus size={12} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveItem(index)}
                                                                aria-label={`Remove ${item.name} from order`}
                                                                className="rounded-md p-1 text-red-200 transition hover:bg-red-400/20 hover:text-white"
                                                            >
                                                                <FiTrash2 size={14} />
                                                            </button>
                                                        </div>
                                                        <span className="shrink-0 text-xs font-bold">{formatCurrency(item.total)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs font-semibold text-white/50">No products added yet.</p>
                                )}
                                <div className="flex justify-between text-sm opacity-60 font-bold">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(orderTotals.subtotal)}</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3 text-sm font-bold">
                                        <label htmlFor="order-gst-rate" className="text-white/75">GST rate</label>
                                        <div className="flex items-center gap-1">
                                            <input
                                                id="order-gst-rate"
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                value={formData.gst_rate}
                                                onChange={(event) => updatePricing({ gst_rate: event.target.value })}
                                                className="w-20 rounded-lg border border-white/15 bg-white/10 px-2 py-1.5 text-right text-sm font-bold text-white outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100/20"
                                                aria-label="GST rate percentage"
                                            />
                                            <span className="text-white/75">%</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-xs font-semibold text-white/60">
                                        <span>GST on subtotal (before discount)</span>
                                        <span>{formatCurrency(orderTotals.gst_amount)}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3 text-sm font-bold">
                                        <label htmlFor="order-discount-value" className="text-white/75">Discount</label>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={formData.discount_type}
                                                onChange={(event) => updatePricing({ discount_type: event.target.value })}
                                                className="rounded-lg border border-white/15 bg-white/10 px-2 py-1.5 text-xs font-bold text-white outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100/20"
                                                aria-label="Discount type"
                                            >
                                                <option className="text-slate-800" value="percentage">Percent</option>
                                                <option className="text-slate-800" value="fixed">Fixed ₹</option>
                                            </select>
                                            <div className="flex items-center rounded-lg border border-white/15 bg-white/10">
                                                <input
                                                    id="order-discount-value"
                                                    type="number"
                                                    min="0"
                                                    max={formData.discount_type === "percentage" ? 100 : orderTotals.subtotal}
                                                    step="0.01"
                                                    value={formData.discount_value}
                                                    onChange={(event) => updatePricing({ discount_value: event.target.value })}
                                                    className="w-16 bg-transparent px-2 py-1.5 text-right text-sm font-bold text-white outline-none"
                                                    aria-label={formData.discount_type === "percentage" ? "Discount percentage" : "Discount amount"}
                                                />
                                                <span className="pr-2 text-xs font-bold text-white/70">
                                                    {formData.discount_type === "percentage" ? "%" : "₹"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-xs font-semibold text-white/60">
                                        <span>Discount applied</span>
                                        <span>-{formatCurrency(orderTotals.discount_amount)}</span>
                                    </div>
                                </div>
                                {pricingError && (
                                    <p role="alert" className="text-xs font-semibold text-amber-200">{pricingError}</p>
                                )}
                            </div>

                            <div className="mb-6 flex items-center justify-between gap-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-200">Grand Total</p>
                                <h2 className="text-xl font-black italic sm:text-2xl">{formatCurrency(orderTotals.total_amount)}</h2>
                            </div>
                        </div>

                        {step === 1 ? (
                            <button
                                onClick={() => {
                                    if (formData.items.length === 0) return toast.error("Please add products first");
                                    if (pricingError) return toast.error(pricingError);
                                    setStep(2);
                                }}
                                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-primary to-primary-dark hover:from-secondary-light hover:to-secondary-dark text-white py-4 rounded-xl text-md font-black transition-all active:scale-95 shadow-md shadow-orange-900/20 group"
                            >
                                <span>Next Details</span>
                                <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || Boolean(createdOrderId)}
                                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-primary to-primary-dark hover:from-secondary-light hover:to-secondary-dark text-white py-4 rounded-xl text-lg font-black transition-all active:scale-95 shadow-md shadow-orange-900/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loading ? <div className="w-6 h-6 border-2 border-t-white rounded-full animate-spin"></div> : (
                                        <>
                                            <FiCheckCircle />
                                            <span>Create Shop Order</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setStep(1)}
                                    className="w-full text-center py-2 text-xs font-black text-white/30 hover:text-white transition-colors"
                                >
                                    Go Back to Edit Items
                                </button>
                            </div>
                        )}
                    </div>


                </div>
            </div>
        </div>
    );
};

export default CreateOrder;
