import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import {
    FiPlus,
    FiEye,
    FiFilter,
    FiSearch,
    FiX,
    FiMoreVertical,
    FiCreditCard,
    FiFileText,
    FiGrid,
    FiList,
    FiDollarSign,
    FiShoppingBag,
    FiChevronLeft,
    FiChevronRight
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";

const Billing = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState("table");
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const fetchShopOrders = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        try {
            const response = await api.get("/orders");
            if (!Array.isArray(response.data)) {
                throw new Error("The orders response was invalid.");
            }
            const shopOrders = response.data
                .filter((order) => String(order.order_type || "").toLowerCase() === "shop")
                .map((order) => ({
                    orderId: order.id,
                    id: `#ORD-${order.id}`,
                    createdAt: order.created_at,
                    date: order.created_at ? new Date(order.created_at).toLocaleDateString("en-CA") : "-",
                    customer: order.customer_name || "Guest Customer",
                    amount: Number(order.total_amount || 0),
                    status: order.status || "Order Placed",
                    method: order.payment_method || "Showroom"
                }));
            setInvoices(shopOrders);
        } catch (error) {
            console.error("Fetch Shop Orders Error:", error);
            setLoadError(error.response?.data?.message || "Could not load billing orders. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchShopOrders();
    }, [fetchShopOrders]);

    const filteredInvoices = invoices.filter((invoice) => {
        const matchesSearch = `${invoice.id} ${invoice.customer}`.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || invoice.status.toLowerCase() === statusFilter;
        return matchesSearch && matchesStatus;
    });
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const paginatedInvoices = filteredInvoices.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const today = new Date();
    const todayInvoices = invoices.filter((invoice) => {
        const orderDate = new Date(invoice.createdAt);
        return !Number.isNaN(orderDate.getTime()) &&
            orderDate.getFullYear() === today.getFullYear() &&
            orderDate.getMonth() === today.getMonth() &&
            orderDate.getDate() === today.getDate();
    });
    const totalAmountToday = todayInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    useEffect(() => {
        if (totalPages > 0 && currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const getStatusStyle = (status) => {
        switch (status) {
            case "Delivered": return "bg-emerald-100 text-emerald-700";
            case "Cancelled": return "bg-red-100 text-red-700";
            case "Packing":
            case "Shipping":
            case "Out for Delivery": return "bg-amber-100 text-amber-700";
            case "Order Placed": return "bg-blue-100 text-blue-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    return (
        <div className="space-y-6 pb-8 font-sans">
            {/* Billing Stats */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-orange-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
                    <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-orange-400 to-orange-700" />
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-800 text-white shadow-lg shadow-orange-200/70 transition-transform duration-200 group-hover:scale-105">
                        <FiCreditCard size={22} />
                    </div>
                    <div className="relative z-10 min-w-0">
                        <p className="mb-1 text-xs font-bold tracking-wide text-orange-800">Total Amount</p>
                        <h2 className="text-2xl font-black leading-none text-slate-900">{loading || loadError ? "—" : `₹${totalAmount.toLocaleString("en-IN")}`}</h2>
                        <p className="mt-1 text-[10px] font-medium text-stone-500">Shop orders only</p>
                    </div>
                    <FiCreditCard className="pointer-events-none absolute -right-1 bottom-1 text-orange-300/20" size={60} />
                </div>
                <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-emerald-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
                    <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-200/70 transition-transform duration-200 group-hover:scale-105">
                        <FiDollarSign size={22} />
                    </div>
                    <div className="relative z-10 min-w-0">
                        <p className="mb-1 text-xs font-bold tracking-wide text-emerald-800">Today Amount</p>
                        <h2 className="text-2xl font-black leading-none text-slate-900">{loading || loadError ? "—" : `₹${totalAmountToday.toLocaleString("en-IN")}`}</h2>
                        <p className="mt-1 text-[10px] font-medium text-stone-500">Shop orders only</p>
                    </div>
                    <FiDollarSign className="pointer-events-none absolute -right-1 bottom-1 text-emerald-300/20" size={60} />
                </div>
                <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-amber-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-amber-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
                    <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-amber-400 to-amber-600" />
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-200/70 transition-transform duration-200 group-hover:scale-105">
                        <FiShoppingBag size={22} />
                    </div>
                    <div className="relative z-10 min-w-0">
                        <p className="mb-1 text-xs font-bold tracking-wide text-amber-800">Order Count Today</p>
                        <h2 className="text-2xl font-black leading-none text-slate-900">{loading || loadError ? "—" : todayInvoices.length}</h2>
                        <p className="mt-1 text-[10px] font-medium text-stone-500">Shop orders only</p>
                    </div>
                    <FiShoppingBag className="pointer-events-none absolute -right-1 bottom-1 text-amber-300/20" size={60} />
                </div>
            </div>

            {/* Invoices Table */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div className="relative w-full md:w-72">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Order ID or customer..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-11 pr-10 text-sm font-medium text-slate-700 outline-none transition-all placeholder:text-gray-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm("")}
                                title="Clear search"
                                aria-label="Clear search"
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-colors hover:bg-orange-50 hover:text-orange-700"
                            >
                                <FiX size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                        <div className="flex items-center gap-2 border-r border-gray-200 px-2">
                            <FiFilter className="text-gray-400" size={16} />
                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value)}
                                aria-label="Filter orders by status"
                                className="cursor-pointer bg-transparent text-xs font-bold text-gray-600 outline-none focus:text-orange-800"
                            >
                                <option value="all">All</option>
                                <option value="order placed">Order Placed</option>
                                <option value="packing">Packing</option>
                                <option value="shipping">Shipping</option>
                                <option value="out for delivery">Out for Delivery</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                            <button
                            type="button"
                            title="Card view"
                            aria-label="Card view"
                            onClick={() => setViewMode("card")}
                            className={`rounded-lg p-2.5 transition-all ${viewMode === "card" ? "bg-orange-100 text-orange-900 shadow-sm" : "text-gray-400 hover:text-orange-800"}`}
                        >
                            <FiGrid size={18} />
                            </button>
                            <button
                            type="button"
                            title="Table view"
                            aria-label="Table view"
                            onClick={() => setViewMode("table")}
                            className={`rounded-lg p-2.5 transition-all ${viewMode === "table" ? "bg-orange-100 text-orange-900 shadow-sm" : "text-gray-400 hover:text-orange-800"}`}
                        >
                            <FiList size={18} />
                            </button>
                        </div>
                        <button
                        onClick={() => navigate("/admin/orders/shop-create")}
                        className="flex items-center gap-2 rounded-md bg-gradient-to-r from-primary to-primary-dark px-5 py-3 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark active:scale-95"
                        >
                            <FiPlus /> Create New Order
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                {viewMode === "table" ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-gradient-to-r from-[#3B1A0B] to-[#6B3212] text-amber-200">
                                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider">Order ID</th>
                                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider">Customer</th>
                                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider">Amount</th>
                                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider">Payment</th>
                                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider">Status</th>
                                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider">Order Date</th>
                                <th className="px-5 py-4 text-right text-[10px] font-bold uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-8 py-12 text-center text-sm font-medium text-gray-400">Loading billing orders...</td>
                                </tr>
                            ) : loadError ? (
                                <tr>
                                    <td colSpan="7" className="px-8 py-12 text-center">
                                        <p role="alert" className="text-sm font-semibold text-rose-600">{loadError}</p>
                                        <button type="button" onClick={fetchShopOrders} className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-100">Try again</button>
                                    </td>
                                </tr>
                            ) : paginatedInvoices.map((inv) => (
                                <tr key={inv.id} className="group border-b border-gray-100 transition-colors hover:bg-orange-50/40">
                                    <td className="px-5 py-4 text-xs font-bold text-orange-800">{inv.id}</td>
                                    <td className="px-5 py-4 text-xs font-bold text-slate-700">{inv.customer}</td>
                                    <td className="px-5 py-4 text-xs font-bold text-slate-800">₹{inv.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                                            <FiCreditCard className="text-orange-700" /> {inv.method}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusStyle(inv.status)}`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-[11px] text-gray-500">{inv.date}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => navigate(`/admin/orders/${inv.orderId}`)} className="rounded-lg p-2 text-orange-800 transition-all hover:bg-orange-100" title="View order" aria-label={`View order ${inv.id}`}>
                                                <FiEye size={16} />
                                            </button>
                                           
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && !loadError && filteredInvoices.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-8 py-12 text-center text-sm text-gray-400">
                                        No Shop orders found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 bg-gray-50/40 p-5 sm:grid-cols-2 xl:grid-cols-3">
                        {loading ? (
                            <div className="col-span-full px-8 py-12 text-center text-sm text-gray-400">Loading billing orders...</div>
                        ) : loadError ? (
                            <div className="col-span-full px-8 py-12 text-center">
                                <p role="alert" className="text-sm font-semibold text-rose-600">{loadError}</p>
                                <button type="button" onClick={fetchShopOrders} className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-100">Try again</button>
                            </div>
                        ) : paginatedInvoices.map((inv) => (
                            <article key={inv.id} className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                                <div className="mb-4 flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Shop Order</p>
                                        <h3 className="mt-1 text-lg font-black text-slate-800">{inv.id}</h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${getStatusStyle(inv.status)}`}>
                                            {inv.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid flex-1 grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customer</p>
                                        <p className="font-bold text-slate-700 mt-1 truncate">{inv.customer}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payment</p>
                                        <p className="font-bold text-slate-700 mt-1 truncate">{inv.method}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order Date</p>
                                        <p className="text-gray-500 mt-1">{inv.date}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount</p>
                                        <p className="text-lg font-black text-slate-800 mt-0.5">₹{inv.amount.toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
                                    <button onClick={() => navigate(`/admin/orders/${inv.orderId}`)} className="rounded-lg p-2 text-orange-800 transition-all hover:bg-orange-100" title="View order" aria-label={`View order ${inv.id}`}>
                                        <FiEye size={16} />
                                    </button>
                                    <button className="rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-100" title="More actions" aria-label={`More actions for ${inv.id}`}>
                                        <FiMoreVertical size={16} />
                                    </button>
                                </div>
                            </article>
                        ))}
                        {!loading && !loadError && filteredInvoices.length === 0 && (
                            <p className="col-span-full px-8 py-12 text-center text-sm text-gray-400">No Shop orders found.</p>
                        )}
                    </div>
                )}
                {totalPages > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4">
                        <p className="text-xs font-semibold text-gray-500">
                            Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                                disabled={currentPage === 1}
                                aria-label="Previous page"
                                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <FiChevronLeft size={16} />
                            </button>
                            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                                <button
                                    type="button"
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`h-9 min-w-9 rounded-lg border px-2 text-xs font-bold transition-colors ${currentPage === page ? "border-orange-800 bg-orange-800 text-white" : "border-gray-200 text-gray-600 hover:bg-orange-50"}`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                aria-label="Next page"
                                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <FiChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Billing;
