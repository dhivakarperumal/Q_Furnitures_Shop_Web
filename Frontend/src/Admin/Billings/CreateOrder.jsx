import React, { useState, useEffect } from "react";
import { FiArrowLeft, FiPlus, FiTrash2, FiSave, FiUser, FiPackage, FiSearch, FiCheckCircle, FiMapPin, FiTruck, FiArrowRight, FiX, FiClock } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
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
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [products, setProducts] = useState([]);
    const [productSearchTerm, setProductSearchTerm] = useState("");
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
        status: "Order Placed",
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
            await api.post("/orders", { ...formData, ...orderTotals, order_type: "Shop" });
            toast.success("Order created successfully!");
            setTimeout(() => navigate("/admin/orders/billing"), 1500);
        } catch (error) {
            console.error("Order Creation Error:", error);
            toast.error(error.response?.data?.message || "Failed to create order.");
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
            p.product_code?.toLowerCase().includes(productSearchTerm.toLowerCase());
        const matchesCategory = !selectedCategory || p.category === selectedCategory.name;
        const isAvailable = String(p.status || "").toLowerCase() === "active" && Number(p.total_stock || p.stock || 0) > 0;
        return matchesSearch && matchesCategory && isAvailable;
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="flex items-center gap-4 pb-2">
                <button
                    onClick={() => navigate(-1)}
                    className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:bg-orange-50 hover:text-primary-dark transition-all shadow-sm active:scale-95"
                >
                    <FiArrowLeft size={20} />
                </button>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-dark">Order Management</p>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Create New Shop Order</h1>
                    <p className="text-sm text-gray-400 font-medium mt-1">Create a showroom order for an in-store customer.</p>
                </div>
            </div>



            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {step === 1 ? (
                        /* Step 1: Product Selection */
                        <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200 shadow-sm space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Category Selection */}
                                <div className="space-y-4">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">1. Select Category</label>
                                    <select
                                        value={selectedCategory ? selectedCategory.id : ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val) {
                                                setSelectedCategory(null);
                                            } else {
                                                const cat = categories.find(c => c.id.toString() === val);
                                                setSelectedCategory(cat || null);
                                            }
                                            setSelectedProductForVariant(null);
                                        }}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-orange-100 transition-all font-medium text-slate-800 appearance-none cursor-pointer"
                                    >
                                        <option value="">All Categories</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">2. Select Product</label>
                                    <select
                                        value={selectedProductForVariant ? selectedProductForVariant.id : ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val) {
                                                const prod = filteredProducts.find(p => p.id.toString() === val) || products.find(p => p.id.toString() === val);
                                                handleProductClick(prod);
                                            } else {
                                                setSelectedProductForVariant(null);
                                            }
                                        }}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-orange-100 transition-all font-medium text-slate-800 appearance-none cursor-pointer"
                                    >
                                        <option value="" disabled>-- Choose a Product --</option>
                                        {filteredProducts.map(product => (
                                            <option key={product.id} value={product.id}>
                                                {product.name} - ₹{parseFloat(product.offer_price || product.price || 0).toLocaleString()} {product.product_code ? `(${product.product_code})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Variant Selection UI */}
                            {selectedProductForVariant && (
                                    <div className="p-6 bg-orange-50/60 rounded-2xl border border-orange-100 space-y-6 animate-in zoom-in-95 duration-300">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-black text-primary-dark uppercase tracking-widest text-xs italic">Select Color & Size for: {selectedProductForVariant.name}</h3>
                                        <button onClick={() => setSelectedProductForVariant(null)} className="p-1 hover:bg-white rounded-lg transition-colors"><FiX /></button>
                                    </div>

                                    {/* Colors */}
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Available Colors</p>
                                        <div className="flex flex-wrap gap-3">
                                            {getProductVariants(selectedProductForVariant).length > 0 ? getProductVariants(selectedProductForVariant).map((v, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => { setSelectedVariant(v); setSelectedSize(getDefaultSize(v)); }}
                                                    className={`group relative p-1 rounded-full border-2 transition-all ${selectedVariant === v ? 'border-primary scale-110' : 'border-transparent'}`}
                                                    title={v.colorName || v.color}
                                                >
                                                    <div
                                                        className="w-8 h-8 rounded-full border border-gray-200"
                                                        style={{ backgroundColor: v.color }}
                                                    ></div>
                                                    {v.colorName && (
                                                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-primary-dark">
                                                            {v.colorName}
                                                        </span>
                                                    )}
                                                </button>
                                            )) : (
                                                <div className="flex items-center gap-2 text-sm font-medium text-gray-500"><span className="w-8 h-8 rounded-full bg-[#9A4D16] border border-gray-200"></span> Standard</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Sizes */}
                                    {selectedVariant && (
                                        <div className="space-y-3 animate-in fade-in duration-500">
                                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Select Size</p>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(selectedVariant.sizesStock || {}).filter(([, stock]) => parseInt(stock, 10) > 0).length > 0 ? Object.entries(selectedVariant.sizesStock || {}).map(([size, stock]) => (
                                                    <button
                                                        key={size}
                                                        disabled={parseInt(stock) <= 0}
                                                        onClick={() => setSelectedSize(size)}
                                                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${selectedSize === size ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-100'} ${parseInt(stock) <= 0 ? 'opacity-30 cursor-not-allowed' : 'hover:border-primary shadow-sm'}`}
                                                    >
                                                        {size} <span className="opacity-50 ml-1">({stock})</span>
                                                    </button>
                                                )) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedSize(selectedVariant.size || selectedVariant.selectedSizes?.[0] || "Free Size")}
                                                        className="px-4 py-2 rounded-xl text-xs font-black bg-primary text-white"
                                                    >
                                                        {selectedVariant.size || selectedVariant.selectedSizes?.[0] || "Free Size"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={confirmAddItem}
                                        disabled={!selectedVariant || !selectedSize}
                                        className="w-full py-4 bg-gradient-to-r from-primary to-primary-dark hover:from-secondary-light hover:to-secondary-dark disabled:bg-gray-200 disabled:from-gray-200 disabled:to-gray-200 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-orange-200"
                                    >
                                        Add Selection to Order
                                    </button>
                                </div>
                            )}

                            {/* Added Items List */}
                            <div className="space-y-3">
                                {formData.items.length === 0 ? (
                                    <div className="p-8 border border-dashed border-gray-200 rounded-xl text-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-300">
                                            <FiPackage size={32} />
                                        </div>
                                        <p className="text-gray-400 font-bold">Your cart is empty.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-hidden border border-gray-100 rounded-2xl">
                                        <table className="w-full text-left">
                                            <thead className="bg-gradient-to-r from-[#3B1A0B] to-[#6B3212] text-amber-200">
                                                <tr>
                                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Product / Variant</th>
                                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Price</th>
                                                    <th className="w-24 px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Qty</th>
                                                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider">Total</th>
                                                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {formData.items.map((item, index) => (
                                                    <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden border border-gray-100 shrink-0">
                                                                    {item.image ? (
                                                                        <img src={resolveImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                                                    ) : (
                                                                        <FiPackage className="text-gray-300" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-800 leading-tight">{item.name}</p>
                                                                    <p className="text-[9px] font-black text-primary-dark uppercase tracking-wider mt-0.5">
                                                                        {item.variant_color} • {item.variant_size}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-xs font-bold text-gray-400">₹{item.price.toLocaleString()}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                                className="w-16 px-3 py-1 bg-gray-100 rounded-lg font-bold text-sm"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <p className="text-sm font-black text-slate-800">₹{item.total.toLocaleString()}</p>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <button onClick={() => handleRemoveItem(index)} className="text-red-300 hover:text-red-500">
                                                                <FiTrash2 />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Step 2: Customer Details */
                        <div className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200 shadow-sm space-y-8 animate-in slide-in-from-right-4 duration-500">

                            {/* User Selection */}
                            <div className="space-y-4 pb-6 border-b border-gray-50">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black italic text-primary-dark uppercase tracking-widest ml-1">Order For *</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsGuest(true);
                                                setFormData(prev => ({
                                                    ...prev, user_id: "", customer_name: "", customer_phone: "", customer_email: "", street_address: "", city: "", district: "", state: "", zip_code: "", country: "India"
                                                }));
                                                setUserSearchTerm("");
                                            }}
                                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all ${isGuest ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-orange-50 hover:text-primary-dark'}`}
                                        >Guest Customer</button>
                                        <button
                                            type="button"
                                            onClick={() => setIsGuest(false)}
                                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all ${!isGuest ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-orange-50 hover:text-primary-dark'}`}
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
                                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-orange-100 font-medium transition-all outline-none"
                                        />
                                        {userSearchTerm && filteredUsers.length > 0 && (
                                            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                                                {filteredUsers.map(user => (
                                                    <button
                                                        key={user.id}
                                                        type="button"
                                                        onClick={() => handleSelectUser(user)}
                                                        className="w-full text-left px-5 py-3 hover:bg-gray-50 flex flex-col border-b border-gray-50 last:border-0 transition-colors"
                                                    >
                                                        <span className="font-black text-sm text-slate-800">{user.name || user.username}</span>
                                                        <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <FiUser className="text-primary" /> Customer Name *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Full name"
                                        value={formData.customer_name}
                                        onChange={(e) => setFormData(p => ({ ...p, customer_name: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-orange-100 font-medium transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <FiUser className="text-primary" /> Phone Number *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Contact number"
                                        value={formData.customer_phone}
                                        onChange={(e) => setFormData(p => ({ ...p, customer_phone: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-orange-100 font-medium transition-all outline-none"
                                    />
                                </div>
                            </div>
                            {/* Order Time Selection */}

                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <FiUser className="text-primary" /> Email Address
                                </label>
                                <input
                                    type="email"
                                    placeholder="Optional email"
                                    value={formData.customer_email}
                                    onChange={(e) => setFormData(p => ({ ...p, customer_email: e.target.value }))}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-orange-100 font-medium transition-all outline-none"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <FiMapPin className="text-primary" /> Shipping Details *
                                </label>

                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Street Address / Area / Landmark"
                                        value={formData.street_address}
                                        onChange={(e) => setFormData(p => ({ ...p, street_address: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-orange-100 font-medium transition-all outline-none"
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input
                                            type="text"
                                            placeholder="City"
                                            value={formData.city}
                                            onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-orange-100 font-medium transition-all outline-none"
                                        />
                                        <input
                                            type="text"
                                            placeholder="District"
                                            value={formData.district}
                                            onChange={(e) => setFormData(p => ({ ...p, district: e.target.value }))}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-orange-100 font-medium transition-all outline-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input
                                            type="text"
                                            placeholder="State"
                                            value={formData.state}
                                            onChange={(e) => setFormData(p => ({ ...p, state: e.target.value }))}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-orange-100 font-medium transition-all outline-none"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Zip Code"
                                            value={formData.zip_code}
                                            onChange={(e) => setFormData(p => ({ ...p, zip_code: e.target.value }))}
                                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-primary/30 focus:ring-2 focus:ring-orange-100 font-bold transition-all shadow-inner outline-none"
                                        />
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Country"
                                        value={formData.country}
                                        onChange={(e) => setFormData(p => ({ ...p, country: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-orange-100 font-medium transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Payment & Order Type</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Order Type</label>
                                        <div className="w-full px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg font-bold text-primary-dark">Shop Order</div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Payment Type</label>
                                        <select
                                            value={formData.payment_method}
                                            onChange={(e) => setFormData(p => ({ ...p, payment_method: e.target.value }))}
                                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-orange-100 font-medium transition-all outline-none"
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="UPI">UPI</option>
                                            <option value="Card">Card</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Order Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-orange-100 font-medium transition-all outline-none"
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
                    )}
                </div>

                {/* Sidebar Summary */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-secondary-dark to-secondary-light p-8 rounded-2xl text-white shadow-xl shadow-stone-900/15 sticky top-6">
                        <h3 className="text-xl font-bold mb-6">Order Summary</h3>

                        <div className="space-y-4 border-b border-white/10 pb-6 mb-6">
                            <div className="flex justify-between text-sm opacity-60 font-bold">
                                <span>Total Items</span>
                                <span>{formData.items.length}</span>
                            </div>
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

                        <div className="mb-8">
                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-200 mb-2">Grand Total</p>
                            <h2 className="text-4xl font-black italic">{formatCurrency(orderTotals.total_amount)}</h2>
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
                                    disabled={loading}
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
