import React, { useState, useEffect } from "react";
import {
    FiArrowLeft,
    FiSave,
    FiTag,
    FiBox,
    FiLayers,
    FiImage,
    FiUploadCloud,
    FiTrash2,
    FiInfo,
    FiMaximize,
    FiScissors,
    FiPlus,
    FiDroplet,
    FiPercent,
    FiActivity,
    FiStar,
    FiHash
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";
import { toast, Toaster } from "react-hot-toast";
import { resolveMediaUrl } from "../../utils/media";

// Helper: Color to Name Utility
const boutiqueColors = [
    { name: "Pure Red", hex: "#FF0000" },
    { name: "Crimson", hex: "#DC143C" },
    { name: "Deep Maroon", hex: "#800000" },
    { name: "Rose Pink", hex: "#FFC0CB" },
    { name: "Hot Pink", hex: "#FF69B4" },
    { name: "Magenta", hex: "#FF00FF" },
    { name: "Royal Purple", hex: "#800080" },
    { name: "Violet", hex: "#EE82EE" },
    { name: "Indigo", hex: "#4B0082" },
    { name: "Navy Blue", hex: "#000080" },
    { name: "Royal Blue", hex: "#4169E1" },
    { name: "Sky Blue", hex: "#87CEEB" },
    { name: "Teal", hex: "#008080" },
    { name: "Cyan", hex: "#00FFFF" },
    { name: "Emerald Green", hex: "#50C878" },
    { name: "Forest Green", hex: "#228B22" },
    { name: "Olive Green", hex: "#808000" },
    { name: "Lime Green", hex: "#32CD32" },
    { name: "Golden Yellow", hex: "#FFD700" },
    { name: "Mustard", hex: "#FFDB58" },
    { name: "Bright Orange", hex: "#FFA500" },
    { name: "Coral", hex: "#FF7F50" },
    { name: "Peach", hex: "#FFDAB9" },
    { name: "Beige", hex: "#F5F5DC" },
    { name: "Cream", hex: "#FFFDD0" },
    { name: "Pure White", hex: "#FFFFFF" },
    { name: "Jet Black", hex: "#000000" },
    { name: "Steel Grey", hex: "#808080" },
    { name: "Silver Tone", hex: "#C0C0C0" },
    { name: "Chocolate Brown", hex: "#8B4513" },
    { name: "Copper", hex: "#B87333" },
    { name: "Terracotta", hex: "#E2725B" },
    { name: "Turquoise", hex: "#40E0D0" }
];

const getNearestColorName = (hex) => {
    hex = hex.replace("#", "");
    const r1 = parseInt(hex.substring(0, 2), 16);
    const g1 = parseInt(hex.substring(2, 4), 16);
    const b1 = parseInt(hex.substring(4, 6), 16);

    let minDistance = Infinity;
    let nearestName = "Custom Shade";

    boutiqueColors.forEach(color => {
        const h = color.hex.replace("#", "");
        const r2 = parseInt(h.substring(0, 2), 16);
        const g2 = parseInt(h.substring(2, 4), 16);
        const b2 = parseInt(h.substring(4, 6), 16);

        const distance = Math.sqrt(
            Math.pow(r2 - r1, 2) +
            Math.pow(g2 - g1, 2) +
            Math.pow(b2 - b1, 2)
        );

        if (distance < minDistance) {
            minDistance = distance;
            nearestName = color.name;
        }
    });

    return nearestName;
};

const resolveImageUrl = (image) => {
    return resolveMediaUrl(typeof image === "string" ? image.replace(/\\/g, "/") : image);
};

const AddProducts = () => {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);

    // Main State
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        category: "Saree",
        subcategory: "",
        mrp: "",
        offer: "",
        offer_price: "",
        product_code: "",
        total_stock: "0",
        rating: "5",
        status: "Active",
        material: "",
        wash_care: "Dry Clean Only",
        // Traditional Wear Specs
        saree_length: "5.5 Meters",
        blouse_length: "0.8 Meters",
        top_length: "",
        bottom_length: "",
        dupatta_length: "",
        gown_length: "",
        sleeve_type: "",
        neck_type: "",
        fit_type: "",
        work_type: "Embroidered",
        zari_color: "Gold Zari",
        age: "",
    });

    const [variants, setVariants] = useState([
        {
            color: "#3b82f6",
            colorName: "",
            images: [],
            selectedSizes: [],
            sizesStock: {}
        }
    ]);

    // Track if total stock was manually edited
    const [isStockManuallyEdited, setIsStockManuallyEdited] = useState(false);

    // 1. Auto-calculate Offer Price whenever MRP or Offer % changes
    useEffect(() => {
        const mrpValue = parseFloat(formData.mrp) || 0;
        const offerValue = parseFloat(formData.offer) || 0;
        if (mrpValue > 0) {
            const calculatedPrice = mrpValue - (mrpValue * (offerValue / 100));
            setFormData(prev => ({ ...prev, offer_price: Math.round(calculatedPrice).toString() }));
        } else {
            setFormData(prev => ({ ...prev, offer_price: "0" }));
        }
    }, [formData.mrp, formData.offer]);

    // 2. Auto-calculate Total Stock whenever variants or sizesStock change
    useEffect(() => {
        if (!isStockManuallyEdited) {
            let total = 0;
            variants.forEach(variant => {
                Object.values(variant.sizesStock || {}).forEach(qty => {
                    total += parseInt(qty) || 0;
                });
            });
            setFormData(prev => ({ ...prev, total_stock: total.toString() }));
        }
    }, [variants, isStockManuallyEdited]);

    // Size Logic based on Category
    const getSizesByCategory = () => {
        switch (formData.category) {
            case "Saree": return ["Free Size"];
            case "Lehenga":
            case "Salwar":
            case "Gown": return ["XS", "S", "M", "L", "XL", "XXL"];
            case "Material": return ["Free Size"];
            default: return [];
        }
    };

    const sizeOptions = getSizesByCategory();

    useEffect(() => {
        const fetchEssentialData = async () => {
            try {
                if (isEdit) {
                    const [catRes, editRes] = await Promise.all([
                        api.get("/categories"),
                        api.get(`/products/${id}`)
                    ]);

                    setCategories(Array.isArray(catRes.data) ? catRes.data : []);
                    try {
                        const p = editRes.data;
                        setFormData({
                            name: p.name || "",
                            description: p.description || "",
                            category: p.category || "Saree",
                            subcategory: p.subcategory || "",
                            mrp: p.mrp?.toString() || "",
                            offer: p.offer?.toString() || "",
                            offer_price: p.offer_price?.toString() || "",
                            product_code: p.product_code || "",
                            total_stock: p.total_stock?.toString() || "0",
                            rating: p.rating?.toString() || "5",
                            status: p.status || "Active",
                            material: p.material || "",
                            wash_care: p.wash_care || "Dry Clean Only",
                            saree_length: p.saree_length || "",
                            blouse_length: p.blouse_length || "",
                            top_length: p.top_length || "",
                            bottom_length: p.bottom_length || "",
                            dupatta_length: p.dupatta_length || "",
                            gown_length: p.gown_length || "",
                            sleeve_type: p.sleeve_type || "",
                            neck_type: p.neck_type || "",
                            fit_type: p.fit_type || "",
                            work_type: p.work_type || "",
                            zari_color: p.zari_color || "",
                            age: p.age || "",
                        });
                        if (p.variants) setVariants(Array.isArray(p.variants) ? p.variants : JSON.parse(p.variants));
                    } catch (e) {
                        toast.error("Failed to fetch product details.");
                    } finally {
                        setFetching(false);
                    }
                } else {
                    const [catRes, codeRes] = await Promise.all([
                        api.get("/categories"),
                        api.get("/products/latest-code")
                    ]);
                    
                    setCategories(Array.isArray(catRes.data) ? catRes.data : []);
                    setFormData(prev => ({
                        ...prev,
                        category: Array.isArray(catRes.data) && catRes.data[0]?.name ? catRes.data[0].name : "Saree",
                        product_code: codeRes.data.latestCode || "SP001"
                    }));
                    setFetching(false);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                setFetching(false);
            }
        };
        fetchEssentialData();
    }, [id, isEdit]);

    // Update Subcategories when Category changes
    useEffect(() => {
        const selectedCat = categories.find(c => c.name === formData.category);
        if (selectedCat && selectedCat.subcategory) {
            setSubcategories(selectedCat.subcategory);
            // Only auto-select first subcat if it's currently empty
            if (!formData.subcategory) {
                setFormData(prev => ({ ...prev, subcategory: selectedCat.subcategory[0] || "" }));
            }
        } else {
            setSubcategories([]);
            if (!isEdit) setFormData(prev => ({ ...prev, subcategory: "" }));
        }
    }, [formData.category, categories, isEdit]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        if (name === "total_stock") setIsStockManuallyEdited(true);
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Reset stock to auto-calculate
    const resetStockCalculation = () => {
        setIsStockManuallyEdited(false);
    };

    // Variant Operations
    const addVariant = () => {
        const sizes = getSizesByCategory();
        const initialVariant = {
            color: "#3b82f6",
            colorName: "",
            images: [],
            selectedSizes: sizes.length === 1 ? [sizes[0]] : [],
            sizesStock: sizes.length === 1 ? { [sizes[0]]: 0 } : {}
        };
        setVariants([...variants, initialVariant]);
    };

    const removeVariant = (index) => {
        if (variants.length > 1) setVariants(variants.filter((_, i) => i !== index));
    };

    const handleVariantChange = (index, field, value) => {
        const updated = [...variants];
        const newVariant = { ...updated[index], [field]: value };

        // Auto-set colorName if color is updated
        if (field === "color") {
            newVariant.colorName = getNearestColorName(value);
        }

        updated[index] = newVariant;
        setVariants(updated);
    };

    const toggleSize = (vIndex, size) => {
        const updated = [...variants];
        const selected = updated[vIndex].selectedSizes || [];
        if (selected.includes(size)) {
            updated[vIndex].selectedSizes = selected.filter(s => s !== size);
            delete updated[vIndex].sizesStock[size];
        } else {
            updated[vIndex].selectedSizes = [...selected, size];
            if (!updated[vIndex].sizesStock) updated[vIndex].sizesStock = {};
            updated[vIndex].sizesStock[size] = 0; // Default stock 0
        }
        setVariants(updated);
    };

    const handleStockChange = (vIndex, size, value) => {
        const updated = [...variants];
        if (!updated[vIndex].sizesStock) updated[vIndex].sizesStock = {};
        updated[vIndex].sizesStock[size] = parseInt(value) || 0;
        setVariants(updated);
    };

    const handleVariantImageUpload = async (vIndex, e) => {
        try {
            const files = Array.from(e.target.files || []);

            if (!files.length) return;

            if ((variants[vIndex].images?.length || 0) + files.length > 5) {
                toast.error("Boutique limit: Max 5 images per shade.");
                return;
            }

            const formData = new FormData();
            files.forEach((file) => {
                formData.append("images", file);
            });

            const response = await api.post("/products/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });

            const uploadedImages = response.data?.images || [];
            if (!uploadedImages.length) {
                toast.error("No images were saved.");
                return;
            }

            const updated = [...variants];
            updated[vIndex].images = [...(updated[vIndex].images || []), ...uploadedImages];
            setVariants(updated);
            toast.success(`Success! ${uploadedImages.length} boutique images added.`);

            e.target.value = "";
        } catch (error) {
            console.error("Product image upload error:", error);
            toast.error(error.response?.data?.message || "Upload failed.");
        }
    };

    const removeVariantImage = (vIndex, imgIndex) => {
        const updated = [...variants];
        updated[vIndex].images = updated[vIndex].images.filter((_, i) => i !== imgIndex);
        setVariants(updated);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!formData.name || !formData.category || !formData.mrp || !formData.age) {
            toast.error("Please fill in the essentials.");
            return;
        }

        setLoading(true);
        try {
            const variantStockTotal = variants.reduce(
                (total, variant) => total + Object.values(variant.sizesStock || {}).reduce(
                    (stockTotal, quantity) => stockTotal + (parseInt(quantity, 10) || 0),
                    0,
                ),
                0,
            );
            const hasVariantStock = variants.some(
                (variant) => Object.keys(variant.sizesStock || {}).length > 0,
            );
            const finalTotalStock = isStockManuallyEdited
                ? parseInt(formData.total_stock, 10) || 0
                : hasVariantStock
                    ? variantStockTotal
                    : parseInt(formData.total_stock, 10) || 0;
            const finalData = {
                ...formData,
                total_stock: finalTotalStock.toString(),
                variants,
            };
            if (isEdit) {
                await api.put(`/products/${id}`, finalData);
                toast.success("Artisan masterpiece updated!");
            } else {
                await api.post("/products", finalData);
                toast.success("Artisan piece listed successfully!");
            }
            setTimeout(() => navigate("/admin/products/all"), 1500);
        } catch (error) {
            console.error("Submit error:", error);
            toast.error(error.response?.data?.message || "Operation failed.");
            setLoading(false);
        }
    };

    if (fetching) return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#1F0A3C]/20 border-t-[#1F0A3C] rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-semibold">Loading...</p>
        </div>
    );
    return (
        <div className="space-y-6 pb-20">

            {/* Page Header */}
            <div className="flex items-center gap-3 pb-2">
                <button onClick={() => navigate(-1)} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-[#1F0A3C] hover:border-[#1F0A3C]/30 transition-all shadow-sm">
                    <FiArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-[#1F0A3C]">{isEdit ? 'Edit Product' : 'Add New Product'}</h1>
                    <p className="text-xs text-gray-400">Fill in product details below</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-5">
                    {/* Primary Categorization & Identity */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-[#1F0A3C]/5">
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 bg-[#1F0A3C] text-white rounded-lg"><FiLayers size={15} /></span>
                                <h2 className="text-sm font-bold text-[#1F0A3C]">Product Foundation</h2>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#1F0A3C]/10 rounded-lg border border-[#1F0A3C]/15">
                                <FiHash className="text-[#1F0A3C] w-3 h-3" />
                                <span className="text-xs font-bold text-[#1F0A3C]">{formData.product_code || 'Generating...'}</span>
                            </div>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Category *</label>
                                    <select name="category" value={formData.category} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-[#1F0A3C]/40 focus:ring-2 focus:ring-[#1F0A3C]/10 transition-all text-sm font-semibold text-gray-800 cursor-pointer appearance-none">
                                        {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1"><FiStar className="text-amber-500 w-3 h-3" /> Rating</label>
                                    <select name="rating" value={formData.rating} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-[#1F0A3C]/40 focus:ring-2 focus:ring-[#1F0A3C]/10 transition-all text-sm font-semibold text-gray-800 cursor-pointer appearance-none">
                                        <option value="1">1 Star</option>
                                        <option value="2">2 Stars</option>
                                        <option value="3">3 Stars</option>
                                        <option value="4">4 Stars</option>
                                        <option value="5">5 Stars (Excellent)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Age Group *</label>
                                <select
                                    name="age"
                                    value={formData.age}
                                    onChange={handleFormChange}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-[#1F0A3C]/40 focus:ring-2 focus:ring-[#1F0A3C]/10 transition-all text-sm font-semibold text-gray-800 cursor-pointer appearance-none"
                                >
                                    <option value="">Select Age Group</option>
                                    <option value="Infant (0–1)">Infant (0–1)</option>
                                    <option value="Toddler (1–3)">Toddler (1–3)</option>
                                    <option value="Kids (3–5)">Kids (3–5)</option>
                                    <option value="Kids (5–7)">Kids (5–7)</option>
                                    <option value="Kids (7–10)">Kids (7–10)</option>
                                    <option value="Teen (10–15)">Teen (10–15)</option>
                                    <option value="Teen (15–20)">Teen (15–20)</option>
                                    <option value="Adult (20+)">Adult (20+)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Product Name *</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleFormChange} placeholder="e.g. Handwoven Banarasi Silk" className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-[#1F0A3C]/40 focus:ring-2 focus:ring-[#1F0A3C]/10 transition-all text-sm font-semibold text-gray-800" required />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</label>
                                    <textarea name="description" value={formData.description} onChange={handleFormChange} rows="3" placeholder="Describe the product..." className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-[#1F0A3C]/40 focus:ring-2 focus:ring-[#1F0A3C]/10 transition-all text-sm text-gray-600 resize-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pricing & Stock */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-[#1F0A3C]/5">
                            <span className="p-1.5 bg-[#1F0A3C] text-white rounded-lg"><FaRupeeSign size={15} /></span>
                            <h2 className="text-sm font-bold text-[#1F0A3C]">Pricing & Stock</h2>
                        </div>
                        <div className="p-5">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">MRP *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₹</span>
                                        <input type="number" name="mrp" value={formData.mrp} onChange={handleFormChange} className="w-full pl-7 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-[#1F0A3C]/40 focus:ring-2 focus:ring-[#1F0A3C]/10 transition-all text-sm font-bold text-gray-900" required />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Offer %</label>
                                    <div className="relative">
                                        <FiPercent className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 w-3.5 h-3.5" />
                                        <input type="number" name="offer" value={formData.offer} onChange={handleFormChange} className="w-full pl-7 pr-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg outline-none focus:bg-white focus:border-amber-400 transition-all text-sm font-bold text-amber-700" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Offer Price</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-sm">₹</span>
                                        <input type="number" value={formData.offer_price} readOnly className="w-full pl-7 pr-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-bold text-emerald-700 cursor-not-allowed" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                                        Total Stock
                                        {isStockManuallyEdited && (
                                            <button onClick={resetStockCalculation} className="text-[9px] bg-[#1F0A3C]/10 text-[#1F0A3C] px-1.5 py-0.5 rounded hover:bg-[#1F0A3C] hover:text-white transition-colors uppercase tracking-widest">Auto</button>
                                        )}
                                    </label>
                                    <div className="relative">
                                        <FiActivity className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isStockManuallyEdited ? 'text-amber-500' : 'text-[#1F0A3C]'}`} />
                                        <input type="number" name="total_stock" value={formData.total_stock} onChange={handleFormChange} className={`w-full pl-7 pr-3 py-2.5 border rounded-lg outline-none transition-all text-sm font-bold ${isStockManuallyEdited ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-[#1F0A3C]/5 border-[#1F0A3C]/20 text-[#1F0A3C]'}`} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Vitals & Specs */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-[#1F0A3C]/5">
                            <span className="p-1.5 bg-[#1F0A3C] text-white rounded-lg"><FiMaximize size={15} /></span>
                            <h2 className="text-sm font-bold text-[#1F0A3C]">Vitals & Artisanship</h2>
                        </div>

                        <div className="p-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Core Fabric</label>
                                    <input type="text" name="material" value={formData.material} onChange={handleFormChange} placeholder="Mulberry Silk" className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#1F0A3C]/40 focus:ring-2 focus:ring-[#1F0A3C]/10 transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Embroidery / Work</label>
                                    <input type="text" name="work_type" value={formData.work_type} onChange={handleFormChange} placeholder="Zardozi" className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#1F0A3C]/40 focus:ring-2 focus:ring-[#1F0A3C]/10 transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1"><FiDroplet className="text-blue-500 w-3 h-3" /> Wash Care</label>
                                    <select name="wash_care" value={formData.wash_care} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#1F0A3C]/40 focus:ring-2 focus:ring-[#1F0A3C]/10 transition-all cursor-pointer appearance-none">
                                        <option value="Dry Clean Only">Dry Clean Only</option>
                                        <option value="Mild Hand Wash">Mild Hand Wash</option>
                                        <option value="Cold Machine Wash">Cold Machine Wash</option>
                                        <option value="Petrol Wash Specialized">Petrol Wash Specialized</option>
                                        <option value="No Bleach, Line Dry">No Bleach, Line Dry</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Subcategory</label>
                                    <select name="subcategory" value={formData.subcategory} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#1F0A3C]/40 focus:ring-2 focus:ring-[#1F0A3C]/10 transition-all cursor-pointer appearance-none disabled:opacity-40" disabled={subcategories.length === 0}>
                                        <option value="">Default</option>
                                        {subcategories.map((sub, i) => <option key={i} value={sub}>{sub}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Size & Fit Section */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-[#1F0A3C]/5">
                            <span className="p-1.5 bg-[#1F0A3C] text-white rounded-lg"><FiScissors size={15} /></span>
                            <h2 className="text-sm font-bold text-[#1F0A3C]">Size & Fit</h2>
                        </div>
                        <div className="p-5 space-y-4">
                            {formData.category === "Saree" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Saree Length</label>
                                        <input
                                            type="text"
                                            name="saree_length"
                                            value={formData.saree_length}
                                            onChange={handleFormChange}
                                            placeholder="e.g. 5.5 Meters"
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#1F0A3C]/40 focus:ring-2 focus:ring-[#1F0A3C]/10 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Blouse Length</label>
                                        <input
                                            type="text"
                                            name="blouse_length"
                                            value={formData.blouse_length}
                                            onChange={handleFormChange}
                                            placeholder="e.g. 0.8 Meters"
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#1F0A3C]/40 focus:ring-2 focus:ring-[#1F0A3C]/10 transition-all"
                                        />
                                    </div>
                                </div>
                            )}

                            {(formData.category === "Lehenga" ||
                                formData.category === "Salwar" ||
                                formData.category === "Material") && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Top / Lehenga Length</label>
                                            <input
                                                type="text"
                                                name="top_length"
                                                value={formData.top_length}
                                                onChange={handleFormChange}
                                                placeholder="Length"
                                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#1F0A3C]/40 focus:ring-2 focus:ring-[#1F0A3C]/10 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Bottom Length</label>
                                            <input
                                                type="text"
                                                name="bottom_length"
                                                value={formData.bottom_length}
                                                onChange={handleFormChange}
                                                placeholder="Length"
                                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#1F0A3C]/40 focus:ring-2 focus:ring-[#1F0A3C]/10 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Dupatta Length</label>
                                            <input
                                                type="text"
                                                name="dupatta_length"
                                                value={formData.dupatta_length}
                                                onChange={handleFormChange}
                                                placeholder="Length"
                                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#1F0A3C]/40 focus:ring-2 focus:ring-[#1F0A3C]/10 transition-all"
                                            />
                                        </div>
                                    </div>
                                )}

                            {formData.category === "Gown" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Gown Length</label>
                                        <input
                                            type="text"
                                            name="gown_length"
                                            value={formData.gown_length}
                                            onChange={handleFormChange}
                                            placeholder="Length"
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#1F0A3C]/40 focus:ring-2 focus:ring-[#1F0A3C]/10 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Sleeve Type</label>
                                        <input
                                            type="text"
                                            name="sleeve_type"
                                            value={formData.sleeve_type}
                                            onChange={handleFormChange}
                                            placeholder="Full Sleeve / Half Sleeve"
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#1F0A3C]/40 focus:ring-2 focus:ring-[#1F0A3C]/10 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Neck Type</label>
                                        <input
                                            type="text"
                                            name="neck_type"
                                            value={formData.neck_type}
                                            onChange={handleFormChange}
                                            placeholder="V-Neck / Round Neck"
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#1F0A3C]/40 focus:ring-2 focus:ring-[#1F0A3C]/10 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Fit Type</label>
                                        <input
                                            type="text"
                                            name="fit_type"
                                            value={formData.fit_type}
                                            onChange={handleFormChange}
                                            placeholder="Regular Fit / Slim Fit"
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-800 outline-none focus:bg-white focus:border-[#1F0A3C]/40 focus:ring-2 focus:ring-[#1F0A3C]/10 transition-all"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Inventory Manager */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between sticky  z-20 bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center  gap-2">
                            <FiBox className="text-[#1F0A3C] w-4 h-4" />
                            <h3 className="text-sm font-bold text-[#1F0A3C] uppercase tracking-wider">Shade & Inventory</h3>
                        </div>
                        <button type="button" onClick={addVariant} className="bg-[#1F0A3C] text-white p-1.5 rounded-lg active:scale-90 transition-all shadow hover:bg-[#2d0f57]"><FiPlus size={15} /></button>
                    </div>

                    {variants.map((v, vIndex) => (
                        <div key={vIndex} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden group">
                            <div className="flex items-center justify-between px-4 py-3 bg-[#1F0A3C]/5 border-b border-gray-100">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <input
                                        type="color"
                                        value={v.color}
                                        onChange={(e) => handleVariantChange(vIndex, "color", e.target.value)}
                                        className="w-8 h-8 rounded-lg border-2 border-white shadow cursor-pointer flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <select
                                            value={v.colorName}
                                            onChange={(e) => {
                                                const selected = boutiqueColors.find(bc => bc.name === e.target.value);
                                                if (selected) {
                                                    handleVariantChange(vIndex, "color", selected.hex);
                                                    handleVariantChange(vIndex, "colorName", selected.name);
                                                } else {
                                                    handleVariantChange(vIndex, "colorName", e.target.value);
                                                }
                                            }}
                                            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 outline-none focus:border-[#1F0A3C]/40 transition-all cursor-pointer appearance-none"
                                        >
                                            <option value="">Select Shade</option>
                                            {boutiqueColors.map(bc => <option key={bc.hex} value={bc.name}>{bc.name}</option>)}
                                            {v.colorName && !boutiqueColors.find(bc => bc.name === v.colorName) && <option value={v.colorName}>{v.colorName}</option>}
                                        </select>
                                        <p className="text-[9px] text-gray-400 mt-0.5 ml-0.5">Hex: <span className="font-bold text-[#1F0A3C]">{v.color}</span></p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => removeVariant(vIndex)} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1 flex-shrink-0"><FiTrash2 size={14} /></button>
                            </div>

                            <div className="px-4 pb-4 pt-3 space-y-3">
                                {/* Stock by Size */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock by Size</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {sizeOptions.map(sz => (
                                            <button key={sz} type="button" onClick={() => toggleSize(vIndex, sz)} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${v.selectedSizes.includes(sz) ? 'bg-[#1F0A3C] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{sz}</button>
                                        ))}
                                    </div>
                                    {v.selectedSizes.length > 0 && (
                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            {v.selectedSizes.map(sz => (
                                                <div key={sz} className="bg-[#1F0A3C]/5 border border-[#1F0A3C]/15 p-2 rounded-lg flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[9px] font-bold text-[#1F0A3C]/60 uppercase mb-0.5">{sz}</p>
                                                        <input type="number" value={v.sizesStock[sz]} onChange={(e) => handleStockChange(vIndex, sz, e.target.value)} className="w-full bg-transparent border-none outline-none p-0 text-sm font-bold text-[#1F0A3C] focus:ring-0" />
                                                    </div>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#1F0A3C]/30"></div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Images */}
                                <div className="grid grid-cols-3 gap-2">
                                    {v.images.slice(0, 5).map((img, iIndex) => (
                                        <div key={iIndex} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-50 border border-gray-200 group/img">
                                            <img src={resolveImageUrl(img)} alt="Product preview" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" onError={(e) => { e.currentTarget.style.opacity = "0.35"; }} />
                                            <button type="button" onClick={() => removeVariantImage(vIndex, iIndex)} className="absolute inset-0 bg-red-600/70 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"><FiTrash2 size={13} /></button>
                                        </div>
                                    ))}
                                    {v.images.length < 5 && (
                                        <label className="flex flex-col items-center justify-center aspect-[3/4] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:bg-[#1F0A3C]/5 hover:border-[#1F0A3C]/40 group/label transition-all">
                                            <FiUploadCloud size={18} className="text-gray-300 group-hover/label:text-[#1F0A3C] transition-colors" />
                                            <input type="file" multiple className="hidden" accept="image/*" onChange={(e) => handleVariantImageUpload(vIndex, e)} />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom Global Action Button */}
                <div className="lg:col-span-3 pt-5 pb-10 border-t border-gray-200 mt-2">
                    <div className="flex items-center justify-end gap-3">
                        <button type="button" onClick={() => navigate(-1)} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 bg-[#1F0A3C] hover:bg-[#2d0f57] disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 px-6 rounded-xl text-sm font-semibold shadow-lg transition-all active:scale-95"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Saving...</span>
                                </div>
                            ) : (
                                <>
                                    <FiSave size={15} />
                                    <span>{isEdit ? 'Update Product' : 'Add Product'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AddProducts;