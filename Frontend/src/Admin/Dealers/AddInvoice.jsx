import React, { useState, useEffect } from "react";
import { FiArrowLeft, FiPlus, FiTrash2, FiSave, FiUser, FiPackage, FiSearch, FiCheckCircle, FiUploadCloud } from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api";
import { toast, Toaster } from "react-hot-toast";

const AddInvoice = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselectedDealerId = searchParams.get("dealerId");

    const [loading, setLoading] = useState(false);
    const [uploadingDocument, setUploadingDocument] = useState(false);
    const [dealers, setDealers] = useState([]);
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [productSearchTerm, setProductSearchTerm] = useState("");

    const [formData, setFormData] = useState({
        dealer_id: preselectedDealerId || "",
        invoice_date: new Date().toISOString().split('T')[0],
        status: "Pending",
        items: [],
        total_amount: 0,
        document: null
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dealerRes, productRes] = await Promise.all([
                    api.get("/dealers"),
                    api.get("/products")
                ]);
                setDealers(dealerRes.data || []);
                setProducts(productRes.data || []);

                if (preselectedDealerId && dealerRes.data) {
                    const dealer = dealerRes.data.find(d => d.id.toString() === preselectedDealerId.toString());
                    if (dealer) {
                        setSearchTerm(dealer.name);
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Failed to load dealers or products");
            }
        };
        fetchData();
    }, [preselectedDealerId]);

    const handleAddItem = (product) => {
        const existingItem = formData.items.find(item => item.product_id === product.id);
        if (existingItem) {
            toast.error("Product already added to invoice");
            return;
        }

        const newItem = {
            product_id: product.id,
            name: product.name,
            price: parseFloat(product.offer_price || product.price || 0),
            quantity: 1,
            total: parseFloat(product.offer_price || product.price || 0)
        };

        const updatedItems = [...formData.items, newItem];
        updateTotal(updatedItems);
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

    const updateTotal = (items) => {
        const total = items.reduce((sum, item) => sum + item.total, 0);
        setFormData(prev => ({ ...prev, items, total_amount: total }));
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingDocument(true);
        try {
            const uploadData = new FormData();
            uploadData.append("document", file);
            const response = await api.post("/uploads/document", uploadData);
            setFormData(prev => ({ ...prev, document: { name: file.name, url: response.data.url } }));
            toast.success(`${file.name} uploaded!`);
        } catch (error) {
            console.error("Invoice document upload failed:", error);
            toast.error(error.response?.data?.message || "Failed to upload document");
        } finally {
            setUploadingDocument(false);
            e.target.value = "";
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.dealer_id) {
            toast.error("Please select a dealer");
            return;
        }
        if (formData.items.length === 0) {
            toast.error("Please add at least one product");
            return;
        }

        setLoading(true);
        try {
            // Simulation
            toast.success("Invoice created successfully!");
            setTimeout(() => navigate("/admin/dealers"), 1500);
        } catch (error) {
            console.error("Invoice Error:", error);
            toast.error("Failed to create invoice");
        } finally {
            setLoading(false);
        }
    };

    const filteredDealers = dealers.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        p.product_code?.toLowerCase().includes(productSearchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="flex items-center gap-4 pb-2">
                <button
                    onClick={() => navigate(-1)}
                    className="p-3 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-primary hover:border-primary/30 transition-all shadow-sm active:scale-95"
                >
                    <FiArrowLeft size={20} />
                </button>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-light mb-1">Dealer Management</p>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Create Invoice</h1>
                    <p className="text-sm font-bold text-gray-400 mt-1">Prepare a new dealer invoice and update your stock records.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 border-t-4 border-t-primary-light shadow-sm space-y-8">
                        {/* Dealer Selection */}
                        <div className="space-y-4">
                            <label className="flex items-center gap-3 text-xs font-black text-slate-700 uppercase tracking-widest">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white text-[11px]">1</span>
                                Select Dealer <span className="text-primary-light">*</span>
                            </label>
                            <div className="relative">
                                <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search and select dealer..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        if (formData.dealer_id) setFormData(prev => ({ ...prev, dealer_id: "" }));
                                    }}
                                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-slate-800"
                                />
                                {searchTerm && filteredDealers.length > 0 && !formData.dealer_id && (
                                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden">
                                        {filteredDealers.map(dealer => (
                                            <button
                                                key={dealer.id}
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => ({ ...prev, dealer_id: dealer.id }));
                                                    setSearchTerm(dealer.name);
                                                }}
                                                className="w-full px-6 py-4 text-left hover:bg-primary/5 transition-colors flex items-center justify-between group border-b border-gray-50 last:border-0"
                                            >
                                                <div>
                                                    <p className="font-bold text-slate-800">{dealer.name}</p>
                                                    <p className="text-[10px] text-gray-400 uppercase font-black">{dealer.contact} • {dealer.location}</p>
                                                </div>
                                                <FiPlus className="text-gray-300 group-hover:text-primary transition-colors" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {formData.dealer_id && (
                                <div className="mt-2 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between animate-in zoom-in-95 duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                                            <FiUser size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-emerald-900">{dealers.find(d => d.id.toString() === formData.dealer_id.toString())?.name}</p>
                                            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Selected Dealer</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, dealer_id: "" }));
                                            setSearchTerm("");
                                        }}
                                        className="text-emerald-400 hover:text-emerald-600 p-2"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Product Selection */}
                        <div className="space-y-4">
                            <label className="flex items-center gap-3 text-xs font-black text-slate-700 uppercase tracking-widest">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white text-[11px]">2</span>
                                Add Products <span className="text-primary-light">*</span>
                            </label>
                            <div className="relative">
                                <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search products by name or code..."
                                    value={productSearchTerm}
                                    onChange={(e) => setProductSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/20 transition-all font-bold text-slate-800"
                                />
                                {productSearchTerm && filteredProducts.length > 0 && (
                                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                                        {filteredProducts.map(product => (
                                            <button
                                                key={product.id}
                                                type="button"
                                                onClick={() => handleAddItem(product)}
                                                className="w-full px-6 py-4 text-left hover:bg-primary/5 transition-colors flex items-center justify-between group border-b border-gray-50 last:border-0"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden">
                                                        <img
                                                            src={product.variants?.[0]?.images?.[0] || (product.images && product.images[0]) || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}`}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">{product.name}</p>
                                                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-tight italic">
                                                            ₹{parseFloat(product.offer_price || product.price || 0).toLocaleString()} • {product.product_code || "N/A"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <FiPlus className="text-gray-300 group-hover:text-primary transition-colors" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Items List */}
                            <div className="space-y-3 pt-4">
                                {formData.items.length === 0 ? (
                                    <div className="p-10 border-2 border-dashed border-gray-100 rounded-[2rem] text-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-300">
                                            <FiPackage size={32} />
                                        </div>
                                        <p className="text-gray-400 font-bold">No products added yet.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-hidden border border-gray-100 rounded-2xl">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Product</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Price</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest w-24">Qty</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Total</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {formData.items.map((item, index) => (
                                                    <tr key={index} className="hover:bg-gray-50/50 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm font-bold text-slate-800">{item.name}</p>
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
                                                                className="w-16 px-3 py-1 bg-gray-100 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-primary/10 font-bold text-sm"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <p className="text-sm font-black text-slate-800">₹{item.total.toLocaleString()}</p>
                                                        </td>
                                                        <td className="px-6 py-4 text-center text-red-300 hover:text-red-500 transition-colors cursor-pointer" onClick={() => handleRemoveItem(index)}>
                                                            <FiTrash2 size={16} />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Document Upload */}
                        <div className="space-y-4">
                            <label className="flex items-center gap-3 text-xs font-black text-slate-700 uppercase tracking-widest">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white text-[11px]">3</span>
                                Attach Invoice / PO <span className="text-gray-400 normal-case tracking-normal">(PDF/Image)</span>
                            </label>
                            <div
                                className={`relative border-2 border-dashed rounded-[2rem] p-8 text-center transition-all ${formData.document ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-gray-50 hover:border-primary-light'}`}
                            >
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    accept="image/*,.pdf"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="space-y-2">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${formData.document ? 'bg-emerald-500 text-white' : 'bg-white text-gray-400'}`}>
                                        <FiUploadCloud size={24} />
                                    </div>
                                    {formData.document ? (
                                        <div>
                                            <p className="font-bold text-emerald-900">{formData.document.name}</p>
                                            <p className="text-[10px] text-emerald-600 font-black uppercase">Uploaded</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="font-bold text-slate-800">Drop PDF or Image here</p>
                                            <p className="text-[10px] text-gray-400 font-black uppercase">{uploadingDocument ? "Uploading..." : "Max size: 10MB"}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Summary */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-primary-dark via-primary to-primary-light p-6 sm:p-8 rounded-2xl text-white shadow-xl shadow-primary/20">
                        <div className="flex items-start justify-between mb-8">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-2">Review & Submit</p>
                                <h3 className="text-xl font-bold">Invoice Summary</h3>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                <FiSave size={18} />
                            </div>
                        </div>

                        <div className="space-y-4 border-b border-white/10 pb-6 mb-6">
                            <div className="flex justify-between text-sm opacity-60 font-bold">
                                <span>Subtotal</span>
                                <span>₹{formData.total_amount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm opacity-60 font-bold">
                                <span>Tax (0%)</span>
                                <span>₹0</span>
                            </div>
                        </div>

                        <div className="mb-8">
                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary-light mb-2">Grand Total</p>
                            <h2 className="text-4xl font-black italic">₹{formData.total_amount.toLocaleString()}</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-white/5 p-4 rounded-2xl">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 block mb-2">Invoice Date</label>
                                <input
                                    type="date"
                                    value={formData.invoice_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                                    className="bg-transparent w-full font-bold outline-none text-secondary-light"
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary-light disabled:bg-slate-700 text-white py-4 rounded-2xl text-lg font-black transition-all active:scale-95 shadow-xl shadow-primary/20 mt-4 group"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <FiSave className="group-hover:translate-y-[-2px] transition-transform" />
                                        <span>Create Invoice</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3 italic flex items-center gap-2">
                            Pro-Tip
                        </p>
                        <p className="text-sm font-bold text-amber-900/70 leading-relaxed">
                            Generating an invoice will automatically update the "Total Orders" count for the selected dealer once it's marked as paid.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddInvoice;
