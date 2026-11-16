import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../../api";
import { resolveMediaUrl } from "../../utils/media";
import { toast } from "react-hot-toast";
import { QRCodeCanvas } from "qrcode.react";
import {
    FiArrowLeft,
    FiEdit,
    FiTrash2,
    FiBox,
    FiLayers,
    FiTrendingUp,
    FiPlus,
    FiStar
} from "react-icons/fi";
import { BsQrCode } from "react-icons/bs";

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeVariant, setActiveVariant] = useState(0);
    const [activeImage, setActiveImage] = useState(0);

    const fetchProduct = async () => {
        try {
            const response = await api.get(`/products/${id}`);
            setProduct(response.data);
            setLoading(false);
        } catch (error) {
            toast.error("Failed to load boutique creation.");
            navigate("/admin/products/all");
        }
    };

    useEffect(() => {
        fetchProduct();
    }, [id]);

    const handleDelete = async () => {
        if (!window.confirm("Delete this masterpiece?")) return;
        try {
            await api.delete(`/products/${id}`);
            toast.success("Creation removed.");
            navigate("/admin/products/all");
        } catch (error) {
            toast.error("Removal failed.");
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-bold">Revealing the craft...</p>
        </div>
    );

    const currentVariant = product.variants?.[activeVariant] || {};
    const variantImages = Array.isArray(currentVariant.images) ? currentVariant.images : [];
    const displayImages = variantImages.length > 0
        ? variantImages
        : currentVariant.image ? [currentVariant.image] : (product.images || []);
    const variantStock = product.variants?.length
        ? Number(currentVariant.stock ?? Object.values(currentVariant.sizesStock || {}).reduce((sum, quantity) => sum + (Number(quantity) || 0), 0))
        : Number(product.total_stock || 0);
    const variantPrice = Number(currentVariant.selling_price ?? currentVariant.offer_price ?? product.offer_price ?? product.mrp ?? 0);
    const variantMrp = Number(currentVariant.mrp ?? product.mrp ?? 0);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/admin/products/all" className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm">
                        <FiArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-slate-800">{product.name}</h1>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${product.status === 'Active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                {product.status}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium mt-1">Product ID: {product.product_code || `SP${product.id}`} • Artisan Collection</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link to={`/admin/products/edit/${id}`} className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 text-slate-700 rounded-xl font-bold transition-all hover:bg-gray-50 shadow-sm active:scale-95">
                        <FiEdit /> Edit Product
                    </Link>
                    <button onClick={handleDelete} className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-100 active:scale-95">
                        <FiTrash2 /> Delete
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Product Images */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-white p-3 sm:p-4 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden group">
                        <div className="aspect-[3/4] rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden bg-gray-50">
                            {displayImages.length > 0 ? (
                                <img src={resolveMediaUrl(displayImages[activeImage] || displayImages[0])} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">No images</div>
                            )}
                        </div>
                    </div>
                    {displayImages.length > 1 && (
                        <div className="grid grid-cols-4 gap-2 sm:gap-4 px-1 sm:px-2">
                            {displayImages.map((img, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveImage(i)}
                                    className={`aspect-square rounded-xl sm:rounded-2xl overflow-hidden border-2 transition-all shadow-sm ${activeImage === i ? 'border-blue-500 scale-95 ring-2 ring-blue-50' : 'border-white hover:border-blue-200 opacity-60 hover:opacity-100'}`}
                                >
                                    <img src={resolveMediaUrl(img)} alt="thumb" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Details & Stats */}
                <div className="lg:col-span-8 space-y-6 sm:space-y-8">
                    <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 sm:pb-8 border-b border-gray-50">
                            <div className="space-y-4 max-w-xl text-slate-800">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-blue-100">
                                        {product.category}
                                    </span>
                                    <div className="flex items-center gap-1 text-amber-500 font-bold text-xs sm:text-sm">
                                        ★ {product.rating} <span className="text-gray-300 font-medium">Boutique Standard</span>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 uppercase tracking-widest text-[10px] sm:text-xs">Description</h3>
                                <p className="text-slate-500 text-sm sm:text-base leading-relaxed font-medium">{product.description || "No description provided."}</p>
                            </div>
                            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 text-center min-w-[180px] sm:min-w-[200px] shadow-inner">
                                <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Commercials</p>
                                <div className="flex items-center justify-center gap-2">
                                    {variantMrp > variantPrice && <span className="text-gray-300 font-bold line-through text-xs sm:text-sm">₹{variantMrp.toLocaleString("en-IN")}</span>}
                                    <p className="text-2xl sm:text-3xl font-black text-blue-600">₹{variantPrice.toLocaleString("en-IN")}</p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Inventory</p>
                                    <p className="text-lg sm:text-xl font-black text-slate-800 mt-1">{variantStock} Units</p>
                                </div>
                            </div>
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 pt-6 sm:pt-8">
                            {[
                                { label: "Brand", value: product.brand },
                                { label: "Model", value: product.model_number },
                                { label: "Material", value: product.material_type || product.material },
                                { label: "Wood type", value: product.wood_type },
                                { label: "Colour", value: product.colour },
                                { label: "Finish", value: product.finish_type },
                                { label: "Dimensions (H × W × D)", value: [product.height, product.width, product.depth].filter(Boolean).join(" × ") },
                                { label: "Weight", value: product.weight ? `${product.weight} kg` : "" },
                                { label: "Seating capacity", value: product.seating_capacity },
                                { label: "Doors", value: product.doors },
                                { label: "Drawers", value: product.drawers },
                                { label: "Mattress size", value: product.mattress_size },
                                { label: "Warranty", value: product.warranty_period },
                                { label: "Origin", value: product.country_of_origin },
                            ].filter(s => s.value && s.value.toString().trim() !== "").map((spec, i) => (
                                <div key={i} className="space-y-1 p-3 sm:p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 hover:bg-white hover:shadow-sm transition-all cursor-default">
                                    <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">{spec.label}</p>
                                    <p className="text-xs sm:text-sm font-bold text-slate-700">{spec.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Variants Management */}
                        {product.variants?.length > 0 && (
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs">Available variants</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {product.variants.map((v, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => { setActiveVariant(idx); setActiveImage(0); }}
                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${activeVariant === idx ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-50/50' : 'bg-gray-50 border-gray-100 hover:border-blue-100'}`}
                                        >
                                            <div className="flex items-center gap-4 text-slate-800">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white bg-orange-100 text-xs font-black text-orange-700 shadow-inner">{(v.color || v.colorName || "V").slice(0, 1)}</div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-700 uppercase tracking-tight">{v.color || v.colorName || "Variant"}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                                        {[v.size, v.material].filter(Boolean).join(" · ") || v.selectedSizes?.join(", ") || "Standard"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-blue-600">
                                                    {Number(v.stock ?? Object.values(v.sizesStock || {}).reduce((sum, quantity) => sum + (Number(quantity) || 0), 0))} Units
                                                </p>
                                                {v.selling_price != null && <p className="mt-1 text-[10px] font-bold text-slate-500">₹{Number(v.selling_price).toLocaleString("en-IN")}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Product Passport (QR Code) */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs">Product Passport</h3>
                                <BsQrCode className="text-blue-500" size={18} />
                            </div>
                            <div className="flex flex-col items-center justify-center gap-4 bg-gray-50/50 p-6 rounded-[2rem] border border-dashed border-gray-200">
                                <div className="p-4 bg-white rounded-3xl shadow-sm border border-gray-100">
                                    <QRCodeCanvas
                                        value={window.location.href}
                                        size={120}
                                        level={"H"}
                                        includeMargin={false}
                                        className="rounded-lg"
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Digital Authenticity</p>
                                    <p className="text-[9px] font-bold text-blue-500 uppercase mt-1 tracking-tighter">Scan to verify creation</p>
                                </div>
                            </div>
                        </div>


                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
