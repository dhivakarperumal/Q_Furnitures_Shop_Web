import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAdmin } from "../../PrivateRouter/AdminContext";
import api from "../../api";
import { toast, Toaster } from "react-hot-toast";
import {
    FiBox,
    FiAlertCircle,
    FiCheckCircle,
    FiXCircle,
    FiSearch,
    FiSave,
    FiPlus,
    FiX,
    FiEdit2,
    FiGrid,
    FiList,
    FiChevronDown,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const StockDetails = () => {
    const navigate = useNavigate();
    const { stockCache, setStockCached } = useAdmin();

    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState("table");
    const itemsPerPage = 10;

    const currentCacheKey = JSON.stringify({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm
    });
    
    const pageData = stockCache[currentCacheKey];
    const [products, setProducts] = useState(pageData?.products || []);
    const [loading, setLoading] = useState(!pageData);
    const [isSyncing, setIsSyncing] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pagination, setPagination] = useState(pageData?.pagination || { total: 0, totalPages: 1 });
    const [stats, setStats] = useState(pageData?.stats || { total: 0, active: 0, lowStock: 0, outOfStock: 0 });
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [updatedVariants, setUpdatedVariants] = useState([]);
    const [variantAdditions, setVariantAdditions] = useState({});
    const [manualTotalStock, setManualTotalStock] = useState("0");
    const [isUpdating, setIsUpdating] = useState(false);
    const [fetchingDetail, setFetchingDetail] = useState(false);

    const fetchProducts = async () => {
        const params = {
            page: currentPage,
            limit: itemsPerPage,
            search: searchTerm
        };
        const cacheKey = JSON.stringify(params);
        if (!stockCache[cacheKey]) setLoading(true);

        try {
            const response = await api.get("/products", { params });
            const data = response.data;
            let finalData = {};
 
            if (Array.isArray(data)) {
                finalData = { products: data, pagination: { total: data.length, totalPages: 1 }, stats: { total: 0, active: 0, lowStock: 0, outOfStock: 0 }};
            } else {
                finalData = {
                    products: Array.isArray(data.products) ? data.products : [],
                    pagination: data.pagination || { total: 0, totalPages: 1 },
                    stats: data.stats || { total: 0, active: 0, lowStock: 0, outOfStock: 0 }
                };
            }
            setProducts(finalData.products);
            setPagination(finalData.pagination);
            setStats(finalData.stats);
            setStockCached(prev => ({ ...prev, [cacheKey]: finalData }));
        } catch (error) {
            console.error("Error fetching products:", error);
            setProducts([]);
        } finally {
            setLoading(false);
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [currentPage, searchTerm]);

    const handleSync = () => {
        setIsSyncing(true);
        fetchProducts();
    };

    const getStockLevel = (product) => {
        const stock = product.total_stock ?? product.stock ?? 0;
        return stock;
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case "Active": return "bg-emerald-50 text-emerald-600 border-emerald-100";
            case "Low Stock": return "bg-amber-50 text-amber-600 border-amber-100";
            case "Out of Stock": return "bg-rose-50 text-rose-600 border-rose-100";
            default: return "bg-gray-50 text-gray-600 border-gray-100";
        }
    };

    const deriveStatus = (stock) => {
        if (stock <= 0) return "Out of Stock";
        if (stock < 10) return "Low Stock";
        return "Active";
    };

    const totalPages = pagination.totalPages;
    const currentItems = products;

    // Reset page 1 on search
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Modal Handlers
    const openUpdateModal = async (product) => {
        setIsModalOpen(true);
        setSelectedProduct(product);
        setUpdatedVariants(Array.isArray(product.variants) ? product.variants : []);
        setVariantAdditions({});
        setManualTotalStock("0");
        setFetchingDetail(true);

        try {
            const res = await api.get(`/products/` + product.id);
            const fullP = res.data;
            let vars = [];
            if (fullP.variants) {
                vars = typeof fullP.variants === 'string' ? JSON.parse(fullP.variants) : fullP.variants;
            }
            setSelectedProduct(fullP);
            setUpdatedVariants(Array.isArray(vars) ? vars : []);
            setVariantAdditions({});
            setManualTotalStock("0");
        } catch (e) {
            console.error("Failed to fetch full product details", e);
            toast.error("Failed to fetch detailed stock data");
        } finally {
            setFetchingDetail(false);
        }
    };

    const closeUpdateModal = () => {
        setIsModalOpen(false);
        setSelectedProduct(null);
        setUpdatedVariants([]);
        setVariantAdditions({});
    };

    const handleVariantStockChange = (vIndex, size, value) => {
        const key = `${vIndex}-${size}`;
        const numericValue = Number.parseInt(value, 10);
        setVariantAdditions(prev => ({
            ...prev,
            [key]: Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0
        }));
    };

    const getCurrentStockValue = (product) => {
        const current = Number.parseInt(product?.total_stock ?? product?.stock ?? 0, 10) || 0;
        return Math.max(0, current);
    };

    const handleSaveStock = async () => {
        if (!selectedProduct) return;
        setIsUpdating(true);
        try {
            let newTotalStock = 0;
            const vars = Array.isArray(updatedVariants) ? updatedVariants : [];
            const hasVariantsWithSizes = vars.some(v => v.sizesStock && Object.keys(v.sizesStock).length > 0);

            if (hasVariantsWithSizes) {
                vars.forEach((v, vIndex) => {
                    Object.keys(v.sizesStock || {}).forEach(size => {
                        const key = `${vIndex}-${size}`;
                        const currentQty = parseInt(v.sizesStock?.[size] || 0, 10) || 0;
                        const addedQty = parseInt(variantAdditions[key] || 0, 10) || 0;
                        const finalQty = currentQty + addedQty;
                        v.sizesStock[size] = finalQty;
                        newTotalStock += finalQty;
                    });
                });
            } else {
                const currentStock = getCurrentStockValue(selectedProduct);
                const addedStock = parseInt(manualTotalStock) || 0;
                newTotalStock = currentStock + addedStock;
            }

            const status = newTotalStock <= 0 ? "Out of Stock" : newTotalStock < 10 ? "Low Stock" : "Active";

            const payload = {
                ...selectedProduct,
                total_stock: newTotalStock.toString(),
                stock: newTotalStock.toString(),
                status: status,
                variants: vars
            };

            await api.put(`/products/` + selectedProduct.id, payload);

            setProducts(products.map(p =>
                p.id === selectedProduct.id
                    ? { ...p, total_stock: newTotalStock, variants: vars, status: status }
                    : p
            ));

            toast.success("Stock updated successfully");
            closeUpdateModal();
        } catch (error) {
            console.error("Failed to update stock:", error);
            toast.error("Failed to update stock");
        } finally {
            setIsUpdating(false);
        }
    };

    const getProductImage = (product) => {
        let imgUrl = null;
        try {
            const processUrl = (url) => {
                if (!url || typeof url !== 'string') return null;
                if (url.startsWith('http') || url.startsWith('data:')) return url;
                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
                const cleanPath = url.startsWith('/') ? url : '/' + url;
                return backendUrl + cleanPath;
            };

            if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
                const firstVar = product.variants[0];
                const vImgs = typeof firstVar.images === 'string' ? JSON.parse(firstVar.images) : firstVar.images;
                if (Array.isArray(vImgs) && vImgs.length > 0) imgUrl = vImgs[0];
            }

            if (!imgUrl && product.images) {
                const imgs = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                if (Array.isArray(imgs) && imgs.length > 0) imgUrl = imgs[0];
            }

            const finalUrl = processUrl(imgUrl);
            if (finalUrl) return finalUrl;
        } catch (e) {
            console.error("Error getting product image:", e);
        }

        return `https://ui-avatars.com/api/?name=` + encodeURIComponent(product.name || 'P') + `&background=9a3412&color=fff7ed`;
    };

    return (
        <div className="min-h-screen space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 font-sans">
            <Toaster position="top-right" />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: "Total Products", value: stats.total || 0, sub: "All furniture products", Icon: FiBox, color: "orange" },
                    { label: "Active", value: stats.active || 0, sub: "Active products", Icon: FiCheckCircle, color: "emerald" },
                    { label: "Inactive", value: stats.outOfStock || 0, sub: "Inactive products", Icon: FiAlertCircle, color: "amber" },
                    { label: "Low Stock", value: stats.lowStock || 0, sub: "Products low in stock", Icon: FiXCircle, color: "rose" },
                ].map((stat, i) => (
                    <div key={i} className={`group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)] ${
                        stat.color === "orange" ? "border-orange-100/80 hover:border-orange-200" : stat.color === "emerald" ? "border-emerald-100/80 hover:border-emerald-200" : stat.color === "amber" ? "border-amber-100/80 hover:border-amber-200" : "border-rose-100/80 hover:border-rose-200"
                    }`}>
                        <div className={`absolute inset-y-4 left-0 w-1 rounded-r-full ${
                            stat.color === "orange" ? "bg-gradient-to-b from-primary-light to-primary-dark" : stat.color === "emerald" ? "bg-gradient-to-b from-emerald-400 to-emerald-600" : stat.color === "amber" ? "bg-gradient-to-b from-amber-400 to-amber-600" : "bg-gradient-to-b from-rose-400 to-pink-500"
                        }`} />
                        <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-lg ${
                            stat.color === "orange" ? "from-primary to-primary-dark shadow-orange-200/70" : stat.color === "emerald" ? "from-emerald-400 to-emerald-600 shadow-emerald-200/70" : stat.color === "amber" ? "from-amber-400 to-amber-600 shadow-amber-200/70" : "from-rose-400 to-pink-500 shadow-rose-200/70"
                        }`}>
                            <stat.Icon size={22} />
                        </div>
                        <div className="relative z-10">
                            <p className="mb-1 text-xs font-bold tracking-wide text-secondary-light">{stat.label}</p>
                            <p className="mb-1 text-3xl font-black leading-none text-secondary-dark">{stat.value}</p>
                            <p className="text-[10px] font-medium text-stone-500">{stat.sub}</p>
                        </div>
                        <stat.Icon className={`pointer-events-none absolute -right-1 bottom-1 h-[60px] w-[60px] opacity-20 ${
                            stat.color === "orange" ? "text-orange-300" : stat.color === "emerald" ? "text-emerald-300" : stat.color === "amber" ? "text-amber-300" : "text-rose-300"
                        }`} />
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="relative w-full max-w-md flex-1">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search products by name, SKU..."
                        className="w-full rounded-xl border border-gray-100 bg-gray-50 py-2.5 pl-11 pr-4 text-sm font-medium text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-orange-100"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <select className="cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm font-bold text-gray-600 outline-none focus:border-primary">
                            <option>Select Status</option>
                            <option>Active</option>
                            <option>Low Stock</option>
                            <option>Out of Stock</option>
                        </select>
                        <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                <div className="flex items-center gap-3">
                <div className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setViewMode("table")}
                        className={`rounded-lg p-2 transition-all ${viewMode === "table" ? "bg-orange-100 text-primary-dark" : "text-gray-400 hover:text-slate-600"}`}
                        aria-label="Table mode"
                        title="Table mode"
                    >
                        <FiList size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("card")}
                        className={`rounded-lg p-2 transition-all ${viewMode === "card" ? "bg-orange-100 text-primary-dark" : "text-gray-400 hover:text-slate-600"}`}
                        aria-label="Card mode"
                        title="Card mode"
                    >
                        <FiGrid size={18} />
                    </button>
                </div>
                <button
                    type="button"
                    onClick={() => navigate("/admin/products/stock/add")}
                    className="flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-primary to-primary-dark px-5 py-3 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark active:scale-95"
                >
                    <FiPlus size={17} /> Add Stock
                </button>
                </div>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white text-slate-800 shadow-sm">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-orange-100 border-t-primary"></div>
                            <p className="text-gray-500 font-bold text-sm">Loading stock details...</p>
                        </div>
                    ) : viewMode === "table" ? (
                        <table className="w-full text-left">
                            <thead>
                            <tr className="border-b border-secondary-dark bg-gradient-to-r from-secondary-dark to-secondary-light">
                                <th className="w-12 px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-[#FCD34D]">S.No.</th>
                                <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-[#FCD34D]">Product</th>
                                <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-[#FCD34D]">Category</th>
                                <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-[#FCD34D]">Price</th>
                                <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-[#FCD34D]">Stock</th>
                                <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-[#FCD34D]">Status</th>
                                <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-[#FCD34D]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {currentItems.length > 0 ? (
                                    currentItems.map((product, index) => {
                                        const stock = getStockLevel(product);
                                        const status = product.status && product.status !== "Active" ? product.status : deriveStatus(stock);

                                        return (
                                            <tr key={product.id} className="group transition-colors hover:bg-orange-50/40">
                                                <td className="px-3 py-4 text-sm text-gray-500 font-medium">
                                                    {(currentPage - 1) * itemsPerPage + index + 1}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border border-gray-100 shrink-0 group-hover:scale-105 transition-transform">
                                                            <img
                                                                src={getProductImage(product)}
                                                                alt={product.name}
                                                                loading="lazy"
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=` + encodeURIComponent(product.name) + `&background=9a3412&color=fff7ed`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800 leading-tight max-w-[180px] truncate">{product.name}</p>
                                                            <p className="mt-0.5 text-[11px] font-medium text-gray-400">SKU: {product.product_code || `SKU${String(product.id).padStart(4, "0")}`}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-primary-dark">
                                                        {product.category || "Uncategorized"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <p className="text-sm font-bold text-slate-800">₹{parseFloat(product.offer_price || product.discount_price || product.mrp || 0).toLocaleString('en-IN')}</p>
                                                    {product.mrp && product.offer_price && parseFloat(product.mrp) > parseFloat(product.offer_price) && (
                                                        <p className="text-[11px] text-gray-400 line-through">₹{parseFloat(product.mrp).toLocaleString('en-IN')}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <button
                                                        onClick={() => openUpdateModal(product)}
                                                        title="Click to update stock"
                                                        className="group/stock flex items-center gap-1.5 text-sm font-black text-slate-800 transition-colors hover:text-primary-dark"
                                                    >
                                                        <span className="underline decoration-dotted decoration-gray-300 group-hover/stock:decoration-primary-dark">{stock}</span>
                                                        <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-primary-dark opacity-0 transition-opacity group-hover/stock:opacity-100">edit</span>
                                                    </button>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-3 py-1 rounded-lg text-[11px] font-bold border ` + getStatusStyle(status)}>
                                                        {status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => openUpdateModal(product)}
                                                            className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-primary-dark transition-colors hover:bg-orange-100"
                                                            title="Update Stock"
                                                        >
                                                            <FiEdit2 size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-8 py-10 text-center text-gray-400 font-bold">
                                            No stock data found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
                            {currentItems.length > 0 ? currentItems.map((product) => {
                                const stock = getStockLevel(product);
                                const status = product.status && product.status !== "Active" ? product.status : deriveStatus(stock);

                                return (
                                    <div key={product.id} className="group overflow-hidden rounded-2xl border border-orange-100/80 bg-white transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg">
                                        <div className="relative h-40 bg-gray-100 overflow-hidden">
                                            <img
                                                src={getProductImage(product)}
                                                alt={product.name}
                                                loading="lazy"
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=` + encodeURIComponent(product.name) + `&background=9a3412&color=fff7ed`}
                                            />
                                            <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[11px] font-bold border shadow-sm ` + getStatusStyle(status)}>{status}</span>
                                        </div>
                                        <div className="p-4">
                                            <div className="min-w-0">
                                                <p className="text-base font-bold text-slate-800 truncate">{product.name}</p>
                                                <p className="mt-1 text-[11px] font-medium text-gray-400">SKU: {product.product_code || `SKU${String(product.id).padStart(4, "0")}`}</p>
                                                <span className="mt-3 inline-block rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-primary-dark">
                                                    {product.category || "Uncategorized"}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-100">
                                                <div>
                                                    <p className="text-[11px] text-gray-400 font-medium">Price</p>
                                                    <p className="text-lg font-black text-slate-800 mt-0.5">₹{parseFloat(product.offer_price || product.discount_price || product.mrp || 0).toLocaleString('en-IN')}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[11px] text-gray-400 font-medium">Available Stock</p>
                                                    <button onClick={() => openUpdateModal(product)} className="text-lg font-black text-slate-800 transition-colors hover:text-primary-dark">
                                                        {stock}
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => openUpdateModal(product)}
                                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-primary-dark py-2.5 text-xs font-bold text-white transition-all hover:from-secondary-light hover:to-secondary-dark"
                                            >
                                                <FiEdit2 size={13} /> Update Stock
                                            </button>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <p className="col-span-full px-8 py-10 text-center text-gray-400 font-bold">No stock data found.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Pagination UI */}
                {totalPages > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-white px-5 py-4">
                        <p className="text-xs text-gray-500 font-medium">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} products
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm text-gray-500 shadow-sm transition-colors hover:border-primary hover:text-primary-dark disabled:opacity-30"
                            >‹</button>
                            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                                const page = i + 1;
                                return (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`h-8 w-8 rounded-xl border text-xs font-bold transition-all ` + (currentPage === page ? "border-primary-dark bg-gradient-to-r from-primary to-primary-dark text-white shadow-md shadow-orange-200" : "border-gray-200 bg-white text-gray-500 hover:border-primary hover:text-primary-dark")}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                            {totalPages > 5 && <span className="text-gray-400 text-sm">...</span>}
                            {totalPages > 5 && (
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    className={`h-8 w-8 rounded-xl border text-xs font-bold ` + (currentPage === totalPages ? "border-primary-dark bg-gradient-to-r from-primary to-primary-dark text-white shadow-md shadow-orange-200" : "border-gray-200 bg-white text-gray-500 hover:border-primary hover:text-primary-dark")}
                                >
                                    {totalPages}
                                </button>
                            )}
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm text-gray-500 shadow-sm transition-colors hover:border-primary hover:text-primary-dark disabled:opacity-30"
                            >›</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Stock Update Modal */}
            {isModalOpen && selectedProduct && (
                createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md" onMouseDown={(event) => {
                    if (event.target === event.currentTarget && !isUpdating) closeUpdateModal();
                }}>
                    <section className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[24px] bg-white text-slate-800 shadow-2xl animate-in zoom-in-95 duration-200" role="dialog" aria-modal="true" aria-labelledby="stock-update-title">
                        <header className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white p-6">
                            <div>
                                <h3 id="stock-update-title" className="text-lg font-black text-slate-800">Quick Stock Update</h3>
                                <p className="mt-1 text-xs font-bold text-primary-dark">{selectedProduct.name}</p>
                            </div>
                            <button type="button" onClick={closeUpdateModal} disabled={isUpdating} className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-slate-700 disabled:opacity-50" aria-label="Close stock update">
                                <FiX size={20} />
                            </button>
                        </header>

                        <div className="min-h-0 flex-1 overflow-y-auto p-6">
                            {fetchingDetail ? (
                                <div className="py-10 flex flex-col items-center justify-center">
                                    <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-orange-100 border-t-primary"></div>
                                    <p className="text-xs font-bold text-gray-400">Loading variants...</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {updatedVariants.length > 0 && updatedVariants.some(v => v.sizesStock && Object.keys(v.sizesStock).length > 0) ? (
                                        // Variant Based Stock
                                        <div className="space-y-4">
                                            {updatedVariants.map((variant, vIndex) => (
                                                <div key={vIndex} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-6 h-6 rounded-full shadow-sm border border-gray-200" style={{ backgroundColor: variant.color }}></div>
                                                        <span className="text-sm font-black text-slate-800">{variant.colorName || 'Default Shade'}</span>
                                                    </div>

                                                    {variant.sizesStock && Object.keys(variant.sizesStock).length > 0 ? (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {Object.entries(variant.sizesStock).map(([size, currentQty]) => (
                                                                <div key={size} className="bg-white border border-gray-200 p-3 rounded-xl">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <label className="text-[10px] font-black text-gray-400 uppercase">{size}</label>
                                                                        <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Curr: {currentQty}</span>
                                                                    </div>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={variantAdditions[`${vIndex}-${size}`] ?? ""}
                                                                        onChange={(e) => handleVariantStockChange(vIndex, size, e.target.value)}
                                                                        className="w-full border-b border-gray-100 bg-transparent pb-1 text-base font-black text-slate-800 outline-none transition-colors placeholder:text-gray-300 focus:border-primary"
                                                                        placeholder="Add"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-gray-400 font-medium">No sizes configured for this variant.</p>
                                                    )}
                                                </div>
                                            ))}
                                            <p className="rounded-xl bg-orange-50 p-3 text-center text-xs font-bold text-primary-dark">
                                                Total stock will be auto-calculated from variants.
                                            </p>
                                        </div>
                                    ) : (
                                        // Manual Total Stock
                                        <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Add To Current Stock</label>
                                                <span className="text-[10px] font-black text-gray-500 bg-gray-200 px-2 py-1 rounded-full">Current: {selectedProduct.total_stock ?? 0}</span>
                                            </div>
                                            <div className="relative">
                                                <FiBox className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={manualTotalStock}
                                                    onChange={(e) => setManualTotalStock(e.target.value)}
                                                    className="w-full rounded-xl border border-gray-200 bg-white py-4 pl-12 pr-4 text-xl font-black text-slate-800 shadow-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-orange-100"
                                                    placeholder="Enter quantity to add"
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold mt-2 ml-1">The new total will be current stock + added quantity.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/80 p-5">
                            <button
                                type="button"
                                onClick={closeUpdateModal}
                                disabled={isUpdating}
                                className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-600 transition-all hover:bg-gray-200 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveStock}
                                disabled={isUpdating || fetchingDetail}
                                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isUpdating ? (
                                    <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div> Saving...</>
                                ) : (
                                    <><FiSave /> Save Stock</>
                                )}
                            </button>
                        </footer>
                    </section>
                </div>,
                document.body
                )
            )}

        </div>
    );
};

export default StockDetails;
