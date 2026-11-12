import React, { useState, useEffect, useContext } from "react";
import { createPortal } from "react-dom";
import { useAdmin } from "../../PrivateRouter/AdminContext";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import { toast, Toaster } from "react-hot-toast";
import { FaRupeeSign } from "react-icons/fa";
import {
    FiPlus,
    FiSearch,
    FiFilter,
    FiEdit2,
    FiTrash2,
    FiEye,
    FiBox,
    FiGrid,
    FiList,
    FiChevronRight,
    FiPackage,
    FiLayout,
    FiDatabase
} from "react-icons/fi";

const AllProducts = () => {
    const navigate = useNavigate();
    const { productsCache, setProductsCached } = useAdmin();

    const [searchTerm, setSearchTerm] = useState("");
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const currentCacheKey = JSON.stringify({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        status: showLowStockOnly ? "Low Stock" : "All"
    });

    const pageData = productsCache[currentCacheKey];
    const [products, setProducts] = useState(pageData?.products || []);
    const [loading, setLoading] = useState(!pageData);
    const [viewMode, setViewMode] = useState("table"); // 'table' or 'grid'

    // Stock Update Modal State
    const [currentProduct, setCurrentProduct] = useState(null);
    const [newStock, setNewStock] = useState("");
    const [updatingStock, setUpdatingStock] = useState(false);

    const [pagination, setPagination] = useState(pageData?.pagination || { total: 0, totalPages: 1 });
    const [stats, setStats] = useState(pageData?.stats || { total: 0, active: 0, lowStock: 0, outOfStock: 0 });

    // Rapid Add Modal
    const [isRapidAddOpen, setIsRapidAddOpen] = useState(false);
    const [rapidSaving, setRapidSaving] = useState(false);
    const [rapidProd, setRapidProd] = useState({ name: "", mrp: "", status: "Active" });

    const handleRapidAdd = async (e, shouldContinue = false) => {
        if (e) e.preventDefault();
        if (!rapidProd.name || !rapidProd.mrp) return toast.error("Essentials missing!");

        setRapidSaving(true);
        try {
            await api.post("/products", {
                ...rapidProd,
                category: "Furniture",
                total_stock: "0",
                variants: []
            });
            toast.success("Boutique addition live!");
            if (shouldContinue) {
                setRapidProd({ name: "", mrp: "", status: "Active" });
            } else {
                setIsRapidAddOpen(false);
                setRapidProd({ name: "", mrp: "", status: "Active" });
            }
            fetchProducts();
        } catch (error) {
            toast.error("Process failed.");
        } finally {
            setRapidSaving(false);
        }
    };

    const fetchProducts = async () => {
        const params = {
            page: currentPage,
            limit: itemsPerPage,
            search: searchTerm,
            status: showLowStockOnly ? "Low Stock" : "All"
        };
        const cacheKey = JSON.stringify(params);
        if (!productsCache[cacheKey]) setLoading(true);

        try {
            const response = await api.get("/products", { params });
            const data = response.data;
            let finalData = {};
            if (Array.isArray(data)) {
                finalData = { products: data, pagination: { total: data.length, totalPages: 1 }, stats: { total: 0, active: 0, lowStock: 0, outOfStock: 0 } };
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
            setProductsCached(prev => ({ ...prev, [cacheKey]: finalData }));
        } catch (error) {
            console.error("Error fetching products:", error);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchProducts();
        }, 300);
        return () => clearTimeout(timeout);
    }, [currentPage, searchTerm, showLowStockOnly]);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;
        try {
            await api.delete(`/products/${id}`);
            toast.success("Product removed from vault.");
            fetchProducts();
        } catch (error) {
            toast.error("Deletion failed.");
            console.error("Error deleting product:", error);
        }
    };

    const handleStockUpdate = async (e) => {
        e.preventDefault();
        if (!currentProduct || newStock === "") return;

        setUpdatingStock(true);
        try {
            // Send partial update - most backends handle this if we send just what changed, 
            // but for ours we might need to send all or use a specific endpoint.
            // Assuming current backend needs a full update based on our previous look.
            const updatedProduct = { ...currentProduct, total_stock: parseInt(newStock) };
            await api.put(`/products/${currentProduct.id}`, updatedProduct);

            toast.success("Stock updated instantly!");
            setProducts(products.map(p => p.id === currentProduct.id ? { ...p, total_stock: parseInt(newStock), status: parseInt(newStock) === 0 ? 'Out of Stock' : parseInt(newStock) < 10 ? 'Low Stock' : 'Active' } : p));
            setCurrentProduct(null);
        } catch (error) {
            toast.error("Failed to update stock");
        } finally {
            setUpdatingStock(false);
        }
    };


    const getStatusStyle = (status) => {
        switch (status) {
            case "Active": return "bg-emerald-50 text-emerald-600 border-emerald-100";
            case "Low Stock": return "bg-amber-50 text-amber-600 border-amber-100";
            case "Out of Stock": return "bg-rose-50 text-rose-600 border-rose-100";
            default: return "bg-gray-50 text-gray-600 border-gray-100";
        }
    };

    // Simplified Pagination (Handled by backend)
    const totalPages = pagination.totalPages;
    const currentItems = products;

    // Reset to page 1 when search/filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, showLowStockOnly]);

    const getProductImage = (product) => {
        let imgUrl = null;
        try {
            const processUrl = (url) => {
                if (!url || typeof url !== 'string') return null;
                if (url.startsWith('http') || url.startsWith('data:')) return url;
                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
                const cleanPath = url.startsWith('/') ? url : `/${url}`;
                return `${backendUrl}${cleanPath}`;
            };

            // 1. Try variants first
            if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
                const firstVar = product.variants[0];
                const vImgs = typeof firstVar.images === 'string' ? JSON.parse(firstVar.images) : firstVar.images;
                if (Array.isArray(vImgs) && vImgs.length > 0) imgUrl = vImgs[0];
            }

            // 2. Try main images column
            if (!imgUrl && product.images) {
                const imgs = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                if (Array.isArray(imgs) && imgs.length > 0) imgUrl = imgs[0];
            }

            const finalUrl = processUrl(imgUrl);
            if (finalUrl) return finalUrl;
        } catch (e) {
            console.error("Error getting product image:", e);
        }

        return `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name || 'P')}&background=random`;
    };

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-screen pb-20">
            <Toaster position="top-right" />

           
           

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-10 h-10 border-4 border-orange-100 border-t-primary rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400 font-bold text-sm">Loading products...</p>
                </div>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            {
                                label: "Total Products",
                                value: stats.total,
                                sub: "All furniture products",
                                icon: <FiBox size={22} />,
                                watermark: <FiBox />,
                                gradient: "from-primary to-primary-dark",
                                accent: "from-primary-light to-primary-dark",
                                border: "border-orange-100/80 hover:border-orange-200",
                                iconShadow: "shadow-orange-200/70",
                                watermarkColor: "text-orange-300/20",
                            },
                            {
                                label: "Active",
                                value: stats.active,
                                sub: "Active products",
                                icon: <FiCheckCircle />,
                                watermark: <FiCheckCircle />,
                                gradient: "from-emerald-400 to-emerald-600",
                                accent: "from-emerald-400 to-emerald-600",
                                border: "border-emerald-100/80 hover:border-emerald-200",
                                iconShadow: "shadow-emerald-200/70",
                                watermarkColor: "text-emerald-300/20",
                            },
                            {
                                label: "Inactive",
                                value: stats.outOfStock || 0,
                                sub: "Inactive products",
                                icon: <FiAlertCircle />,
                                watermark: <FiAlertCircle />,
                                gradient: "from-amber-400 to-amber-600",
                                accent: "from-amber-400 to-amber-600",
                                border: "border-amber-100/80 hover:border-amber-200",
                                iconShadow: "shadow-amber-200/70",
                                watermarkColor: "text-amber-300/20",
                            },
                            {
                                label: "Low Stock",
                                value: stats.lowStock,
                                sub: "Products low in stock",
                                icon: <FiXCircle />,
                                watermark: <FiXCircle />,
                                gradient: "from-rose-400 to-rose-600",
                                accent: "from-rose-400 to-rose-600",
                                border: "border-rose-100/80 hover:border-rose-200",
                                iconShadow: "shadow-rose-200/70",
                                watermarkColor: "text-rose-300/20",
                            },
                        ].map((stat, i) => (
                            <div key={i} className={`group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border ${stat.border} bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]`}>
                                <div className={`absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b ${stat.accent}`} />
                                <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${stat.gradient} text-white shadow-lg ${stat.iconShadow} transition-transform duration-200 group-hover:scale-105`}>
                                    {stat.icon}
                                </div>
                                <div className="relative z-10">
                                    <p className="mb-1 text-xs font-bold tracking-wide text-secondary-light">{stat.label}</p>
                                    <p className="mb-1 text-3xl font-black leading-none text-secondary-dark">{stat.value}</p>
                                    <p className="text-[10px] font-medium text-stone-500">{stat.sub}</p>
                                </div>
                                <div className={`pointer-events-none absolute -right-1 bottom-1 text-6xl ${stat.watermarkColor}`}>{stat.watermark}</div>
                            </div>
                        ))}
                    </div>

                    {/* Filter Bar */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px]">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                            <input
                                type="text"
                                placeholder="Search products by name, SKU..."
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all text-sm font-medium text-slate-700"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                       
                    
                        <select className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-slate-600 outline-none hover:border-primary transition-all cursor-pointer">
                            <option>Select Status</option>
                            <option>Active</option>
                            <option>Low Stock</option>
                            <option>Out of Stock</option>
                        </select>
                       <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                        <button onClick={() => setViewMode("table")} className={`p-2 rounded-lg transition-all ${viewMode === "table" ? "bg-white text-primary-dark shadow-sm" : "text-gray-400 hover:text-slate-600"}`}>
                            <FiList size={17} />
                        </button>
                        <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white text-primary-dark shadow-sm" : "text-gray-400 hover:text-slate-600"}`}>
                            <FiGrid size={17} />
                        </button>
                    </div>
                    <button
                        onClick={() => navigate("/admin/products/add")}
                        className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark hover:from-secondary-light hover:to-secondary-dark text-white px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-900/20 active:scale-95"
                    >
                        <FiPlus size={16} /> Add New Product
                    </button>
                </div>
                    </div>

                    {viewMode === "table" ? (
                        /* Table View */
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-secondary-dark to-secondary-light border-b border-secondary-dark">
                                            <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider w-10">
                                                <input type="checkbox" className="rounded border-[#FCD34D]/40 accent-[#FCD34D]" />
                                            </th>
                                            <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider w-12">S.No.</th>
                                            <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Product</th>
                                            <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Category</th>
                                            <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Price</th>
                                            <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Stock</th>
                                            <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-4 text-[11px] font-bold text-[#FCD34D] uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {currentItems.map((product, index) => (
                                            <tr key={product.id} className="hover:bg-orange-50/60 transition-colors group">
                                                <td className="px-5 py-4">
                                                    <input type="checkbox" className="rounded border-gray-300" />
                                                </td>
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
                                                                onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&background=3c096c&color=FCD34D`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800 leading-tight max-w-[180px] truncate">{product.name}</p>
                                                            <p className="text-[11px] text-gray-400 font-medium mt-0.5">SKU: {product.product_code || `QF${String(product.id).padStart(4,'0')}`}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-orange-50 text-primary-dark border border-orange-200">
                                                        {product.category || '—'}
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
                                                        onClick={() => { setCurrentProduct(product); setNewStock(product.total_stock || "0"); }}
                                                        className="text-sm font-bold text-slate-700 hover:text-primary-dark underline decoration-dotted decoration-gray-300 transition-colors"
                                                    >
                                                        {product.total_stock ?? product.stock ?? 0}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-3 py-1 rounded-lg text-[11px] font-bold border ${getStatusStyle(product.status)}`}>
                                                        {product.status || 'Active'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            to={`/admin/products/${product.id}`}
                                                            className="w-8 h-8 rounded-lg bg-orange-50 text-primary-dark flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                                                            title="View"
                                                        >
                                                            <FiEye size={13} />
                                                        </Link>
                                                        <Link
                                                            to={`/admin/products/edit/${product.id}`}
                                                            className="w-8 h-8 rounded-lg bg-orange-50 text-primary-dark flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                                                            title="Edit"
                                                        >
                                                            <FiEdit2 size={13} />
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDelete(product.id)}
                                                            className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                                            title="Delete"
                                                        >
                                                            <FiTrash2 size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Table Footer / Pagination */}
                            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                                <p className="text-xs text-gray-500 font-medium">
                                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} products
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:border-primary hover:text-primary-dark disabled:opacity-30 transition-all"
                                    >‹</button>
                                    {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                                        const page = i + 1;
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border ${currentPage === page ? "bg-gradient-to-br from-primary to-primary-dark border-primary-dark text-white shadow-md shadow-orange-900/20" : "bg-white border-gray-200 text-gray-500 hover:border-primary"}`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}
                                    {totalPages > 5 && <span className="text-gray-400 text-sm">...</span>}
                                    {totalPages > 5 && (
                                        <button
                                            onClick={() => setCurrentPage(totalPages)}
                                            className={`w-8 h-8 rounded-lg text-xs font-bold border ${currentPage === totalPages ? "bg-gradient-to-br from-primary to-primary-dark border-primary-dark text-white" : "bg-white border-gray-200 text-gray-500 hover:border-primary"}`}
                                        >
                                            {totalPages}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:border-primary hover:text-primary-dark disabled:opacity-30 transition-all"
                                    >›</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Grid View */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {currentItems.map((product) => (
                                <div key={product.id} className="bg-white rounded-xl border border-orange-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all flex flex-col">
                                    <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                                        <img
                                            src={getProductImage(product)}
                                            alt={product.name}
                                            loading="lazy"
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&background=F07816&color=ffffff`}
                                        />
                                        <div className="absolute top-3 left-3">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border backdrop-blur-md ${getStatusStyle(product.status)}`}>
                                                {product.status}
                                            </span>
                                        </div>
                                        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link to={`/admin/products/edit/${product.id}`} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-primary-dark shadow-md hover:bg-primary hover:text-white transition-all">
                                                <FiEdit2 size={13} />
                                            </Link>
                                            <button onClick={() => handleDelete(product.id)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-red-400 shadow-md hover:bg-red-500 hover:text-white transition-all">
                                                <FiTrash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-[10px] text-primary-dark font-bold uppercase tracking-widest">{product.category}</p>
                                        <h4 className="text-sm font-bold text-slate-800 truncate mt-0.5">{product.name}</h4>
                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                                            <div>
                                                <p className="text-base font-black text-slate-800">₹{parseFloat(product.offer_price || product.mrp || 0).toLocaleString('en-IN')}</p>
                                                <p className="text-[10px] text-gray-400">Stock: {product.total_stock ?? 0}</p>
                                            </div>
                                            <Link to={`/admin/products/${product.id}`} className="px-3 py-1.5 bg-orange-50 text-primary-dark rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all">
                                                View
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {currentItems.length === 0 && (
                        <div className="text-center py-24 bg-white rounded-2xl border border-gray-100 flex flex-col items-center">
                            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-primary/50 mb-4">
                                <FiBox size={32} />
                            </div>
                            <p className="text-slate-500 font-bold text-sm">No products found</p>
                            <p className="text-slate-400 text-xs mt-1">Try adjusting your search or filters</p>
                        </div>
                    )}
                </>
            )}

            {/* QUICK STOCK UPDATE MODAL */}
            {currentProduct && (
                createPortal(
                <div className="fixed inset-0 z-[100] flex h-screen w-screen items-center justify-center bg-transparent p-4">
                    <div className="absolute inset-0 z-0 bg-slate-900/60 backdrop-blur-[3px]" onClick={() => setCurrentProduct(null)}></div>
                    <div className="relative z-10 bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-gradient-to-r from-secondary-dark to-secondary-light p-8 text-white relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10"><FiPackage size={80} /></div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tight truncate">{currentProduct.name}</h2>
                            <p className="text-xs text-primary-light font-bold uppercase tracking-widest mt-1">Stock Controller</p>
                        </div>

                        <form onSubmit={handleStockUpdate} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Inventory</span>
                                    <span className="text-lg font-black text-slate-800">{currentProduct.total_stock} Units</span>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Stock Level</label>
                                    <input
                                        autoFocus
                                        type="number"
                                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-primary/40 rounded-2xl outline-none font-bold text-slate-800 transition-all text-2xl text-center"
                                        placeholder="0"
                                        value={newStock}
                                        onChange={(e) => setNewStock(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={updatingStock}
                                className="w-full py-5 bg-gradient-to-r from-primary to-primary-dark hover:from-secondary-light hover:to-secondary-dark text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-orange-900/20 flex items-center justify-center gap-3"
                            >
                                {updatingStock ? <div className="w-4 h-4 border-2 border-t-white rounded-full animate-spin"></div> : "Sync Stock Record"}
                            </button>

                            <button
                                type="button"
                                onClick={() => setCurrentProduct(null)}
                                className="w-full py-2 text-[10px] font-black text-gray-400 hover:text-slate-800 uppercase tracking-widest transition-colors"
                            >
                                Cancel
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
                )
            )}

            {/* RAPID PRODUCT ADD MODAL */}
            {isRapidAddOpen && (
                createPortal(
                <div className="fixed inset-0 z-[100] flex h-screen w-screen items-center justify-center bg-transparent p-4">
                    <div className="absolute inset-0 z-0 bg-slate-900/60 backdrop-blur-[3px]" onClick={() => setIsRapidAddOpen(false)}></div>
                    <div className="relative z-10 bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-gradient-to-r from-secondary-dark to-secondary-light p-8 text-white relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10"><FiBox size={80} /></div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tight">Rapid Addition</h2>
                            <p className="text-xs text-[#FCD34D]/60 font-bold uppercase tracking-widest mt-1">Instant AJAX Listing</p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Title</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-primary/40 rounded-2xl outline-none font-bold text-slate-800 transition-all"
                                        placeholder="e.g. Modern Lounge Chair"
                                        value={rapidProd.name}
                                        onChange={(e) => setRapidProd({ ...rapidProd, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Price (MRP)</label>
                                    <div className="relative">
                                        <FaRupeeSign className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="number"
                                            className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:border-primary/40 rounded-2xl outline-none font-bold text-slate-800 transition-all"
                                            placeholder="2999"
                                            value={rapidProd.mrp}
                                            onChange={(e) => setRapidProd({ ...rapidProd, mrp: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={(e) => handleRapidAdd(e, true)}
                                    disabled={rapidSaving}
                                    className="w-full py-5 bg-white border-2 border-orange-200 hover:bg-orange-50 text-primary-dark rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    List & Add Another
                                </button>
                                <button
                                    onClick={(e) => handleRapidAdd(e, false)}
                                    disabled={rapidSaving}
                                    className="w-full py-5 bg-gradient-to-r from-primary to-primary-dark hover:from-secondary-light hover:to-secondary-dark text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-orange-900/20 flex items-center justify-center gap-3"
                                >
                                    {rapidSaving ? <div className="w-4 h-4 border-2 border-t-white rounded-full animate-spin"></div> : "Save & Close"}
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsRapidAddOpen(false)}
                                className="w-full py-2 text-[10px] font-black text-gray-400 hover:text-slate-800 uppercase tracking-widest transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
                )
            )}
        </div>
    );
};

// SVG Helper Components
const FiCheckCircle = () => <svg stroke="currentColor" fill="none" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
const FiAlertCircle = () => <svg stroke="currentColor" fill="none" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
const FiXCircle = () => <svg stroke="currentColor" fill="none" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>

export default AllProducts;
