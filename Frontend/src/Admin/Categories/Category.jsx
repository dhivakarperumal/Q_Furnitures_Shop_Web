import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import api from "../../api";
import {
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiX,
    FiImage,
    FiUploadCloud,
    FiSearch,
    FiGrid,
    FiList,
    FiChevronLeft,
    FiChevronRight,
    FiCheckCircle,
    FiAlertCircle,
    FiBox,
    FiLayers,
    FiFilter,
    FiDownload,
    FiChevronDown
} from "react-icons/fi";
import { toast, Toaster } from "react-hot-toast";
import { useAuth } from "../../PrivateRouter/AuthContext";
import { resolveMediaUrl } from "../../utils/media";

const Category = () => {
    const { user } = useAuth();
    // ---- Global State ----
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const response = await api.get("/categories");
            setCategories(response.data);
        } catch (error) {
            console.error("Failed to fetch categories:", error);
        } finally {
            setLoading(false);
        }
    };

    // ---- View & Pagination State ----
    const [viewMode, setViewMode] = useState("table"); 
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // ---- Modal State ----
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        catId: "",
        name: "",
        description: "",
        subcategory: "",
        images: []
    });

    const [subcategories, setSubcategories] = useState([]);
    const [subInput, setSubInput] = useState("");

    // ---- Derived Data (Search & Pagination) ----
    const filteredCategories = useMemo(() => {
        return categories.filter(cat => {
            const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  cat.catId.toLowerCase().includes(searchQuery.toLowerCase());
            const catStatus = cat.status || 'Active';
            const matchesStatus = statusFilter === 'All' || catStatus === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [categories, searchQuery, statusFilter]);

    const totalPages = Math.ceil(filteredCategories.length / itemsPerPage) || 1;
    const currentCategories = filteredCategories.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Stats calculations
    const activeCount = categories.filter(c => (c.status || 'Active') === 'Active').length;
    const inactiveCount = categories.filter(c => c.status === 'Inactive').length;

    // ---- Event Handlers ----
    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    const handleAddSubcategory = (e) => {
        if (e.key === 'Enter' && subInput.trim()) {
            e.preventDefault();
            if (!subcategories.includes(subInput.trim())) {
                setSubcategories([...subcategories, subInput.trim()]);
            }
            setSubInput("");
        }
    };

    const removeSubcategory = (subToRemove) => {
        setSubcategories(subcategories.filter(sub => sub !== subToRemove));
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageUpload = async (e) => {
        try {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;

            const uploadData = new FormData();
            files.forEach((file) => uploadData.append("images", file));
            const response = await api.post("/uploads/images", uploadData);
            const imagesArray = response.data?.images;
            if (!Array.isArray(imagesArray) || !imagesArray.length) {
                throw new Error("The server did not return uploaded image paths.");
            }

            setFormData((p) => ({
                ...p,
                images: [...(Array.isArray(p.images) ? p.images : []), ...imagesArray],
            }));
            toast.success("Images added!");
            e.target.value = "";
        } catch (error) {
            console.error("Image upload failed:", error);
            toast.error(error.response?.data?.message || error.message || "Image upload failed");
        }
    };

    const removeImage = (indexToRemove) => {
        setFormData(p => ({
            ...p,
            images: p.images.filter((_, idx) => idx !== indexToRemove)
        }));
    };

    const handleSaveCategory = async () => {
        if (!formData.catId || !formData.name) return;

        const newCatData = {
            ...formData,
            subcategory: subcategories,
            user_id: user?.user_id || formData.user_id || null,
        };

        try {
            if (isEditing) {
                await api.put(`/categories/${formData.catId}`, newCatData);
                setCategories(categories.map(cat =>
                    cat.catId === formData.catId ? { ...newCatData, id: cat.id } : cat
                ));
            } else {
                const response = await api.post("/categories", newCatData);
                setCategories([{ ...newCatData, id: response.data.id }, ...categories]);
                toast.success("Category created successfully!");
            }
            setIsModalOpen(false);
            resetModalForm();
        } catch (error) {
            console.error("Failed to save category:", error);
            toast.error(error.response?.data?.message || "Failed to save category.");
        }
    };

    const handleDeleteCategory = async (catIdToDelete) => {
        if (window.confirm("Are you sure you want to delete this category?")) {
            try {
                await api.delete(`/categories/${catIdToDelete}`);
                setCategories(categories.filter(cat => cat.catId !== catIdToDelete));

                if (currentCategories.length === 1 && currentPage > 1) {
                    setCurrentPage(currentPage - 1);
                }
            } catch (error) {
                console.error("Failed to delete category:", error);
                alert("Failed to delete category.");
            }
        }
    };

    const resetModalForm = () => {
        setFormData({ catId: "", name: "", description: "", subcategory: "", images: [] });
        setSubcategories([]);
        setIsEditing(false);
    };

    const openAddModal = () => {
        let nextId = "CAT001";
        if (categories.length > 0) {
            const existingIds = categories.map(c => {
                const match = c.catId.match(/\d+/);
                return match ? parseInt(match[0], 10) : 0;
            });
            const maxId = Math.max(...existingIds);
            nextId = `CAT${String(maxId + 1).padStart(3, '0')}`;
        }
        resetModalForm();
        setFormData(prev => ({ ...prev, catId: nextId }));
        setIsModalOpen(true);
    };

    const openEditModal = (category) => {
        setFormData({
            catId: category.catId,
            name: category.name,
            description: category.description,
            subcategory: "",
            images: Array.isArray(category.images) ? category.images : (category.images ? [category.images] : [])
        });
        setSubcategories(category.subcategory || []);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    // Helper for dummy date formatting if missing
    const formatDate = (dateString) => {
        if (!dateString) {
            return {
                date: "20 May 2024",
                time: "10:30 AM"
            };
        }
        const d = new Date(dateString);
        return {
            date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
    };

    // ---- Renderers ----
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-screen pb-20 font-sans">
            <Toaster position="top-right" />

           

            {/* Stats Cards Row */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-orange-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
                    <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-primary-light to-primary-dark" />
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-orange-200/70 transition-transform duration-200 group-hover:scale-105">
                        <FiBox className="text-xl" />
                    </div>
                    <div className="relative z-10">
                        <p className="mb-1 text-xs font-bold tracking-wide text-secondary-light">Total Categories</p>
                        <h3 className="mb-1 text-3xl font-black leading-none text-secondary-dark">{categories.length}</h3>
                        <p className="text-[10px] font-medium text-stone-500">All category collections</p>
                    </div>
                    <FiBox className="pointer-events-none absolute -right-1 bottom-1 text-orange-300/20" size={60} />
                </div>
                <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-emerald-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
                    <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-200/70 transition-transform duration-200 group-hover:scale-105">
                        <FiCheckCircle className="text-xl" />
                    </div>
                    <div className="relative z-10">
                        <p className="mb-1 text-xs font-bold tracking-wide text-secondary-light">Active</p>
                        <h3 className="mb-1 text-3xl font-black leading-none text-secondary-dark">{activeCount}</h3>
                        <p className="text-[10px] font-medium text-stone-500">Active collections</p>
                    </div>
                    <FiCheckCircle className="pointer-events-none absolute -right-1 bottom-1 text-emerald-300/20" size={60} />
                </div>
                <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-amber-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-amber-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
                    <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-amber-400 to-amber-600" />
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-200/70 transition-transform duration-200 group-hover:scale-105">
                        <FiAlertCircle className="text-xl" />
                    </div>
                    <div className="relative z-10">
                        <p className="mb-1 text-xs font-bold tracking-wide text-secondary-light">Inactive</p>
                        <h3 className="mb-1 text-3xl font-black leading-none text-secondary-dark">{inactiveCount}</h3>
                        <p className="text-[10px] font-medium text-stone-500">Inactive collections</p>
                    </div>
                    <FiAlertCircle className="pointer-events-none absolute -right-1 bottom-1 text-amber-300/20" size={60} />
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                    <input
                        type="text"
                        placeholder="Search categories by name, ID..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 outline-none focus:border-primary focus:ring-2 focus:ring-orange-100 transition-all font-medium placeholder:text-gray-400"
                    />
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            className="appearance-none bg-white border border-gray-200 text-sm font-bold text-gray-600 pl-4 pr-10 py-2.5 rounded-xl outline-none focus:border-primary cursor-pointer"
                        >
                            <option value="All">Select Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                        <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                   
                    <div className="flex items-center gap-3">
                    <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                        <button onClick={() => setViewMode("table")} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-orange-100 text-primary-dark' : 'text-gray-400 hover:text-slate-600'}`}>
                            <FiList size={18} />
                        </button>
                        <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-orange-100 text-primary-dark' : 'text-gray-400 hover:text-slate-600'}`}>
                            <FiGrid size={18} />
                        </button>
                    </div>
                    <button onClick={openAddModal} className="flex items-center gap-2 py-3 bg-gradient-to-r from-primary to-primary-dark hover:from-secondary-light hover:to-secondary-dark text-white px-5 rounded-md text-sm font-bold transition-all shadow-md shadow-orange-200 active:scale-95">
                        <FiPlus size={18} /> Add New Category
                    </button>
                </div>
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-orange-100 border-t-primary rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-bold">Loading Categories...</p>
                </div>
            ) : currentCategories.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                        <FiSearch size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No categories found</h3>
                    <p className="text-gray-400 text-sm mt-1">Adjust your search or filter to find what you're looking for.</p>
                </div>
            ) : viewMode === 'table' ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead>
                                <tr className="bg-gradient-to-r from-secondary-dark to-secondary-light border-b border-secondary-dark">
                                    <th className="px-4 py-4 text-[10px] font-bold text-[#FCD34D] uppercase tracking-wider w-10">S.NO.</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-[#FCD34D] uppercase tracking-wider w-10">CATEGORY</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-[#FCD34D] uppercase tracking-wider min-w-[280px]">SUBCATEGORIES</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-[#FCD34D] uppercase tracking-wider w-10">STATUS</th>
                                    <th className="px-4 py-4 text-[10px] font-bold text-[#FCD34D] uppercase tracking-wider w-10">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {currentCategories.map((cat, ind) => {
                                    const sNo = (currentPage - 1) * itemsPerPage + ind + 1;
                                    const status = cat.status || (ind % 4 === 3 ? 'Inactive' : 'Active');
                                    const subcategoryList = Array.isArray(cat.subcategory) ? cat.subcategory : [];

                                    return (
                                        <tr key={cat.catId} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-4 py-4 text-sm font-bold text-gray-500">{sNo}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                                                        {cat.images && cat.images.length > 0 ? (
                                                            <img src={Array.isArray(cat.images) ? cat.images[0] : cat.images} alt={cat.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center"><FiImage className="text-gray-400" /></div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-800 mb-0.5">{cat.name}</h4>
                                                        <p className="text-[11px] text-gray-400 font-medium">ID: {cat.catId || "N/A"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 align-top">
                                                {subcategoryList.length > 0 ? (
                                                    <div className="flex max-w-[440px] flex-wrap gap-1.5">
                                                        {subcategoryList.map((subcategory) => (
                                                            <span
                                                                key={subcategory}
                                                                className="rounded-md border border-orange-100 bg-orange-50 px-2 py-1 text-[10px] font-semibold text-primary-dark"
                                                            >
                                                                {subcategory}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm font-medium text-gray-400">No subcategories</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {status === 'Active' ? (
                                                    <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-600 text-[11px] font-bold rounded-lg">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-block px-3 py-1 bg-orange-50 text-orange-600 text-[11px] font-bold rounded-lg">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => openEditModal(cat)} className="w-8 h-8 flex items-center justify-center rounded-full bg-orange-50 text-primary-dark hover:bg-orange-100 transition-colors" title="Edit">
                                                        <FiEdit2 size={14} />
                                                    </button>
                                                    <button onClick={() => handleDeleteCategory(cat.catId)} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Delete">
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
                    {currentCategories.map((cat, ind) => {
                        const status = cat.status || (ind % 4 === 3 ? 'Inactive' : 'Active');
                        const totalProds = cat.totalProducts || Math.floor(Math.random() * 20 + 2);

                        return (
                            <div key={cat.catId} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
                                        {cat.images && cat.images.length > 0 ? (
                                            <img src={Array.isArray(cat.images) ? cat.images[0] : cat.images} alt={cat.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <FiImage className="text-gray-400 text-xl" />
                                        )}
                                    </div>
                                    <span className="bg-gray-100 text-gray-500 text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded">
                                        {cat.catId || "N/A"}
                                    </span>
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-slate-800 mb-1">{cat.name}</h3>
                                    <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                                        {cat.description || "No description provided."}
                                    </p>
                                    
                                    <div className="flex items-center gap-4 mb-4">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-medium">Products</p>
                                            <p className="text-sm font-bold text-gray-800">{totalProds}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-medium">Status</p>
                                            {status === 'Active' ? (
                                                <span className="inline-block px-2 py-0.5 mt-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded">Active</span>
                                            ) : (
                                                <span className="inline-block px-2 py-0.5 mt-0.5 bg-orange-50 text-orange-600 text-[10px] font-bold uppercase rounded">Inactive</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-gray-50 flex items-center gap-2 shrink-0">
                                    <button onClick={() => openEditModal(cat)} className="flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-lg border border-orange-200 text-primary-dark hover:bg-orange-50 transition-colors text-xs font-bold">
                                        <FiEdit2 size={12} /> Edit
                                    </button>
                                    <button onClick={() => handleDeleteCategory(cat.catId)} className="flex-1 py-1.5 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 transition-colors text-xs font-bold">
                                        <FiTrash2 size={12} /> Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination / Footer */}
            {!loading && totalPages > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm font-bold text-gray-500">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCategories.length)} of {filteredCategories.length} categories
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            <FiChevronLeft size={16} />
                        </button>
                        <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-white text-sm font-bold shadow-sm shadow-orange-200">
                            {currentPage}
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            <FiChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Add/Edit Category Modal */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4" style={{ zIndex: 9999 }}>
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-slate-800">
                                    {isEditing ? 'Edit Category' : 'Add New Category'}
                                </h2>
                                {isEditing && <p className="text-xs text-gray-500 mt-1 font-medium">Editing ID: <span className="font-bold text-primary-dark">{formData.catId}</span></p>}
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 text-gray-400 hover:text-slate-700 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Column: Inputs */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Category ID (Auto)</label>
                                        <input
                                            type="text"
                                            name="catId"
                                            value={formData.catId}
                                            readOnly
                                            className="w-full bg-gray-50 border border-gray-200 text-gray-500 font-bold rounded-xl px-4 py-2.5 cursor-not-allowed focus:outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Category Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            placeholder="e.g. Living Room Furniture"
                                            className="w-full bg-white border border-gray-200 text-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-primary transition-all font-medium text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Description</label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            placeholder="Brief description..."
                                            rows="4"
                                            className="w-full bg-white border border-gray-200 text-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-primary transition-all resize-none font-medium text-sm"
                                        ></textarea>
                                    </div>
                                </div>

                                {/* Right Column: Advanced */}
                                <div className="space-y-4">
                                    {/* Multiple Subcategories Input */}
                                    <div>
                                        <label className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
                                            <span>Subcategories</span>
                                            <span className="text-[10px] text-gray-400 font-medium">Press enter to add</span>
                                        </label>
                                        <div className="bg-white border border-gray-200 rounded-xl p-2 min-h-[100px] focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-primary transition-all">
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {subcategories.map((sub, idx) => (
                                                    <span key={idx} className="flex items-center gap-1.5 bg-orange-50 text-primary-dark px-2 py-1 rounded-lg text-xs font-bold">
                                                        {sub}
                                                        <button
                                                            onClick={() => removeSubcategory(sub)}
                                                            className="text-orange-500 hover:text-red-500 transition-colors"
                                                        >
                                                            <FiX size={12} />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                            <input
                                                type="text"
                                                value={subInput}
                                                onChange={(e) => setSubInput(e.target.value)}
                                                onKeyDown={handleAddSubcategory}
                                                placeholder={subcategories.length === 0 ? "Type and press Enter..." : "Add another..."}
                                                className="w-full bg-transparent border-none outline-none text-slate-800 px-1 py-1 text-sm font-medium placeholder:text-gray-400"
                                            />
                                        </div>
                                    </div>

                                    {/* Image Dropzone */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Category Images</label>
                                        {formData.images && formData.images.length > 0 ? (
                                            <div className="grid grid-cols-3 gap-2 mb-2">
                                                {formData.images.map((imgUrl, idx) => (
                                                    <div key={idx} className="relative group w-full h-20 rounded-xl overflow-hidden border border-gray-200">
                                                        <img src={resolveMediaUrl(imgUrl)} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                                                        <button
                                                            onClick={() => removeImage(idx)}
                                                            className="absolute top-1 right-1 p-1 bg-white/90 hover:bg-red-50 text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                                                        >
                                                            <FiX size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <label className="w-full h-20 border-2 border-dashed border-gray-300 hover:border-orange-400 hover:bg-orange-50/50 rounded-xl cursor-pointer flex flex-col items-center justify-center transition-all">
                                                    <FiPlus className="text-lg text-primary mb-0.5" />
                                                    <span className="text-[10px] font-bold text-gray-500">Add More</span>
                                                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                                                </label>
                                            </div>
                                        ) : (
                                            <label className="relative border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-orange-50/50 hover:border-orange-400 rounded-xl overflow-hidden transition-all cursor-pointer flex flex-col items-center justify-center p-6 text-center min-h-[100px]">
                                                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                                                <div className="w-8 h-8 bg-white shadow-sm rounded-full flex items-center justify-center mb-2 text-primary">
                                                    <FiUploadCloud size={16} />
                                                </div>
                                                <p className="text-xs font-bold text-slate-700">Upload Images</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5 font-medium">PNG, JPG up to 5MB</p>
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/80 shrink-0">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-slate-800 hover:bg-gray-200 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveCategory}
                                disabled={!formData.name}
                                className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark hover:from-secondary-light hover:to-secondary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-orange-200 active:scale-95 flex items-center gap-2"
                            >
                                {isEditing ? 'Update Category' : 'Save Category'}
                            </button>
                        </div>
                    </div>
                </div>
            , document.body)}
        </div>
    );
};

export default Category;
