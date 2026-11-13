import React, { useState, useEffect } from "react";
import { FiArrowLeft, FiSearch, FiSave, FiLayers, FiBox, FiPlus, FiCheck } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { toast, Toaster } from "react-hot-toast";

const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const getImageUrl = (imagePath) => {
  if (!imagePath) return `https://ui-avatars.com/api/?name=Product&background=random`;
  if (imagePath.startsWith('http')) return imagePath;
  return `${BACKEND_URL}${imagePath}`;
};

const AddStock = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [loading, setLoading] = useState(false);

    // UI state for inputs
    const [stockAdditions, setStockAdditions] = useState({});
    const [manualTotalStockAdd, setManualTotalStockAdd] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchProducts();
        }, 300);
        return () => clearTimeout(timeout);
    }, [search]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = { search };
            const res = await api.get("/products", { params });
            const data = res.data;
            setProducts(Array.isArray(data) ? data : (data.products || []));
        } catch (error) {
            toast.error("Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectProduct = async (prod) => {
        setSelectedProduct(null);
        setStockAdditions({});
        setManualTotalStockAdd("");
        setSearch("");
        try {
            const res = await api.get(`/products/${prod.id}`);
            const p = res.data;
            let variants = [];
            if (p.variants) {
                variants = typeof p.variants === 'string' ? JSON.parse(p.variants) : p.variants;
            }
            setSelectedProduct({ ...p, variants: Array.isArray(variants) ? variants : [] });
        } catch (error) {
            toast.error("Failed to fetch product details");
        }
    };

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        if (selectedProduct) setSelectedProduct(null); // Clear selection if user searches again
    };

    const filteredProducts = products;

    const handleAdditionChange = (key, value) => {
        const val = value.replace(/[^0-9]/g, '');
        setStockAdditions(prev => ({ ...prev, [key]: val }));
    };

    const getCurrentStockValue = (product) => {
        const current = Number.parseInt(product?.total_stock ?? product?.stock ?? 0, 10) || 0;
        return Math.max(0, current);
    };

    const handleSave = async () => {
        if (!selectedProduct) return;
        setIsSaving(true);
        try {
            const updatedVariants = [...selectedProduct.variants];
            let addedTotal = 0;
            const hasVariantsWithSizes = updatedVariants.some(v => v.sizesStock && Object.keys(v.sizesStock).length > 0);

            if (hasVariantsWithSizes) {
                updatedVariants.forEach((v, vIndex) => {
                    if (v.sizesStock) {
                        Object.keys(v.sizesStock).forEach(size => {
                            const key = `${vIndex}-${size}`;
                            const addition = parseInt(stockAdditions[key]) || 0;
                            v.sizesStock[size] = (parseInt(v.sizesStock[size]) || 0) + addition;
                            addedTotal += addition;
                        });
                    }
                });
            } else {
                addedTotal = parseInt(manualTotalStockAdd) || 0;
            }

            if (addedTotal === 0) {
                toast.error("Please add a quantity greater than 0");
                setIsSaving(false);
                return;
            }

            const oldTotal = getCurrentStockValue(selectedProduct);
            const newTotalStock = oldTotal + addedTotal;
            const status = newTotalStock <= 0 ? "Out of Stock" : newTotalStock < 10 ? "Low Stock" : "Active";

            const payload = {
                ...selectedProduct,
                total_stock: newTotalStock.toString(),
                stock: newTotalStock.toString(),
                status: status,
                variants: updatedVariants
            };

            await api.put(`/products/${selectedProduct.id}`, payload);
            toast.success(`Successfully added ${addedTotal} to stock!`);
            setTimeout(() => navigate(-1), 1500);
        } catch (error) {
            toast.error("Failed to add stock");
        } finally {
            setIsSaving(false);
        }
    };

    const hasSizes = selectedProduct && selectedProduct.variants && selectedProduct.variants.some(v => v.sizesStock && Object.keys(v.sizesStock).length > 0);

    return (
        <div className="min-h-screen space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 font-sans">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="flex flex-col justify-between gap-6 pb-2 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3 sm:gap-4">
                    <button type="button" onClick={() => navigate(-1)} aria-label="Go back" className="rounded-xl border border-orange-100 bg-white p-3 text-gray-400 shadow-sm transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-primary-dark active:scale-95">
                        <FiArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-secondary-dark sm:text-3xl">
                            Add New Stock
                        </h1>
                        <p className="mt-1 text-sm font-medium text-stone-500">Select a product and top up your inventory securely.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Search & Selection Section */}
                <div className="space-y-6 lg:col-span-1">
                    <div className="rounded-2xl border border-orange-100/80 bg-white p-5 shadow-[0_8px_24px_rgba(74,46,25,0.08)] sm:p-6">
                        <label className="mb-4 block text-xs font-bold uppercase tracking-widest text-secondary-light">Step 1: Find Product</label>
                        <div className="relative mb-4">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={handleSearchChange}
                                placeholder="Search by name or SKU..."
                                className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 pl-12 pr-4 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-gray-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-orange-100"
                            />
                        </div>

                        {!selectedProduct && (
                            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-2">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-10">
                                        <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-orange-100 border-t-primary" />
                                        <p className="text-xs font-bold text-stone-500">Loading products...</p>
                                    </div>
                                ) : filteredProducts.map(prod => (
                                    <button
                                        type="button"
                                        key={prod.id}
                                        onClick={() => handleSelectProduct(prod)}
                                        className="group flex w-full items-center gap-3 rounded-xl border border-transparent bg-gray-50 p-3 text-left transition-all hover:border-orange-100 hover:bg-orange-50"
                                    >
                                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-orange-50">
                                            <img
                                                src={getImageUrl((prod.variants && prod.variants.length > 0 && prod.variants[0].images?.length > 0) ? prod.variants[0].images[0] : (prod.images && prod.images.length > 0) ? prod.images[0] : null)}
                                                alt={prod.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-black text-slate-800 truncate">{prod.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{prod.product_code || `#SKU-${1000 + prod.id}`}</p>
                                        </div>
                                        <div className="text-primary opacity-0 transition-opacity group-hover:opacity-100">
                                            <FiPlus />
                                        </div>
                                    </button>
                                ))}
                                {!loading && filteredProducts.length === 0 && (
                                    <p className="py-8 text-center text-xs font-bold text-stone-500">No products found.</p>
                                )}
                            </div>
                        )}
                        {selectedProduct && (
                            <div className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50 p-3">
                                <div className="flex items-center gap-2 text-sm font-bold text-primary-dark">
                                    <FiCheck className="text-emerald-600" /> Product Selected
                                </div>
                                <button type="button" onClick={() => setSelectedProduct(null)} className="rounded-lg bg-white px-2 py-1 text-[10px] font-black uppercase text-primary-dark transition-colors hover:bg-orange-100">
                                    Change
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Addition Section */}
                <div className="space-y-6 lg:col-span-2">
                    {selectedProduct ? (
                        <div className="group relative overflow-hidden rounded-2xl border border-orange-100/80 bg-white p-5 shadow-[0_8px_24px_rgba(74,46,25,0.08)] sm:p-8">
                            <div className="absolute -right-10 -top-10 p-8 text-primary opacity-[0.04]">
                                <FiLayers size={200} />
                            </div>

                            <div className="relative z-10 space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-orange-100 bg-orange-50 shadow-inner">
                                        <img
                                            src={getImageUrl((selectedProduct.variants && selectedProduct.variants.length > 0 && selectedProduct.variants[0].images?.length > 0) ? selectedProduct.variants[0].images[0] : (selectedProduct.images && selectedProduct.images.length > 0) ? selectedProduct.images[0] : null)}
                                            alt={selectedProduct.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black tracking-tight text-secondary-dark sm:text-2xl">{selectedProduct.name}</h2>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedProduct.product_code || `#SKU-${1000 + selectedProduct.id}`}</span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-200"></span>
                                            <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary-dark">Total Current: {selectedProduct.total_stock || 0}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6 rounded-2xl border border-orange-100 bg-orange-50/40 p-5 sm:p-6">
                                    <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-secondary-dark">
                                        <div className="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
                                        Step 2: Enter New Stock Details
                                    </label>

                                    {hasSizes ? (
                                        <div className="space-y-6">
                                            {selectedProduct.variants.map((v, vIndex) => {
                                                if (!v.sizesStock || Object.keys(v.sizesStock).length === 0) return null;
                                                return (
                                                    <div key={vIndex} className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div className="h-5 w-5 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: v.color }}></div>
                                                            <span className="text-sm font-black text-slate-800">{v.colorName || 'Default Shade'}</span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {Object.entries(v.sizesStock).map(([size, currentStock]) => {
                                                                const key = `${vIndex}-${size}`;
                                                                const added = parseInt(stockAdditions[key]) || 0;
                                                                const oldTotal = parseInt(currentStock) || 0;
                                                                const newTotalMatch = oldTotal + added;
                                                                return (
                                                                    <div key={size} className="rounded-xl border border-orange-100/70 bg-orange-50/40 p-3">
                                                                        <div className="flex justify-between items-center mb-2">
                                                                            <label className="text-[10px] font-black text-gray-400 uppercase">{size}</label>
                                                                            <span className="rounded-md bg-white px-1.5 py-0.5 text-[9px] font-black text-gray-500">Curr: {oldTotal}</span>
                                                                        </div>
                                                                        <div className="relative mt-1">
                                                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-primary">+</div>
                                                                            <input
                                                                                type="text"
                                                                                value={stockAdditions[key] || ""}
                                                                                onChange={(e) => handleAdditionChange(key, e.target.value)}
                                                                                className="w-full rounded-lg border border-orange-100 bg-white py-2.5 pl-8 pr-3 text-lg font-black text-primary-dark shadow-inner outline-none transition-all placeholder:text-gray-300 focus:border-primary focus:ring-2 focus:ring-orange-100"
                                                                                placeholder="0"
                                                                            />
                                                                        </div>
                                                                        {added > 0 && (
                                                                            <p className="text-[10px] text-emerald-500 font-bold mt-2 text-right tracking-tight">
                                                                                New Total = {newTotalMatch}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="space-y-4 rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
                                            <div className="flex justify-between items-end">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase">Quantity to Add</label>
                                                    <p className="text-xs font-bold text-gray-500">Current Stock: <span className="text-slate-800">{selectedProduct.total_stock || 0}</span></p>
                                                </div>
                                                {parseInt(manualTotalStockAdd) > 0 && (
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase">New Total Stock</p>
                                                        <p className="text-xl font-black text-emerald-500">{(parseInt(selectedProduct.total_stock) || 0) + (parseInt(manualTotalStockAdd) || 0)}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-primary">+</div>
                                                <input
                                                    type="text"
                                                    value={manualTotalStockAdd}
                                                    onChange={(e) => setManualTotalStockAdd(e.target.value.replace(/[^0-9]/g, ''))}
                                                    placeholder="0"
                                                    className="w-full rounded-xl border border-orange-100 bg-orange-50/50 py-4 pl-12 pr-4 text-2xl font-black text-primary-dark shadow-inner outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-orange-100"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-end">
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        type="button"
                                        className="group flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-8 py-3.5 text-base font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                    >
                                        {isSaving ? (
                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                                        ) : (
                                            <>
                                                <FiSave className="text-lg transition-transform group-hover:scale-110" />
                                                <span>Confirm & Update Stock</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/30 p-8 text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-orange-200 shadow-sm">
                                <FiBox size={32} />
                            </div>
                            <h3 className="text-lg font-black text-secondary-dark">No Product Selected</h3>
                            <p className="mx-auto mt-2 max-w-xs text-sm font-medium text-stone-500">Please find and select a product from the left pane to add new stock to its inventory.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddStock;
