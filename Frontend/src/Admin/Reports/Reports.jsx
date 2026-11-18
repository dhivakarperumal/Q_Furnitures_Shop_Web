import React, { useEffect, useMemo, useState } from "react";
import {
    FiActivity,
    FiAlertCircle,
    FiBarChart2,
    FiBriefcase,
    FiCreditCard,
    FiDollarSign,
    FiDownload,
    FiEye,
    FiFileText,
    FiFilter,
    FiGrid,
    FiList,
    FiPackage,
    FiPlus,
    FiPrinter,
    FiSearch,
    FiShoppingCart,
    FiTrendingUp,
    FiX,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";
import { formatCurrency } from "../../utils/currency";

const REPORTS = [
    ["sales", "Sales Report"],
    ["purchases", "Purchase Report"],
    ["products", "Product Report"],
    ["categories", "Category Report"],
    ["inventory", "Inventory / Stock"],
    ["customers", "Customer Report"],
    ["suppliers", "Supplier Report"],
    ["payments", "Payment Report"],
    ["gst", "GST Report"],
    ["expenses", "Expense Report"],
    ["profit-loss", "Profit & Loss"],
    ["sales-returns", "Sales Return"],
    ["purchase-returns", "Purchase Return"],
    ["orders", "Order Report"],
    ["deliveries", "Delivery Report"],
    ["outstanding", "Outstanding Report"],
];

const PERIODS = [
    ["today", "Today"],
    ["yesterday", "Yesterday"],
    ["this-week", "This Week"],
    ["this-month", "This Month"],
    ["last-month", "Last Month"],
    ["this-year", "This Year"],
    ["custom", "Custom range"],
    ["all", "All time"],
];

const SUMMARY_CARDS = [
    ["totalSales", "Total Sales", "money"],
    ["totalOrders", "Total Orders", "number"],
    ["totalPurchase", "Total Purchase", "money"],
    ["totalRevenue", "Total Revenue", "money"],
    ["grossProfit", "Gross Profit", "money"],
    ["netProfit", "Net Profit", "money"],
    ["totalExpenses", "Total Expenses", "money"],
    ["pendingPayments", "Pending Payments", "money"],
    ["totalGst", "Total GST (net)", "money"],
    ["availableStock", "Available Stock", "number"],
];

const SUMMARY_STYLES = [
    { icon: FiDollarSign, gradient: "from-primary to-primary-dark", accent: "from-primary-light to-primary-dark", border: "border-orange-100/80 hover:border-orange-200", shadow: "shadow-orange-200/70", watermark: "text-orange-300/20" },
    { icon: FiShoppingCart, gradient: "from-emerald-400 to-emerald-600", accent: "from-emerald-400 to-emerald-600", border: "border-emerald-100/80 hover:border-emerald-200", shadow: "shadow-emerald-200/70", watermark: "text-emerald-300/20" },
    { icon: FiPackage, gradient: "from-amber-400 to-amber-600", accent: "from-amber-400 to-amber-600", border: "border-amber-100/80 hover:border-amber-200", shadow: "shadow-amber-200/70", watermark: "text-amber-300/20" },
    { icon: FiTrendingUp, gradient: "from-blue-400 to-blue-600", accent: "from-blue-400 to-blue-600", border: "border-blue-100/80 hover:border-blue-200", shadow: "shadow-blue-200/70", watermark: "text-blue-300/20" },
    { icon: FiBarChart2, gradient: "from-violet-400 to-violet-600", accent: "from-violet-400 to-violet-600", border: "border-violet-100/80 hover:border-violet-200", shadow: "shadow-violet-200/70", watermark: "text-violet-300/20" },
    { icon: FiActivity, gradient: "from-rose-400 to-rose-600", accent: "from-rose-400 to-rose-600", border: "border-rose-100/80 hover:border-rose-200", shadow: "shadow-rose-200/70", watermark: "text-rose-300/20" },
    { icon: FiBriefcase, gradient: "from-orange-400 to-orange-600", accent: "from-orange-400 to-orange-600", border: "border-orange-100/80 hover:border-orange-200", shadow: "shadow-orange-200/70", watermark: "text-orange-300/20" },
    { icon: FiCreditCard, gradient: "from-cyan-400 to-cyan-600", accent: "from-cyan-400 to-cyan-600", border: "border-cyan-100/80 hover:border-cyan-200", shadow: "shadow-cyan-200/70", watermark: "text-cyan-300/20" },
    { icon: FiAlertCircle, gradient: "from-pink-400 to-pink-600", accent: "from-pink-400 to-pink-600", border: "border-pink-100/80 hover:border-pink-200", shadow: "shadow-pink-200/70", watermark: "text-pink-300/20" },
    { icon: FiPackage, gradient: "from-slate-500 to-slate-700", accent: "from-slate-500 to-slate-700", border: "border-slate-200 hover:border-slate-300", shadow: "shadow-slate-200/70", watermark: "text-slate-300/30" },
];

const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Online", "Bank Transfer", "Cheque", "Credit"];
const PAGE_SIZES = [10, 25, 50, 100];
const FILTER_VISIBILITY = {
    product: new Set(["sales", "products", "categories", "inventory", "purchases", "sales-returns", "purchase-returns", "orders", "deliveries", "outstanding"]),
    category: new Set(["sales", "products", "categories", "inventory", "purchases", "sales-returns", "purchase-returns", "orders", "deliveries", "outstanding"]),
    customer: new Set(["sales", "customers", "payments", "sales-returns", "orders", "deliveries", "outstanding"]),
    supplier: new Set(["purchases", "suppliers", "payments", "purchase-returns", "outstanding"]),
    paymentMethod: new Set(["sales", "purchases", "payments", "expenses", "orders"]),
};

function todayString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function displayLabel(key) {
    return String(key)
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function recordKey(row, index) {
    return `${row.row_id ?? row.id ?? row.reference ?? "row"}-${row.product_id ?? row.product ?? ""}-${index}`;
}

function formatCell(value, key) {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number" && /amount|total|revenue|profit|expense|gst|taxable|paid|due|outstanding|cost|discount|spend|purchase/i.test(key)) {
        return formatCurrency(value, { compact: false });
    }
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    }[character]));
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function optionForProduct(options, productId) {
    return (options.products || []).find((product) => String(product.id) === String(productId));
}

function Reports() {
    const [reportType, setReportType] = useState("sales");
    const [filters, setFilters] = useState({
        period: "this-month",
        from: todayString(),
        to: todayString(),
        productId: "",
        category: "",
        customer: "",
        supplierId: "",
        paymentMethod: "",
    });
    const [summary, setSummary] = useState(null);
    const [rows, setRows] = useState([]);
    const [options, setOptions] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [optionsError, setOptionsError] = useState("");
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState("table");
    const [sort, setSort] = useState({ key: "", direction: "asc" });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [hiddenColumns, setHiddenColumns] = useState(["product_ids"]);
    const [detailRow, setDetailRow] = useState(null);
    const [sourceModal, setSourceModal] = useState("");
    const [savingSource, setSavingSource] = useState(false);
    const [form, setForm] = useState({});
    const [purchaseLines, setPurchaseLines] = useState([{ product_id: "", quantity: "1", unit_cost: "", gst_rate: "0" }]);
    const [reloadKey, setReloadKey] = useState(0);

    const activeReport = REPORTS.find(([id]) => id === reportType)?.[1] || "Report";
    const requestParams = useMemo(() => {
        const params = { period: filters.period };
        if (filters.period === "custom") {
            params.from = filters.from;
            params.to = filters.to;
        }
        return params;
    }, [filters.period, filters.from, filters.to]);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            api.get(`/reports/${reportType}`, { params: requestParams }),
            api.get("/reports/summary", { params: requestParams }),
        ]).then(([reportResponse, summaryResponse]) => {
            if (cancelled) return;
            setRows(Array.isArray(reportResponse.data?.rows) ? reportResponse.data.rows : []);
            setSummary(summaryResponse.data || null);
            setPage(1);
        }).catch((requestError) => {
            if (cancelled) return;
            const message = requestError.response?.data?.message || "Unable to load reports. Please try again.";
            setError(message);
            toast.error(message);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [reportType, requestParams, reloadKey]);

    useEffect(() => {
        let cancelled = false;
        api.get("/reports/options").then(({ data }) => {
            if (!cancelled) {
                setOptions(data || {});
                setOptionsError("");
            }
        }).catch((requestError) => {
            if (cancelled) return;
            const message = requestError.response?.data?.message || "Report filter options could not be loaded.";
            setOptionsError(message);
            toast.error(message);
        });
        return () => { cancelled = true; };
    }, [reloadKey]);

    const filteredRows = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        return rows.filter((row) => {
            if (normalizedSearch && !Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch))) {
                return false;
            }
            if (filters.productId) {
                const hasProduct = row.product_id !== undefined || row.product !== undefined ||
                    row.product_name !== undefined || row.product_ids !== undefined;
                if (hasProduct) {
                    const product = optionForProduct(options, filters.productId);
                    const productIds = String(row.product_ids || "").split(",");
                    const productNames = String(row.product ?? row.product_name ?? row.products ?? "")
                        .split(",").map((value) => value.trim());
                    if (String(row.product_id ?? "") !== filters.productId &&
                        !productIds.includes(filters.productId) &&
                        !productNames.includes(String(product?.name ?? ""))) return false;
                }
            }
            if (filters.category) {
                const categories = String(row.category ?? row.categories ?? "").split(",").map((value) => value.trim().toLowerCase());
                if ((row.category !== undefined || row.categories !== undefined) &&
                    !categories.includes(filters.category.toLowerCase())) return false;
            }
            if (filters.customer && (row.customer !== undefined || row.customer_name !== undefined || row.party !== undefined)) {
                const customer = String(row.customer ?? row.customer_name ?? row.party).toLowerCase();
                if (customer !== filters.customer.toLowerCase()) return false;
            }
            if (filters.supplierId) {
                const supplier = (options.suppliers || []).find((item) => String(item.id) === filters.supplierId);
                const hasSupplier = row.supplier_id !== undefined || row.supplier !== undefined || row.source === "Purchase";
                if (hasSupplier && String(row.supplier_id ?? "") !== filters.supplierId &&
                    String(row.supplier ?? (row.source === "Purchase" ? row.party : "") ?? "") !== String(supplier?.name ?? "")) return false;
                if (!hasSupplier && ["payments", "outstanding"].includes(reportType)) return false;
            }
            if (filters.paymentMethod && row.payment_method !== undefined &&
                String(row.payment_method).toLowerCase() !== filters.paymentMethod.toLowerCase()) return false;
            return true;
        });
    }, [rows, search, filters, options, reportType]);

    const salesTrend = useMemo(() => {
        if (reportType !== "sales") return [];
        const totals = new Map();
        filteredRows.forEach((row) => {
            const date = String(row.report_date || "").slice(0, 7);
            if (!/^\d{4}-\d{2}$/.test(date)) return;
            totals.set(date, (totals.get(date) || 0) + Number(row.revenue_ex_gst || 0));
        });
        return [...totals.entries()].sort(([first], [second]) => first.localeCompare(second)).slice(-12);
    }, [filteredRows, reportType]);

    const sortedRows = useMemo(() => {
        if (!sort.key) return filteredRows;
        return [...filteredRows].sort((first, second) => {
            const left = first[sort.key];
            const right = second[sort.key];
            const leftNumber = Number(left);
            const rightNumber = Number(right);
            let result;
            if (left !== "" && right !== "" && Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
                result = leftNumber - rightNumber;
            } else {
                result = String(left ?? "").localeCompare(String(right ?? ""), undefined, { numeric: true, sensitivity: "base" });
            }
            return sort.direction === "asc" ? result : -result;
        });
    }, [filteredRows, sort]);

    const allColumns = useMemo(() => sortedRows.length ? Object.keys(sortedRows[0]) : [], [sortedRows]);
    const visibleColumns = allColumns.filter((column) => !hiddenColumns.includes(column));
    const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
    const pageRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

    function updateFilter(key, value) {
        if (["period", "from", "to"].includes(key)) {
            setLoading(true);
            setError("");
        }
        setFilters((current) => ({ ...current, [key]: value }));
        setPage(1);
    }

    function toggleSort(key) {
        setSort((current) => ({
            key,
            direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
        }));
    }

    function openSource(mode) {
        const date = todayString();
        setSourceModal(mode);
        setForm({
            purchase_date: date,
            expense_date: date,
            return_date: date,
            paid_at: date,
            amount_paid: "0",
            payment_method: mode === "expense" || mode === "payment" ? "Cash" : "Credit",
        });
        setPurchaseLines([{ product_id: "", quantity: "1", unit_cost: "", gst_rate: "0" }]);
    }

    async function submitSource(event) {
        event.preventDefault();
        let url;
        let payload;
        if (sourceModal === "supplier") {
            url = "/reports/suppliers";
            payload = form;
        } else if (sourceModal === "purchase" || sourceModal === "opening") {
            url = "/reports/purchases";
            payload = {
                ...form,
                is_opening_stock: sourceModal === "opening",
                items: purchaseLines.map((item) => ({
                    ...item,
                    product_id: Number(item.product_id),
                    quantity: Number(item.quantity),
                    unit_cost: Number(item.unit_cost),
                    gst_rate: Number(item.gst_rate || 0),
                })),
            };
        } else if (sourceModal === "expense") {
            url = "/reports/expenses";
            payload = { ...form, amount: Number(form.amount) };
        } else if (sourceModal === "payment") {
            url = "/reports/purchase-payments";
            payload = {
                ...form,
                purchase_id: Number(form.purchase_id),
                amount: Number(form.amount),
            };
        } else if (sourceModal === "return") {
            const purchaseItem = (options.purchaseItems || []).find(
                (item) => String(item.purchase_item_id) === String(form.purchase_item_id),
            );
            if (!purchaseItem) {
                toast.error("Choose an eligible purchase item to return.");
                return;
            }
            url = "/reports/purchase-returns";
            payload = {
                purchase_id: Number(purchaseItem.purchase_id),
                return_date: form.return_date,
                reason: form.reason,
                items: [{
                    purchase_item_id: Number(purchaseItem.purchase_item_id),
                    quantity: Number(form.quantity),
                }],
            };
        } else {
            return;
        }
        setSavingSource(true);
        try {
            await api.post(url, payload);
            toast.success("Report record saved.");
            setSourceModal("");
            setLoading(true);
            setError("");
            setReloadKey((key) => key + 1);
        } catch (requestError) {
            toast.error(requestError.response?.data?.message || "Unable to save this record.");
        } finally {
            setSavingSource(false);
        }
    }

    function exportCsv() {
        if (!visibleColumns.length || !sortedRows.length) {
            toast.error("There are no filtered rows to export.");
            return;
        }
        const quote = (value) => {
            const text = typeof value === "string" && /^[\s]*[=+\-@]/.test(value) ? `'${value}` : String(value ?? "");
            return `"${text.replace(/"/g, '""')}"`;
        };
        const csv = [
            visibleColumns.map((column) => quote(displayLabel(column))).join(","),
            ...sortedRows.map((row) => visibleColumns.map((column) => quote(row[column])).join(",")),
        ].join("\r\n");
        downloadBlob(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }), `${reportType}-report.csv`);
    }

    async function exportExcel() {
        if (!visibleColumns.length || !sortedRows.length) {
            toast.error("There are no filtered rows to export.");
            return;
        }
        try {
            const { default: ExcelJS } = await import("exceljs");
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet(activeReport.slice(0, 31));
            sheet.columns = visibleColumns.map((column) => ({
                header: displayLabel(column),
                key: column,
                width: Math.min(Math.max(displayLabel(column).length + 4, 14), 32),
            }));
            sortedRows.forEach((row) => {
                const exported = {};
                visibleColumns.forEach((column) => { exported[column] = row[column] ?? ""; });
                sheet.addRow(exported);
            });
            sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
            sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF292524" } };
            const buffer = await workbook.xlsx.writeBuffer();
            downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${reportType}-report.xlsx`);
        } catch (exportError) {
            console.error("Report Excel export failed:", exportError);
            toast.error("Excel export failed. Please try again.");
        }
    }

    function printReport() {
        if (!visibleColumns.length || !sortedRows.length) {
            toast.error("There are no filtered rows to print.");
            return;
        }
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            toast.error("Allow pop-ups to print or save this report as PDF.");
            return;
        }
        const headers = visibleColumns.map((column) => `<th>${escapeHtml(displayLabel(column))}</th>`).join("");
        const body = sortedRows.map((row) => `<tr>${visibleColumns.map((column) =>
            `<td>${escapeHtml(formatCell(row[column], column))}</td>`).join("")}</tr>`).join("");
        printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(activeReport)}</title>
            <style>body{font:12px Arial,sans-serif;color:#292524;padding:24px}h1{font-size:20px;margin:0 0 6px}
            p{color:#78716c;margin:0 0 18px}table{width:100%;border-collapse:collapse}
            th,td{border:1px solid #d6d3d1;padding:7px;text-align:left;vertical-align:top}
            th{background:#f5f5f4}tr{break-inside:avoid}@media print{body{padding:0}}</style></head>
            <body><h1>${escapeHtml(activeReport)}</h1><p>${escapeHtml(summary?.range?.from || "")} – ${escapeHtml(summary?.range?.to || "")} · ${sortedRows.length} rows</p>
            <table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>
            <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}</script></body></html>`);
        printWindow.document.close();
    }

    const modalTitle = {
        supplier: "Add supplier",
        purchase: "Record purchase",
        opening: "Record opening stock value",
        expense: "Record expense",
        return: "Record purchase return",
        payment: "Record supplier payment",
    }[sourceModal];
    const supportsFilter = (name) => FILTER_VISIBILITY[name].has(reportType);

    return (
        <div className="min-h-screen space-y-5 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 text-secondary-dark">
            <section className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">
                {SUMMARY_CARDS.map(([key, label, type], index) => {
                    const value = summary?.[key];
                    const loadingValue = summary === null;
                    const incomplete = value === null;
                    const style = SUMMARY_STYLES[index];
                    const Icon = style.icon;
                    const formattedValue = loadingValue
                        ? "—"
                        : incomplete
                            ? "Incomplete"
                            : type === "money"
                                ? formatCurrency(Number(value), { compact: false })
                                : Number(value).toLocaleString("en-IN");
                    return (
                        <article key={key} className={`group relative flex min-h-24 items-center gap-3 overflow-hidden rounded-xl border bg-white/95 px-4 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)] sm:gap-4 sm:px-5 ${style.border}`}>
                            <div className={`absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b ${style.accent}`} />
                            <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-lg transition-transform duration-200 group-hover:scale-105 sm:h-12 sm:w-12 ${style.gradient} ${style.shadow}`}>
                                <Icon size={20} />
                            </div>
                            <div className="relative z-10 min-w-0">
                                <p className="mb-1 truncate text-xs font-bold tracking-wide text-secondary-light">{label}</p>
                                <p title={formattedValue} className={`truncate text-xl font-black leading-none sm:text-2xl ${key === "netProfit" && !incomplete && Number(value) < 0 ? "text-rose-600" : "text-secondary-dark"}`}>
                                    {formattedValue}
                                </p>
                                <p className="mt-1 text-[10px] font-medium text-stone-500">
                                    {incomplete ? "FIFO cost data needed" : "Selected date range"}
                                </p>
                            </div>
                            <div className={`pointer-events-none absolute -right-1 bottom-1 text-6xl ${style.watermark}`}><Icon /></div>
                        </article>
                    );
                })}
            </section>

            <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <label className="w-full text-xs font-bold text-secondary-light sm:w-64">Report period
                    <select value={filters.period} onChange={(event) => updateFilter("period", event.target.value)} className="mt-1 block w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-slate-600 outline-none transition-all hover:border-primary focus:border-primary focus:bg-white">
                        {PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </label>
                {filters.period === "custom" && <>
                    <label className="min-w-[150px] flex-1 text-xs font-bold text-secondary-light">From
                        <input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-primary focus:bg-white" />
                    </label>
                    <label className="min-w-[150px] flex-1 text-xs font-bold text-secondary-light">To
                        <input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-primary focus:bg-white" />
                    </label>
                </>}
                <details className="relative ml-auto">
                    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-900/20 transition-all hover:from-secondary-light hover:to-secondary-dark active:scale-95">
                        <FiPlus size={16} /> Add Source Record
                    </summary>
                    <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white p-2 shadow-xl">
                        {[
                            ["supplier", "New Supplier"],
                            ["purchase", "Record Purchase"],
                            ["opening", "Opening Stock Cost"],
                            ["expense", "Record Expense"],
                            ["payment", "Supplier Payment"],
                            ["return", "Purchase Return"],
                        ].map(([mode, label]) => (
                            <button key={mode} type="button" onClick={(event) => {
                                event.currentTarget.closest("details").open = false;
                                openSource(mode);
                            }} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-orange-50 hover:text-primary-dark">
                                {label}
                            </button>
                        ))}
                    </div>
                </details>
            </section>

            {reportType === "sales" && (
                <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-black">Sales trend</h2>
                            <p className="text-xs text-secondary-light">Revenue excluding GST, grouped by month</p>
                        </div>
                        <label className="text-xs font-bold text-secondary-light">
                            Report period
                            <select value={filters.period} onChange={(event) => updateFilter("period", event.target.value)} className="mt-1 block w-full min-w-44 cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-slate-600 outline-none transition-all hover:border-primary focus:border-primary focus:bg-white">
                                {PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </label>
                    </div>
                    {salesTrend.length ? (
                        <div className="flex h-44 items-end gap-3 overflow-x-auto border-b border-gray-100 px-2">
                            {salesTrend.map(([month, amount]) => {
                                const maximum = Math.max(...salesTrend.map((entry) => entry[1]), 1);
                                const height = Math.max(4, (amount / maximum) * 100);
                                const label = new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
                                return <div key={month} className="flex h-full min-w-12 flex-1 flex-col items-center justify-end gap-2" title={`${label}: ${formatCurrency(amount, { compact: false })}`}>
                                    <div className="w-full rounded-t-md bg-gradient-to-t from-primary-dark to-primary transition hover:from-secondary-light hover:to-secondary-dark" style={{ height: `${height}%` }} />
                                    <span className="pb-2 text-[10px] font-semibold text-secondary-light">{label}</span>
                                </div>;
                            })}
                        </div>
                    ) : <p className="text-sm text-secondary-light">No sales data is available for this range.</p>}
                </section>
            )}

            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-black text-secondary-dark">
                    <FiFilter className="text-orange-500" /> Report filters
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {supportsFilter("product") && <label className="text-xs font-bold text-secondary-light">Product
                        <select value={filters.productId} onChange={(event) => updateFilter("productId", event.target.value)} className="mt-1 block w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-slate-600 outline-none transition-all hover:border-primary focus:border-primary focus:bg-white">
                            <option value="">All products</option>
                            {(options.products || []).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                        </select>
                    </label>}
                    {supportsFilter("category") && <label className="text-xs font-bold text-secondary-light">Category
                        <select value={filters.category} onChange={(event) => updateFilter("category", event.target.value)} className="mt-1 block w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-slate-600 outline-none transition-all hover:border-primary focus:border-primary focus:bg-white">
                            <option value="">All categories</option>
                            {(options.categories || []).map((category) => <option key={category} value={category}>{category}</option>)}
                        </select>
                    </label>}
                    {supportsFilter("customer") && <label className="text-xs font-bold text-secondary-light">Customer
                        <select value={filters.customer} onChange={(event) => updateFilter("customer", event.target.value)} className="mt-1 block w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-slate-600 outline-none transition-all hover:border-primary focus:border-primary focus:bg-white">
                            <option value="">All customers</option>
                            {(options.customers || []).map((customer) => <option key={customer} value={customer}>{customer}</option>)}
                        </select>
                    </label>}
                    {supportsFilter("supplier") && <label className="text-xs font-bold text-secondary-light">Supplier
                        <select value={filters.supplierId} onChange={(event) => updateFilter("supplierId", event.target.value)} className="mt-1 block w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-slate-600 outline-none transition-all hover:border-primary focus:border-primary focus:bg-white">
                            <option value="">All suppliers</option>
                            {(options.suppliers || []).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                        </select>
                    </label>}
                    {supportsFilter("paymentMethod") && <label className="text-xs font-bold text-secondary-light">Payment method
                        <select value={filters.paymentMethod} onChange={(event) => updateFilter("paymentMethod", event.target.value)} className="mt-1 block w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-slate-600 outline-none transition-all hover:border-primary focus:border-primary focus:bg-white">
                            <option value="">All methods</option>
                            {(options.paymentMethods || PAYMENT_METHODS).map((method) => <option key={method} value={method}>{method}</option>)}
                        </select>
                    </label>}
                </div>
                {optionsError && <p className="mt-3 text-xs text-rose-600">{optionsError}</p>}
            </section>

            <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="border-b border-gray-100 p-4 sm:p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <h2 className="text-lg font-black">{activeReport}</h2>
                            <p className="text-xs font-medium text-secondary-light">
                                {summary?.range?.from || "—"} to {summary?.range?.to || "—"} · {filteredRows.length.toLocaleString("en-IN")} matching rows
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button onClick={exportCsv} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-secondary-dark transition-all hover:border-primary hover:bg-orange-50"><FiDownload className="mr-1 inline" /> CSV</button>
                            <button onClick={exportExcel} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-secondary-dark transition-all hover:border-primary hover:bg-orange-50"><FiFileText className="mr-1 inline" /> Excel</button>
                            <button onClick={printReport} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-secondary-dark transition-all hover:border-primary hover:bg-orange-50"><FiPrinter className="mr-1 inline" /> Print / PDF</button>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                        <label className="relative w-full shrink-0 lg:w-44">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search report..." className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary focus:bg-white" />
                        </label>
                        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
                            <label className="w-full sm:w-52">
                                <span className="sr-only">Select report</span>
                                <select value={reportType} onChange={(event) => {
                                    setLoading(true);
                                    setError("");
                                    setReportType(event.target.value);
                                    setHiddenColumns(["product_ids"]);
                                }} className="w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-bold text-slate-600 outline-none transition-all hover:border-primary focus:border-primary focus:bg-white">
                                    {REPORTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                                </select>
                            </label>
                            <details className="relative shrink-0">
                                <summary className="cursor-pointer list-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-bold text-slate-600 transition-all hover:border-primary"><FiFilter className="mr-1 inline" /> Columns</summary>
                                <div className="absolute right-0 z-20 mt-2 max-h-64 w-56 overflow-y-auto rounded-xl border border-gray-100 bg-white p-3 shadow-xl">
                                    {allColumns.length ? allColumns.map((column) => (
                                        <label key={column} className="flex items-center gap-2 py-1 text-sm">
                                            <input type="checkbox" className="accent-primary" checked={!hiddenColumns.includes(column)} onChange={() => setHiddenColumns((current) =>
                                                current.includes(column) ? current.filter((entry) => entry !== column) : [...current, column])} />
                                            <span className="text-slate-700">{displayLabel(column)}</span>
                                        </label>
                                    )) : <p className="text-xs text-gray-500">Columns appear when data is available.</p>}
                                </div>
                            </details>
                            <div className="flex shrink-0 items-center rounded-xl border border-gray-200 bg-gray-100 p-1" role="group" aria-label="Report display mode">
                                <button type="button" onClick={() => setViewMode("table")} title="Table view" aria-label="Table view" aria-pressed={viewMode === "table"} className={`rounded-lg p-2 transition-all ${viewMode === "table" ? "bg-white text-primary-dark shadow-sm" : "text-gray-400 hover:text-slate-600"}`}>
                                    <FiList size={17} />
                                </button>
                                <button type="button" onClick={() => setViewMode("grid")} title="Card view" aria-label="Card view" aria-pressed={viewMode === "grid"} className={`rounded-lg p-2 transition-all ${viewMode === "grid" ? "bg-white text-primary-dark shadow-sm" : "text-gray-400 hover:text-slate-600"}`}>
                                    <FiGrid size={17} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center rounded-b-2xl bg-white py-24" aria-label="Loading report">
                        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-primary" />
                        <p className="text-sm font-bold text-gray-400">Loading report data...</p>
                    </div>
                ) : error ? (
                    <div className="p-10 text-center">
                        <p className="font-bold text-rose-700">{error}</p>
                        <button onClick={() => { setLoading(true); setError(""); setReloadKey((key) => key + 1); }} className="mt-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-900/20 transition-all hover:from-secondary-light hover:to-secondary-dark">Retry</button>
                    </div>
                ) : sortedRows.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-primary/50"><FiSearch size={30} /></div>
                        <p className="text-sm font-bold text-slate-700">No report data found</p>
                        <p className="mt-1 text-xs text-gray-400">Try another date range or clear one or more filters</p>
                    </div>
                ) : (
                    <>
                        {viewMode === "table" ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gradient-to-r from-secondary-dark to-secondary-light text-xs uppercase tracking-wider text-[#FCD34D]">
                                        <tr>
                                            {visibleColumns.map((column) => (
                                                <th key={column} className="whitespace-nowrap px-4 py-4 first:rounded-tl-2xl">
                                                    <button onClick={() => toggleSort(column)} className="font-bold transition-colors hover:text-white">
                                                        {displayLabel(column)}{sort.key === column ? (sort.direction === "asc" ? " ↑" : " ↓") : ""}
                                                    </button>
                                                </th>
                                            ))}
                                            <th className="px-4 py-4 last:rounded-tr-2xl">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {pageRows.map((row, index) => (
                                            <tr key={recordKey(row, index)} className="group transition-colors hover:bg-orange-50/60">
                                                {visibleColumns.map((column) => <td key={column} className="max-w-xs px-4 py-4 text-slate-700">{formatCell(row[column], column)}</td>)}
                                                <td className="px-4 py-4">
                                                    <button onClick={() => setDetailRow(row)} title="View details" className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-primary-dark transition-all hover:bg-primary hover:text-white"><FiEye size={13} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                                {pageRows.map((row, index) => (
                                    <article key={recordKey(row, index)} className="rounded-xl border border-orange-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                                        <div className="mb-3 flex items-center justify-between gap-2">
                                            <strong className="truncate text-slate-800">{row.reference || row.product || row.customer || row.supplier || `${activeReport} #${index + 1}`}</strong>
                                            <button onClick={() => setDetailRow(row)} title="View details" aria-label="View details" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-primary-dark"><FiEye size={13} /></button>
                                        </div>
                                        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                                            {visibleColumns.map((column) => <div key={column} className="min-w-0">
                                                <dt className="truncate text-gray-400">{displayLabel(column)}</dt>
                                                <dd className="break-words font-semibold text-slate-700">{formatCell(row[column], column)}</dd>
                                            </div>)}
                                        </dl>
                                    </article>
                                ))}
                            </div>
                        )}
                        <footer className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-xs font-medium text-gray-500">Showing {Math.min((page - 1) * pageSize + 1, sortedRows.length)} to {Math.min(page * pageSize, sortedRows.length)} of {sortedRows.length} records</span>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-gray-500">Rows
                                    <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="ml-2 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-primary">
                                        {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                                    </select>
                                </label>
                                <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition-all hover:border-primary hover:text-primary-dark disabled:opacity-30">‹</button>
                                <span className="text-xs font-bold text-gray-500">{page} / {totalPages}</span>
                                <button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition-all hover:border-primary hover:text-primary-dark disabled:opacity-30">›</button>
                            </div>
                        </footer>
                    </>
                )}
            </section>

            {sourceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setSourceModal("");
                }}>
                    <form onSubmit={submitSource} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-100 bg-white p-5 shadow-2xl">
                        <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
                            <h2 className="text-xl font-black text-secondary-dark">{modalTitle}</h2>
                            <button type="button" onClick={() => setSourceModal("")} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-orange-50 hover:text-primary-dark"><FiX /></button>
                        </div>
                        {sourceModal === "supplier" && <div className="grid gap-3 sm:grid-cols-2">
                            <FormField label="Supplier name" required value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
                            <FormField label="Phone" required value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
                            <FormField label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
                            <FormField label="GSTIN" value={form.gstin} onChange={(value) => setForm({ ...form, gstin: value })} />
                            <FormField label="Contact person" value={form.contact_person} onChange={(value) => setForm({ ...form, contact_person: value })} />
                            <FormField label="Address" value={form.address} onChange={(value) => setForm({ ...form, address: value })} />
                        </div>}
                        {(sourceModal === "purchase" || sourceModal === "opening") && <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <FormField label="Date" type="date" required value={form.purchase_date} onChange={(value) => setForm({ ...form, purchase_date: value })} />
                                {sourceModal === "purchase" && <SelectField label="Supplier" required value={form.supplier_id || ""} onChange={(value) => setForm({ ...form, supplier_id: value })}>
                                    <option value="">Select supplier</option>
                                    {(options.suppliers || []).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                                </SelectField>}
                                <FormField label={sourceModal === "opening" ? "Opening stock note" : "Supplier bill number"} value={form.supplier_bill_number} onChange={(value) => setForm({ ...form, supplier_bill_number: value })} />
                                {sourceModal === "purchase" && <SelectField label="Payment method" value={form.payment_method || "Credit"} onChange={(value) => setForm({ ...form, payment_method: value })}>
                                    {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
                                </SelectField>}
                                {sourceModal === "purchase" && <FormField label="Amount paid" type="number" min="0" step="0.01" value={form.amount_paid || "0"} onChange={(value) => setForm({
                                    ...form,
                                    amount_paid: value,
                                    payment_method: Number(value) > 0 && form.payment_method === "Credit" ? "Cash" : form.payment_method,
                                })} />}
                            </div>
                            {sourceModal === "opening" && <p className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-900">This records opening-stock quantity and FIFO unit cost for valuation. It does not increase current stock again.</p>}
                            <div className="space-y-3">
                                {purchaseLines.map((line, index) => <div key={index} className="grid gap-2 rounded-xl border border-gray-100 bg-gray-50/50 p-3 sm:grid-cols-4">
                                    <SelectField label="Product" required value={line.product_id} onChange={(value) => setPurchaseLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, product_id: value } : item))}>
                                        <option value="">Select product</option>
                                        {(options.products || []).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                                    </SelectField>
                                    <FormField label="Quantity" type="number" min="1" step="1" required value={line.quantity} onChange={(value) => setPurchaseLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: value } : item))} />
                                    <FormField label="Unit cost" type="number" min="0" step="0.01" required value={line.unit_cost} onChange={(value) => setPurchaseLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unit_cost: value } : item))} />
                                    <FormField label="GST rate %" type="number" min="0" max="100" step="0.01" value={line.gst_rate} onChange={(value) => setPurchaseLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, gst_rate: value } : item))} />
                                </div>)}
                                <button type="button" onClick={() => setPurchaseLines((current) => [...current, { product_id: "", quantity: "1", unit_cost: "", gst_rate: "0" }])} className="text-sm font-bold text-primary-dark transition-colors hover:text-secondary-dark"><FiPlus className="mr-1 inline" /> Add item</button>
                            </div>
                        </div>}
                        {sourceModal === "expense" && <div className="grid gap-3 sm:grid-cols-2">
                            <FormField label="Date" type="date" required value={form.expense_date} onChange={(value) => setForm({ ...form, expense_date: value })} />
                            <FormField label="Category" required value={form.category} onChange={(value) => setForm({ ...form, category: value })} />
                            <FormField label="Description" required value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
                            <FormField label="Amount" type="number" min="0.01" step="0.01" required value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} />
                            <SelectField label="Payment method" value={form.payment_method || "Cash"} onChange={(value) => setForm({ ...form, payment_method: value })}>
                                {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
                            </SelectField>
                            <FormField label="Reference number" value={form.reference_number} onChange={(value) => setForm({ ...form, reference_number: value })} />
                        </div>}
                        {sourceModal === "payment" && <div className="grid gap-3 sm:grid-cols-2">
                            <SelectField label="Purchase" required value={form.purchase_id || ""} onChange={(value) => setForm({ ...form, purchase_id: value })}>
                                <option value="">Select purchase</option>
                                {(options.openPurchases || []).map((purchase) => <option key={purchase.purchase_id} value={purchase.purchase_id}>
                                    {purchase.purchase_number} · {purchase.supplier || "Opening stock"} · due {formatCurrency(Number(purchase.balance_due), { compact: false })}
                                </option>)}
                            </SelectField>
                            <FormField label="Payment date" type="date" required value={form.paid_at} onChange={(value) => setForm({ ...form, paid_at: value })} />
                            <FormField label="Amount" type="number" min="0.01" step="0.01" required value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} />
                            <SelectField label="Payment method" value={form.payment_method || "Cash"} onChange={(value) => setForm({ ...form, payment_method: value })}>
                                {PAYMENT_METHODS.filter((method) => method !== "Credit").map((method) => <option key={method}>{method}</option>)}
                            </SelectField>
                            <FormField label="Reference number" value={form.reference_number} onChange={(value) => setForm({ ...form, reference_number: value })} />
                        </div>}
                        {sourceModal === "return" && <div className="grid gap-3 sm:grid-cols-2">
                            <SelectField label="Purchase item" required value={form.purchase_item_id || ""} onChange={(value) => setForm({ ...form, purchase_item_id: value })}>
                                <option value="">Select purchase item</option>
                                {(options.purchaseItems || []).map((item) => <option key={item.purchase_item_id} value={item.purchase_item_id}>
                                    {item.purchase_number} · {item.product_name} · remaining {item.remaining_quantity}
                                </option>)}
                            </SelectField>
                            <FormField label="Quantity" type="number" required min="1" step="1" value={form.quantity || "1"} onChange={(value) => setForm({ ...form, quantity: value })} />
                            <FormField label="Return date" type="date" required value={form.return_date} onChange={(value) => setForm({ ...form, return_date: value })} />
                            <FormField label="Reason" required value={form.reason} onChange={(value) => setForm({ ...form, reason: value })} />
                        </div>}
                        <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
                            <button type="button" onClick={() => setSourceModal("")} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition-all hover:border-gray-300 hover:bg-gray-50">Cancel</button>
                            <button type="submit" disabled={savingSource} className="rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-900/20 transition-all hover:from-secondary-light hover:to-secondary-dark disabled:cursor-not-allowed disabled:opacity-60">
                                {savingSource ? "Saving..." : "Save record"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {detailRow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setDetailRow(null);
                }}>
                    <section className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-gray-100 bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="Report row details">
                        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
                            <h2 className="text-lg font-black text-secondary-dark">Record details</h2>
                            <button onClick={() => setDetailRow(null)} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-orange-50 hover:text-primary-dark"><FiX /></button>
                        </div>
                        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {Object.entries(detailRow).map(([key, value]) => <div key={key} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                                <dt className="text-xs font-semibold text-gray-500">{displayLabel(key)}</dt>
                                <dd className="mt-1 break-words text-sm font-bold text-slate-800">{formatCell(value, key)}</dd>
                            </div>)}
                        </dl>
                    </section>
                </div>
            )}
        </div>
    );
}

function FormField({ label, value = "", onChange, type = "text", required = false, ...props }) {
    return <label className="block text-xs font-bold text-slate-600">{label}
        <input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} {...props}
            className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-orange-100" />
    </label>;
}

function SelectField({ label, value, onChange, required = false, children }) {
    return <label className="block text-xs font-bold text-slate-600">{label}
        <select required={required} value={value} onChange={(event) => onChange(event.target.value)}
            className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-orange-100">
            {children}
        </select>
    </label>;
}

export default Reports;
