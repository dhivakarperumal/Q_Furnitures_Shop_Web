import React, { useState } from "react";
import { createPortal } from "react-dom";
import { FiArrowLeft, FiSave, FiUser, FiMapPin, FiPhone, FiMail, FiTruck, FiCheckCircle, FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";
import imageCompression from "browser-image-compression";
import { FiStar, FiPackage, FiUploadCloud, FiTrash2 } from "react-icons/fi";
import { resolveMediaUrl } from "../../utils/media";

const AddDealerModal = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        contact: "",
        email: "",
        phone: "",
        location: "",
        status: "Pending",
        rating: "4.5",
        orders: "0",
        image: ""
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const options = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 800,
            useWebWorker: true,
        };

        try {
            const compressedFile = await imageCompression(file, options);
            const uploadData = new FormData();
            uploadData.append("image", compressedFile, file.name);
            const response = await api.post("/uploads/image", uploadData);
            setFormData(prev => ({ ...prev, image: response.data.url }));
            toast.success("Image uploaded and compressed!");
        } catch (error) {
            console.error("Dealer image upload failed:", error);
            toast.error(error.response?.data?.message || "Failed to upload image");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post("/dealers", formData);
            toast.success("New partnership request submitted successfully!");
            setTimeout(() => {
                if (onSuccess) onSuccess();
                onClose();
            }, 1000);
        } catch (error) {
            console.error("Dealer Submission Error:", error);
            toast.error(error.response?.data?.message || "Failed to submit request");
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[99] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 relative">
                {/* Header */}
                <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Add New Dealer</h1>
                        <p className="text-sm font-bold text-gray-400">Initialize a new wholesale partnership.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl text-gray-400 hover:text-red-500 transition-all shadow-sm active:scale-95"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <div className="p-8 sm:p-10">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Dealer Name */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Company / Dealer Name *</label>
                                <div className="relative">
                                    <FiTruck className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500" />
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="e.g. Silk Traditions Ltd"
                                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-500/20 transition-all font-bold text-slate-800 shadow-inner"
                                    />
                                </div>
                            </div>

                            {/* Contact Person */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Contact Person *</label>
                                <div className="relative">
                                    <FiUser className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500" />
                                    <input
                                        type="text"
                                        name="contact"
                                        required
                                        value={formData.contact}
                                        onChange={handleChange}
                                        placeholder="Manager Name"
                                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-500/20 transition-all font-bold text-slate-800 shadow-inner"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                                <div className="relative">
                                    <FiMail className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="dealer@company.com"
                                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-500/20 transition-all font-bold text-slate-800 shadow-inner"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number *</label>
                                <div className="relative">
                                    <FiPhone className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500" />
                                    <input
                                        type="tel"
                                        name="phone"
                                        required
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="+91 00000 00000"
                                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-500/20 transition-all font-bold text-slate-800 shadow-inner"
                                    />
                                </div>
                            </div>

                            {/* Location */}
                            <div className="md:col-span-2 space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Business Location *</label>
                                <div className="relative">
                                    <FiMapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500" />
                                    <input
                                        type="text"
                                        name="location"
                                        required
                                        value={formData.location}
                                        onChange={handleChange}
                                        placeholder="City, State"
                                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-500/20 transition-all font-bold text-slate-800 shadow-inner"
                                    />
                                </div>
                            </div>

                            {/* Rating */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Initial Rating (1-5)</label>
                                <div className="relative">
                                    <FiStar className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-500" />
                                    <input
                                        type="number"
                                        name="rating"
                                        min="1"
                                        max="5"
                                        step="0.1"
                                        value={formData.rating}
                                        onChange={handleChange}
                                        placeholder="4.5"
                                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-500/20 transition-all font-bold text-slate-800 shadow-inner"
                                    />
                                </div>
                            </div>

                            {/* Orders */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Total Orders</label>
                                <div className="relative">
                                    <FiPackage className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500" />
                                    <input
                                        type="number"
                                        name="orders"
                                        value={formData.orders}
                                        onChange={handleChange}
                                        placeholder="0"
                                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-500/20 transition-all font-bold text-slate-800 shadow-inner"
                                    />
                                </div>
                            </div>

                            {/* Image Upload */}
                            <div className="md:col-span-2 space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Dealer Profile Image</label>
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
                                        {formData.image ? (
                                            <>
                                                <img src={resolveMediaUrl(formData.image)} alt="Preview" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, image: "" }))}
                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <FiTrash2 className="text-white" size={20} />
                                                </button>
                                            </>
                                        ) : (
                                            <FiUploadCloud className="text-gray-300" size={24} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            id="dealer-image"
                                            className="hidden"
                                        />
                                        <label
                                            htmlFor="dealer-image"
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-gray-50 cursor-pointer transition-all shadow-sm active:scale-95"
                                        >
                                            <FiUploadCloud /> {formData.image ? "Change Image" : "Upload Image"}
                                        </label>
                                        <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-tight">PNG, JPG up to 500KB. Automatically compressed.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-50 flex items-center justify-end gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-8 py-4 text-sm font-black text-gray-400 uppercase tracking-widest hover:text-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center justify-center gap-3 bg-slate-900 border-4 border-white hover:bg-black disabled:bg-slate-400 text-white py-4 px-10 rounded-2xl text-lg font-black shadow-2xl transition-all active:scale-95"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <FiCheckCircle size={20} />
                                        <span>Create Partnership</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AddDealerModal;
