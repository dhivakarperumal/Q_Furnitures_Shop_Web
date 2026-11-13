import React, { useState, useEffect, useContext } from "react";
import { useAdmin } from "../../PrivateRouter/AdminContext";
import api from "../../api";
import { toast, Toaster } from "react-hot-toast";
import {
    FiBarChart2,
    FiPieChart,
    FiTrendingUp,
    FiActivity,
    FiDownload,
    FiCalendar,
    FiArrowUpRight,
    FiArrowDownLeft
} from "react-icons/fi";
import { formatCurrency } from "../../utils/currency";

const Reports = () => {
    const { reportsCache, setReportsCache } = useAdmin();
    const [reportsData, setReportsData] = useState(reportsCache);
    const [loading, setLoading] = useState(!reportsCache);

    useEffect(() => {
        const fetchReports = async () => {
            if (!reportsCache) setLoading(true);
            try {
                const res = await api.get('/reports');
                setReportsData(res.data);
                setReportsCache(res.data);
            } catch (error) {
                console.error("Failed to load reports:", error);
                toast.error("Failed to load analytical reports");
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    const getStatIcon = (label) => {
        switch (label) {
            case "Gross Profit": return <FiTrendingUp />;
            case "New Customers": return <FiActivity />;
            case "Avg. Order Value": return <FiPieChart />;
            case "Cancel Rate": return <FiBarChart2 />;
            default: return <FiBarChart2 />;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Compiling Reports Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <Toaster position="top-right" />
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>

                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
                        <FiCalendar /> Last 12 Months
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-100">
                        <FiDownload /> Download PDF
                    </button>
                </div>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {reportsData?.stats?.map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ${[
                            "bg-gradient-to-br from-blue-500 to-indigo-600",
                            "bg-gradient-to-br from-emerald-400 to-teal-500",
                            "bg-gradient-to-br from-orange-400 to-amber-500",
                            "bg-gradient-to-br from-rose-400 to-pink-500"
                        ][i] || "bg-gradient-to-br from-slate-500 to-slate-700"}`}>
                            {getStatIcon(stat.label)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-400 font-medium truncate">{stat.label}</p>
                            <h3 className="text-3xl font-black text-slate-800 leading-none my-1">{stat.value}</h3>
                            <span className={`inline-block text-[10px] font-black ${stat.color} bg-gray-50 px-2 py-0.5 rounded-md border border-gray-50`}>
                                {stat.trend}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Charts Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Sales Comparison</h3>
                            <p className="text-sm text-gray-400 font-medium">Monthly performance vs last year</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                                <span className="text-xs font-bold text-gray-400">Current</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-gray-200 rounded-full"></span>
                                <span className="text-xs font-bold text-gray-400">Previous</span>
                            </div>
                        </div>
                    </div>
                    {/* Chart */}
                    <div className="h-64 flex items-end justify-between gap-4">
                        {reportsData?.monthlySales?.map((h, i) => {
                            // Find max value to normalize heights dynamically
                            const maxVal = Math.max(...(reportsData?.monthlySales || [1]));
                            const heightPct = maxVal > 0 ? (h / maxVal) * 100 : 0;
                            // Dummy previous month logic for comparison visually
                            const prevH = reportsData?.monthlySales[i === 0 ? 11 : i - 1] || 0;
                            const prevPct = maxVal > 0 ? (prevH / maxVal) * 100 : 0;

                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group-hover:cursor-pointer" title={`Sales: ${formatCurrency(h)}`}>
                                    <div className="w-full flex items-end gap-1 h-48">
                                        <div className="flex-1 bg-gray-100 rounded-t-lg transition-all" style={{ height: `${prevPct}%` }}></div>
                                        <div className="flex-1 bg-blue-500 rounded-t-lg transition-all" style={{ height: `${heightPct}%` }}></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-300">M{i + 1}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Category Distribution</h3>
                    <p className="text-sm text-gray-400 font-medium mb-8">Sales percentage by saree types</p>

                    <div className="space-y-6">
                        {reportsData?.categoryDistribution?.map((cat, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                                    <span className="text-gray-400">{cat.label}</span>
                                    <span className="text-slate-700">{cat.percent}%</span>
                                </div>
                                <div className="h-2.5 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                    <div className={`${cat.color} h-full rounded-full transition-all duration-1000`} style={{ width: `${cat.percent}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
