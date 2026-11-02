import React, { useState, useEffect } from "react";
import api from "../../api";
import {
    FiTruck,
    FiPlus,
    FiSearch,
    FiPhone,
    FiMail,
    FiMapPin,
    FiStar,
    FiMoreVertical,
    FiPackage,
    FiCheck,
    FiUpload,
    FiDownload,
    FiFilter,
    FiGrid,
    FiList,
    FiX
} from "react-icons/fi";
import { toast, Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import AddDealerModal from "./AddDealerModal";
import { resolveMediaUrl } from "../../utils/media";

const Dealers = () => {
    const navigate = useNavigate();
    const [dealers, setDealers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDealer, setSelectedDealer] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [showAddDealer, setShowAddDealer] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [viewMode, setViewMode] = useState("table");

    // Mock history data
    const mockHistory = [
        { id: "#INV-2024-001", date: "2024-03-01", items: "Wedding Silk Saree x 5", amount: "₹45,000", status: "Paid" },
        { id: "#INV-2024-042", date: "2024-02-15", items: "Cotton Saree x 12", amount: "₹18,000", status: "Paid" },
        { id: "#INV-2023-118", date: "2024-01-20", items: "Linen Saree x 2", amount: "₹4,200", status: "Pending" },
    ];

    useEffect(() => {
        fetchDealers();
    }, []);

    const fetchDealers = async () => {
        setLoading(true);
        try {
            const res = await api.get("/dealers");
            setDealers(res.data);
        } catch (error) {
            console.error("Fetch Dealers Error:", error);
            toast.error("Failed to load dealers");
        } finally {
            setLoading(false);
        }
    };

    const filteredDealers = dealers.filter(dealer => {
        const search = searchTerm.toLowerCase();
        const matchesSearch = dealer.name?.toLowerCase().includes(search) ||
            dealer.contact?.toLowerCase().includes(search) ||
            dealer.location?.toLowerCase().includes(search) ||
            dealer.email?.toLowerCase().includes(search);
        const matchesStatus = statusFilter === "All" || dealer.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalDealers = dealers.length;
    const activeDealers = dealers.filter(dealer => String(dealer.status || "Active").toLowerCase() === "active").length;
    const inactiveDealers = dealers.filter(dealer => String(dealer.status || "Active").toLowerCase() === "inactive").length;
    const totalOrders = dealers.reduce((total, dealer) => total + (Number(dealer.orders) || 0), 0);

    const handleContact = (dealer) => {
        toast.promise(
            new Promise((resolve) => setTimeout(resolve, 800)),
            {
                loading: `Opening secure chat with ${dealer.name}...`,
                success: `Connected to ${dealer.contact}!`,
                error: 'Connection failed',
            }
        );
    };

    const handleViewHistory = (dealer) => {
        setSelectedDealer(dealer);
        setShowHistory(true);
    };

    const handleImportExcel = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx, .xls, .csv';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                toast.loading(`Importing ${file.name}...`);
                setTimeout(() => {
                    toast.dismiss();
                    toast.success("All partners imported successfully!");
                }, 1500);
            }
        };
        input.click();
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case "Premium": return "bg-amber-100 text-amber-700 border-amber-200";
            case "Verified": return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "Pending": return "bg-gray-100 text-gray-700 border-gray-200";
            default: return "bg-gray-100 text-gray-500 border-gray-100";
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Toaster position="top-right" />
            {/* Dealer Analytics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0"><FiTruck size={22} /></div>
                    <div><p className="text-xs text-gray-400 font-medium">Total Dealers</p><h3 className="text-3xl font-black text-slate-800 leading-none my-0.5">{totalDealers.toLocaleString()}</h3><p className="text-[10px] text-gray-400">All registered partners</p></div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-lg shrink-0"><FiCheck size={22} /></div>
                    <div><p className="text-xs text-gray-400 font-medium">Active Dealers</p><h3 className="text-3xl font-black text-slate-800 leading-none my-0.5">{activeDealers.toLocaleString()}</h3><p className="text-[10px] text-gray-400">Currently active</p></div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white shadow-lg shrink-0"><FiX size={22} /></div>
                    <div><p className="text-xs text-gray-400 font-medium">Inactive Dealers</p><h3 className="text-3xl font-black text-slate-800 leading-none my-0.5">{inactiveDealers.toLocaleString()}</h3><p className="text-[10px] text-gray-400">Needs follow-up</p></div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white shadow-lg shrink-0"><FiPackage size={22} /></div>
                    <div><p className="text-xs text-gray-400 font-medium">Total Orders</p><h3 className="text-3xl font-black text-slate-800 leading-none my-0.5">{totalOrders.toLocaleString()}</h3><p className="text-[10px] text-gray-400">Across all dealers</p></div>
                </div>
            </div>
            {/* Page Header */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                    <div className="relative w-full sm:w-72">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search dealers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-all text-sm font-medium"
                        />
                    </div>
                    <div className="relative w-full sm:w-40">
                        <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full appearance-none pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium outline-none focus:border-blue-500"
                        >
                            <option value="All">All Status</option>
                            <option value="Premium">Premium</option>
                            <option value="Verified">Verified</option>
                            <option value="Pending">Pending</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none">▼</span>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
                        <button type="button" onClick={() => setViewMode("table")} className={`p-2 rounded-md transition-colors ${viewMode === "table" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-blue-600"}`} aria-label="Table mode" title="Table mode">
                            <FiList size={16} />
                        </button>
                        <button type="button" onClick={() => setViewMode("card")} className={`p-2 rounded-md transition-colors ${viewMode === "card" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-blue-600"}`} aria-label="Card mode" title="Card mode">
                            <FiGrid size={16} />
                        </button>
                    </div>
                    <button
                        onClick={handleImportExcel}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#4b0b78] border border-[#4b0b78] text-white px-5 py-2.5 rounded-lg font-bold transition-all hover:bg-[#260642] active:scale-95 shadow-sm"
                    >
                        <FiUpload /> Import Partners
                    </button>

                    <button
                        onClick={() => setShowAddDealer(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#4b0b78] hover:bg-[#260642] text-white px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-purple-200 active:scale-95"
                    >
                        <FiPlus /> New Partnership
                    </button>
                </div>
            </div>

            {/* Table View */}
            {viewMode === "table" && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-gradient-to-r from-[#260642] to-[#4b0b78] text-[11px] font-black text-[#facc15] uppercase tracking-wider">
                                    <th className="px-4 py-4 text-center"><input type="checkbox" className="rounded border-white/70 text-[#facc15] focus:ring-[#facc15]" aria-label="Select all dealers" /></th>
                                    <th className="px-4 py-4 text-center">S No</th>
                                    <th className="px-6 py-4">Dealer</th>
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4">Location</th>
                                    <th className="px-6 py-4 text-center">Rating</th>
                                    <th className="px-6 py-4 text-center">Orders</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="9" className="px-6 py-10 text-center text-gray-400 text-sm font-semibold">Loading dealers...</td></tr>
                                ) : filteredDealers.length === 0 ? (
                                    <tr><td colSpan="9" className="px-6 py-10 text-center text-gray-400 text-sm font-semibold">No dealers found.</td></tr>
                                ) : filteredDealers.map((dealer, index) => (
                                    <tr key={dealer.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                                        <td className="px-4 py-4 text-center"><input type="checkbox" className="rounded border-gray-300 text-[#4318FF] focus:ring-[#4318FF]" aria-label={`Select ${dealer.name}`} /></td>
                                        <td className="px-4 py-4 text-center text-sm font-bold text-gray-400">{index + 1}</td>
                                        <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-50 overflow-hidden flex items-center justify-center text-blue-600 font-black">{dealer.image ? <img src={resolveMediaUrl(dealer.image)} alt={dealer.name} className="w-full h-full object-cover" /> : dealer.name?.charAt(0)}</div><div><p className="font-bold text-slate-800">{dealer.name}</p><p className="text-xs text-gray-400">#{dealer.id}</p></div></div></td>
                                        <td className="px-6 py-4"><p className="text-sm font-medium text-slate-700">{dealer.phone || dealer.contact || "-"}</p><p className="text-xs text-gray-400">{dealer.email || "-"}</p></td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{dealer.location || "-"}</td>
                                        <td className="px-6 py-4 text-center font-bold text-amber-500"><span className="inline-flex items-center gap-1"><FiStar fill="currentColor" />{dealer.rating || "-"}</span></td>
                                        <td className="px-6 py-4 text-center font-bold text-blue-600">{dealer.orders || 0}</td>
                                        <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(dealer.status)}`}>{dealer.status || "Pending"}</span></td>
                                        <td className="px-6 py-4"><div className="flex justify-end gap-2"><button onClick={() => handleContact(dealer)} className="px-3 py-2 rounded-lg bg-[#4b0b78] text-white text-xs font-bold hover:bg-[#260642]">Contact</button><button onClick={() => navigate(`/admin/invoices/add?dealerId=${dealer.id}`)} className="px-3 py-2 rounded-lg bg-[#4b0b78] text-white text-xs font-bold hover:bg-[#260642]">Invoice</button><button onClick={() => handleViewHistory(dealer)} className="px-3 py-2 rounded-lg bg-[#4b0b78] text-white text-xs font-bold hover:bg-[#260642]">History</button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Dealers Grid */}
            {viewMode === "card" && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="animate-pulse bg-white rounded-[2rem] border border-gray-100 p-6 h-80 shadow-sm">
                            <div className="flex gap-4 mb-6">
                                <div className="w-16 h-16 bg-gray-200 rounded-2xl shrink-0"></div>
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-10 bg-gray-100 rounded-2xl"></div>
                                    <div className="h-10 bg-gray-100 rounded-2xl"></div>
                                </div>
                                <div className="h-4 bg-gray-100 rounded w-full"></div>
                                <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                            </div>
                        </div>
                    ))
                ) : filteredDealers.map((dealer) => (
                    <div key={dealer.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group p-6">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gray-50 overflow-hidden border border-gray-100 flex items-center justify-center">
                                    {dealer.image ? (
                                        <img src={resolveMediaUrl(dealer.image)} alt={dealer.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <span className="text-xl font-black text-blue-600 bg-blue-50 w-full h-full flex items-center justify-center capitalize">{dealer.name?.charAt(0)}</span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{dealer.name}</h3>
                                    <span className={`mt-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(dealer.status)}`}>
                                        {dealer.status}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => toast.error("Quick actions not configured yet.")}
                                className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"
                            >
                                <FiMoreVertical />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50/50 rounded-2xl flex flex-col items-center">
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Rating</p>
                                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                                        <FiStar fill="currentColor" /> {dealer.rating}
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50/50 rounded-2xl flex flex-col items-center">
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Orders</p>
                                    <div className="flex items-center gap-1 text-blue-600 font-bold">
                                        <FiPackage /> {dealer.orders}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2.5 border-t border-gray-50 pt-4">
                                <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                                    <FiMapPin className="text-blue-500" /> {dealer.location}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-500 font-medium overflow-hidden">
                                    <FiMail className="text-blue-500" /> <span className="truncate">{dealer.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                                    <FiPhone className="text-blue-500" /> {dealer.phone}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-2">
                            <button
                                onClick={() => handleContact(dealer)}
                                className="flex-1 py-2.5 bg-[#4b0b78] hover:bg-[#260642] rounded-xl text-xs font-bold text-white transition-all border border-[#4b0b78]"
                            >
                                Contact
                            </button>
                            <button
                                onClick={() => navigate(`/admin/invoices/add?dealerId=${dealer.id}`)}
                                className="flex-1 py-2.5 bg-[#4b0b78] hover:bg-[#260642] rounded-xl text-xs font-bold text-white transition-all border border-[#4b0b78]"
                            >
                                Invoice
                            </button>
                            <button
                                onClick={() => handleViewHistory(dealer)}
                                className="flex-1 py-2.5 bg-[#4b0b78] hover:bg-[#260642] rounded-xl text-xs font-bold text-white transition-all border border-[#4b0b78]"
                            >
                                View History
                            </button>
                        </div>
                    </div>
                ))}

                {/* Invite Card */}
                <div className="bg-gradient-to-br from-[#260642] to-[#4b0b78] rounded-[2rem] p-8 flex flex-col items-center justify-center text-center text-white relative overflow-hidden group cursor-pointer shadow-xl shadow-purple-200">
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="absolute -left-10 -top-10 w-24 h-24 bg-white/5 rounded-full group-hover:scale-125 transition-transform duration-700"></div>

                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-6 backdrop-blur-md border border-white/20 group-hover:scale-110 transition-transform">
                        <FiTruck />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Expand Your Network</h3>
                    <p className="text-white/70 text-sm mb-8 px-4">Invite more dealers and manage all collections in one place.</p>
                    <button
                        onClick={() => setShowAddDealer(true)}
                        className="w-full py-3.5 bg-white text-[#4b0b78] rounded-xl font-black text-sm uppercase tracking-widest shadow-lg hover:shadow-2xl active:scale-95 transition-all"
                    >
                        Invite Partner
                    </button>
                </div>
            </div>}

            {/* History Modal */}
            {showHistory && selectedDealer && (
                <div className="fixed inset-0 z-[99] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                    <FiPackage size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 italic">{selectedDealer.name}</h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Transaction History & Invoices</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowHistory(false)}
                                className="p-3 hover:bg-white rounded-2xl text-gray-400 hover:text-red-500 transition-all border border-transparent hover:border-gray-100 shadow-sm"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div className="p-8 max-h-[60vh] overflow-y-auto">
                            <div className="space-y-4">
                                {mockHistory.map((h, i) => (
                                    <div key={i} className="group p-5 bg-gray-50 hover:bg-white border border-gray-100 hover:border-blue-100 rounded-3xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-500 shadow-sm border border-gray-50 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <FiDownload size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800">{h.id}</p>
                                                <p className="text-xs text-gray-400 font-bold italic">{h.items}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-6">
                                            <div className="text-right">
                                                <p className="text-sm font-black text-slate-800 italic">{h.amount}</p>
                                                <p className="text-[10px] text-gray-400 font-bold">{h.date}</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${h.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {h.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-8 bg-gray-50/50 border-t border-gray-50">
                            <button
                                onClick={() => {
                                    setShowHistory(false);
                                    navigate(`/admin/invoices/add?dealerId=${selectedDealer.id}`);
                                }}
                                className="w-full bg-[#4b0b78] hover:bg-[#260642] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl shadow-purple-200"
                            >
                                Create New Invoice for Partner
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Dealer Modal */}
            <AddDealerModal 
                isOpen={showAddDealer} 
                onClose={() => setShowAddDealer(false)} 
                onSuccess={fetchDealers} 
            />
        </div>
    );
};

export default Dealers;
