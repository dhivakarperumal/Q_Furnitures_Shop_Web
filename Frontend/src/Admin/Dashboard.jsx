import React, { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "../PrivateRouter/AuthContext";
import { useAdmin } from "../PrivateRouter/AdminContext";
import api from "../api";
import { toast, Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
    FiShoppingBag,
    FiUsers,
    FiBox,
    FiClock,
    FiCheckCircle,
    FiAlertTriangle,
    FiMapPin,
    FiArrowUpRight,
    FiEye,
    FiGrid,
    FiTag,
    FiBriefcase,
    FiCreditCard,
    FiImage,
    FiPercent,
    FiStar
} from "react-icons/fi";
import { FaRupeeSign, FaTshirt, FaTruck } from "react-icons/fa";
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
    BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';

const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");

const getDashboardImageUrl = (image) => {
    if (typeof image !== "string" || !image.trim()) return null;
    if (/^(https?:|data:|blob:)/i.test(image)) return image;
    return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
};

const formatOrderDate = (value) => {
    if (!value) return "Date unavailable";

    let date = new Date(value);
    if (Number.isNaN(date.getTime()) && typeof value === "string") {
        date = new Date(value.replace(" ", "T"));
    }

    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

ChartJS.register(
  CategoryScale,
  LinearScale,
    BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const { dashboardData, setDashboardCached } = useAdmin();
    const [loading, setLoading] = useState(!dashboardData);
    const [salesRange, setSalesRange] = useState("week");
    const [stockAlertCount, setStockAlertCount] = useState(0);

    const fetchDashboardData = useCallback(async (range = "week") => {
        setLoading(true);
        try {
            const response = await api.get('/dashboard', { params: { range } });
            setDashboardCached(response.data);
        } catch (error) {
            console.error("Fetch Dashboard Error:", error);
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    }, [setDashboardCached]);

    useEffect(() => {
        void fetchDashboardData("week");
        api.get("/stock/low-stock", { params: { page: 1, limit: 1 } })
            .then((response) => setStockAlertCount(Number(response.data?.pagination?.total || 0)))
            .catch((error) => console.error("Low-stock dashboard alert failed to load:", error));
    }, [fetchDashboardData]);

    const getStatusStyle = (status) => {
        switch (status) {
            case "Delivered": return "bg-green-100 text-green-700";
            case "Confirmed": return "bg-blue-100 text-blue-700";
            case "Shipped": return "bg-orange-100 text-orange-700";
            case "Packed": return "bg-purple-100 text-purple-700";
            case "Pending": return "bg-yellow-100 text-yellow-700";
            case "Cancelled": return "bg-red-100 text-red-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    const getStatIcon = (iconStr, className = "text-white", size = 22) => {
        switch (iconStr) {
            case "saree": return <FaTshirt className={className} size={size} />;
            case "bag": return <FiShoppingBag className={className} size={size} />;
            case "rupee": return <FaRupeeSign className={className} size={size} />;
            case "pending": return <FiClock className={className} size={size} />;
            case "truck": return <FaTruck className={className} size={size} />;
            case "users": return <FiUsers className={className} size={size} />;
            case "lowstock": return <FiBox className={className} size={size} />;
            case "offer": return <FiTag className={className} size={size} />;
            default: return <FiBox className={className} size={size} />;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4 h-[60vh]">
                <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-300 font-bold text-sm">Loading Dashboard...</p>
            </div>
        )
    }

    if (!dashboardData) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <p className="text-gray-400 font-bold text-sm">No data available</p>
            </div>
        )
    }

    const {
        stats = [],
        recentOrders = [],
        topProducts = [],
        lowStockAlerts = [],
        revenueTrends = [],
        orderStatusCounts = {},
    } = dashboardData;

    // ── Bar Chart: Real Revenue Trends ──────────────────────────────
    const barChartData = {
        labels: revenueTrends.length > 0
            ? revenueTrends.map(t => t.month)
            : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
            label: 'Revenue',
            data: revenueTrends.length > 0
                ? revenueTrends.map(t => t.revenue)
                : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            backgroundColor: '#D4AF37',
            borderColor: '#B8941F',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
            categoryPercentage: 0.7,
            barPercentage: 0.8,
        }]
    };

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#fff',
                titleColor: '#333',
                bodyColor: '#333',
                borderColor: '#eee',
                borderWidth: 1,
                callbacks: {
                    label: (context) => `Revenue: ₹${context.parsed.y.toLocaleString('en-IN')}`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value) => `₹${(value / 1000).toFixed(0)}k`,
                    color: '#9ca3af',
                    font: { size: 10 }
                },
                grid: { color: '#f3f4f6', drawBorder: false }
            },
            x: {
                ticks: { color: '#9ca3af', font: { size: 10 } },
                grid: { display: false, drawBorder: false }
            }
        }
    };

    const salesRangeOptions = [
        { value: "week", label: "This Week" },
        { value: "month", label: "This Month" },
        { value: "all", label: "All Time" },
    ];

    // ── Doughnut Chart: Real Order Status Counts ─────────────────────
    const statusLabels  = ['Order Placed', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
    const statusColors  = ['#fbbf24', '#3b82f6', '#a855f7', '#f97316', '#10b981', '#ef4444'];
    const statusBgCols  = ['bg-yellow-400', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-emerald-500', 'bg-red-500'];

    const statusCounts  = statusLabels.map(s => orderStatusCounts[s] || 0);
    const totalOrders   = statusCounts.reduce((a, b) => a + b, 0);

    const doughnutData = {
        labels: statusLabels,
        datasets: [{
            data: statusCounts,
            backgroundColor: statusColors,
            borderWidth: 0,
            cutout: '70%',
        }]
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
    };

    const orderStats = statusLabels.map((label, i) => ({
        label,
        count: statusCounts[i],
        pct: totalOrders > 0 ? `${((statusCounts[i] / totalOrders) * 100).toFixed(1)}%` : '0%',
        color: statusBgCols[i]
    }));

    const cardStyles = [
        { border: "border-orange-100/80", hoverBorder: "hover:border-orange-200", accent: "from-primary-light to-primary-dark", iconGradient: "from-primary to-primary-dark", iconShadow: "shadow-orange-200/70", watermark: "text-orange-300/20" },
        { border: "border-emerald-100/80", hoverBorder: "hover:border-emerald-200", accent: "from-emerald-400 to-emerald-600", iconGradient: "from-emerald-400 to-emerald-600", iconShadow: "shadow-emerald-200/70", watermark: "text-emerald-300/20" },
        { border: "border-amber-100/80", hoverBorder: "hover:border-amber-200", accent: "from-amber-400 to-amber-600", iconGradient: "from-amber-400 to-amber-600", iconShadow: "shadow-amber-200/70", watermark: "text-amber-300/20" },
        { border: "border-rose-100/80", hoverBorder: "hover:border-rose-200", accent: "from-rose-400 to-rose-600", iconGradient: "from-rose-400 to-rose-600", iconShadow: "shadow-rose-200/70", watermark: "text-rose-300/20" },
        { border: "border-blue-100/80", hoverBorder: "hover:border-blue-200", accent: "from-blue-400 to-blue-600", iconGradient: "from-blue-400 to-blue-600", iconShadow: "shadow-blue-200/70", watermark: "text-blue-300/20" },
        { border: "border-cyan-100/80", hoverBorder: "hover:border-cyan-200", accent: "from-cyan-400 to-cyan-600", iconGradient: "from-cyan-400 to-cyan-600", iconShadow: "shadow-cyan-200/70", watermark: "text-cyan-300/20" },
        { border: "border-purple-100/80", hoverBorder: "hover:border-purple-200", accent: "from-purple-400 to-purple-600", iconGradient: "from-purple-400 to-purple-600", iconShadow: "shadow-purple-200/70", watermark: "text-purple-300/20" },
        { border: "border-violet-100/80", hoverBorder: "hover:border-violet-200", accent: "from-violet-400 to-violet-600", iconGradient: "from-violet-400 to-violet-600", iconShadow: "shadow-violet-200/70", watermark: "text-violet-300/20" },
    ];

    const quickActions = [
        { label: "Add Product", description: "Add an item to your catalog", icon: <FiBox size={19} />, color: "from-primary to-primary-dark", border: "hover:border-orange-200", path: "/admin/products/add" },
        { label: "New Order", description: "Create a shop order", icon: <FiShoppingBag size={19} />, color: "from-blue-500 to-blue-700", border: "hover:border-blue-200", path: "/admin/orders/shop-create" },
        { label: "Categories", description: "Manage product categories", icon: <FiGrid size={19} />, color: "from-emerald-400 to-emerald-600", border: "hover:border-emerald-200", path: "/admin/products/category" },
        { label: "Customers", description: "View customer accounts", icon: <FiUsers size={19} />, color: "from-violet-500 to-violet-700", border: "hover:border-violet-200", path: "/admin/users/all" },
        { label: "Stock Details", description: "Review available inventory", icon: <FiAlertTriangle size={19} />, color: "from-amber-400 to-amber-600", border: "hover:border-amber-200", path: "/admin/products/stock" },
        { label: "Top Header Offers", description: "Manage active promotions", icon: <FiTag size={19} />, color: "from-rose-500 to-rose-700", border: "hover:border-rose-200", path: "/admin/offers" },
        { label: "New Billing", description: "Open billing and create orders", icon: <FiCreditCard size={19} />, color: "from-cyan-500 to-cyan-700", border: "hover:border-cyan-200", path: "/admin/orders/billing" },
        { label: "Banners", description: "Manage promotional banners", icon: <FiImage size={19} />, color: "from-indigo-500 to-indigo-700", border: "hover:border-indigo-200", path: "/admin/banners" },
        { label: "Add Dealer", description: "Create or manage dealer accounts", icon: <FiBriefcase size={19} />, color: "from-teal-500 to-teal-700", border: "hover:border-teal-200", path: "/admin/dealers" },
        { label: "Coupons", description: "Manage discount coupons", icon: <FiPercent size={19} />, color: "from-fuchsia-500 to-fuchsia-700", border: "hover:border-fuchsia-200", path: "/admin/coupons" },
        { label: "Reviews", description: "Review customer feedback", icon: <FiStar size={19} />, color: "from-sky-500 to-sky-700", border: "hover:border-sky-200", path: "/admin/reviews" },
    ];

    return (
        <div className="space-y-6 pb-12 min-h-screen">
            <Toaster position="top-right" />

            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((stat, i) => {
                    const style = cardStyles[i % cardStyles.length];
                    return (
                        <div key={i} className={`group relative flex min-h-36 items-center gap-4 overflow-hidden rounded-xl border ${style.border} bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 ${style.hoverBorder} hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]`}>
                            <div className={`absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b ${style.accent}`} />
                            <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${style.iconGradient} text-white shadow-lg ${style.iconShadow} transition-transform duration-200 group-hover:scale-105`}>
                                {getStatIcon(stat.icon)}
                            </div>
                            <div className="relative z-10">
                                <p className="mb-1 text-xs font-bold tracking-wide text-secondary-light">{stat.label}</p>
                                <h3 className="mb-1 text-3xl font-black leading-none text-secondary-dark">{stat.value}</h3>
                                <p className="text-[10px] font-medium text-stone-500">{stat.description || "Summary"}</p>
                            </div>
                            {getStatIcon(stat.icon, `pointer-events-none absolute -right-1 bottom-1 ${style.watermark}`, 60)}
                        </div>
                    );
                })}
            </div>

            {stockAlertCount > 0 && (
                <button type="button" onClick={() => navigate("/admin/products/stock")} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-amber-900 transition-colors hover:bg-amber-100">
                    <span className="flex items-center gap-3">
                        <FiAlertTriangle className="shrink-0 text-amber-600" size={20} />
                        <span><b>{stockAlertCount} product{stockAlertCount === 1 ? "" : "s"}</b> at or below their reorder level.</span>
                    </span>
                    <span className="shrink-0 text-sm font-bold">Review stock →</span>
                </button>
            )}

            

            {/* Middle Section: Charts & Low Stock */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Sales Overview Bar Chart */}
                <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Sales Overview</h3>
                        <label className="flex items-center gap-2 text-xs text-gray-500 border border-gray-200 rounded px-2 py-1">
                            <FiClock />
                            <select
                                value={salesRange}
                                onChange={(event) => {
                                    const range = event.target.value;
                                    setSalesRange(range);
                                    fetchDashboardData(range);
                                }}
                                className="bg-transparent text-xs text-gray-600 outline-none cursor-pointer"
                            >
                                {salesRangeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div className="flex-1 min-h-[250px]">
                        <Bar data={barChartData} options={barChartOptions} />
                    </div>
                </div>

                {/* Orders Overview Pie Chart */}
                <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Orders Overview</h3>
                    <div className="flex flex-col flex-1">
                        <div className="relative h-40 flex items-center justify-center mb-6">
                            <Doughnut data={doughnutData} options={doughnutOptions} />
                            <div className="absolute flex flex-col items-center">
                                <span className="text-xl font-bold text-slate-800">{totalOrders.toLocaleString('en-IN')}</span>
                                <span className="text-xs text-gray-500">Total Orders</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {orderStats.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <div className={`w-2 h-2 rounded ${item.color}`}></div>
                                        {item.label}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800">{item.count}</span>
                                        <span className="text-gray-400">({item.pct})</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Low Stock Alert */}
                <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Low Stock Alert</h3>
                        <a href="#" className="text-xs font-bold text-purple-600 hover:underline">View All</a>
                    </div>
                    <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px]">
                        {lowStockAlerts.map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <img
                                    src={getDashboardImageUrl(item.img)}
                                    alt={item.name}
                                    className="w-10 h-10 rounded object-cover border border-gray-200"
                                    onError={(event) => {
                                        event.currentTarget.onerror = null;
                                        event.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=EDE9FE&color=7C3AED`;
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                                    <p className="text-xs text-gray-500">Stock: <span className="text-red-500 font-bold">{item.stock}</span></p>
                                </div>
                                <span className="text-[10px] bg-red-50 text-red-500 px-2 py-1 rounded font-semibold whitespace-nowrap">Low Stock</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* Quick Actions */}
            <div className="rounded-2xl border border-orange-100/70 bg-white/90 p-5 shadow-[0_8px_24px_rgba(74,46,25,0.06)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base font-black text-slate-800">Quick Actions</h3>
                        <p className="mt-0.5 text-xs text-stone-500">Jump to common admin tasks</p>
                    </div>
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                        {quickActions.length} shortcuts
                    </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
                    {quickActions.map((action) => (
                        <button
                            key={action.label}
                            type="button"
                            onClick={() => navigate(action.path)}
                            className={`group relative flex min-h-20 items-center gap-2 overflow-hidden rounded-xl border border-orange-100/80 bg-white/95 px-2.5 py-3 text-left shadow-[0_8px_24px_rgba(74,46,25,0.06)] transition-all duration-200 hover:-translate-y-0.5 ${action.border} hover:shadow-[0_14px_30px_rgba(74,46,25,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40`}
                        >
                            <span className={`absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b ${action.color}`} />
                            <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-lg transition-transform duration-200 group-hover:scale-105 ${action.color}`}>
                                {action.icon}
                            </div>
                            <span className="relative z-10 min-w-0 flex-1">
                                <span className="block truncate text-xs font-bold text-slate-800 xl:text-sm">{action.label}</span>
                                <span className="mt-0.5 hidden truncate text-[11px] text-stone-500 xl:block">{action.description}</span>
                            </span>
                            <FiArrowUpRight className="relative z-10 hidden shrink-0 text-stone-400 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-orange-600 xl:block" size={16} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Bottom Section: Recent Orders & Top Selling */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Recent Orders */}
                <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-base font-black text-slate-800">Recent Orders</h3>
                        <button onClick={() => navigate('/admin/orders/all')} className="text-xs font-bold text-purple-600 hover:underline">View All →</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-[11px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                    <th className="pb-3 font-bold">Order ID</th>
                                    <th className="pb-3 font-bold">Customer</th>
                                    <th className="pb-3 font-bold">Date</th>
                                    <th className="pb-3 font-bold">Amount</th>
                                    <th className="pb-3 font-bold">Status</th>
                                    <th className="pb-3 font-bold text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {recentOrders && recentOrders.length > 0 ? recentOrders.map((order, i) => (
                                    <tr key={i} className="hover:bg-slate-50/60 transition-colors group">
                                        <td className="py-3 font-bold text-purple-600 text-xs">{order.id}</td>
                                        <td className="py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                                                    {(order.customer || 'G').charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-slate-800 text-xs truncate max-w-[100px]">{order.customer}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 text-gray-400 text-xs">{formatOrderDate(order.date)}</td>
                                        <td className="py-3 font-bold text-slate-800 text-xs">{order.amount}</td>
                                        <td className="py-3">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${getStatusStyle(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="py-3 text-center">
                                            <button
                                                onClick={() => navigate(`/admin/orders/${order.numericId ?? order.id.replace('#ORD-0', '')}`)}
                                                className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mx-auto hover:bg-purple-600 hover:text-white transition-all"
                                            >
                                                <FiEye size={13} />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="py-10 text-center text-gray-400 text-sm font-semibold">No recent orders found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Selling Sarees */}
                <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-base font-black text-slate-800">Top Selling Sarees</h3>
                        <button onClick={() => navigate('/admin/products/all')} className="text-xs font-bold text-purple-600 hover:underline">View All →</button>
                    </div>
                    <div className="space-y-3">
                        {topProducts && topProducts.length > 0 ? topProducts.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group">
                                <div className="relative shrink-0">
                                    <img
                                        src={getDashboardImageUrl(item.img)}
                                        alt={item.name}
                                        className="w-12 h-12 rounded-xl object-cover border border-gray-100"
                                        onError={(event) => {
                                            event.currentTarget.onerror = null;
                                            event.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=EDE9FE&color=7C3AED`;
                                        }}
                                    />
                                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white text-[9px] font-black flex items-center justify-center shadow">
                                        {i + 1}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                                    <p className="text-[10px] text-gray-400 font-medium">{item.cat}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-black text-purple-600">{item.sales}</p>
                                    <p className="text-[10px] text-gray-400">sold</p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-gray-400 text-sm font-semibold py-8">No data available</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
