import React, { useEffect, useMemo, useState } from "react";
import {
    FiDownload,
    FiEye,
    FiFileText,
    FiFilter,
    FiPlus,
    FiPrinter,
    FiSearch,
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
        <div className="space-y-6 pb-12 text-stone-800">
            <header className="flex flex-col gap-4 rounded-2xl bg-stone-900 p-6 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Furniture retail ERP</p>
                    <h1 className="mt-1 text-2xl font-black">Reports & analytics</h1>
                    <p className="mt-1 text-sm text-stone-300">Review sales, stock, tax, purchases and profitability from recorded business data.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => openSource("supplier")} className="rounded-lg border border-stone-600 px-3 py-2 text-sm font-bold hover:bg-stone-800">
                        <FiPlus className="mr-1 inline" /> Supplier
                    </button>
                    <button onClick={() => openSource("purchase")} className="rounded-lg border border-stone-600 px-3 py-2 text-sm font-bold hover:bg-stone-800">
                        <FiPlus className="mr-1 inline" /> Purchase
                    </button>
                    <button onClick={() => openSource("opening")} className="rounded-lg border border-stone-600 px-3 py-2 text-sm font-bold hover:bg-stone-800">
                        <FiPlus className="mr-1 inline" /> Opening stock
                    </button>
                    <button onClick={() => openSource("expense")} className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-bold hover:bg-orange-600">
                        <FiPlus className="mr-1 inline" /> Expense
                    </button>
                    <button onClick={() => openSource("payment")} className="rounded-lg border border-stone-600 px-3 py-2 text-sm font-bold hover:bg-stone-800">
                        <FiPlus className="mr-1 inline" /> Supplier payment
                    </button>
                    <button onClick={() => openSource("return")} className="rounded-lg border border-stone-600 px-3 py-2 text-sm font-bold hover:bg-stone-800">
                        <FiPlus className="mr-1 inline" /> Purchase return
                    </button>
                </div>
            </header>

            {summary?.uncostedQuantity > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Profit is incomplete: FIFO cost is unavailable for {summary.uncostedQuantity} sold unit(s). Add opening-stock unit costs to value existing inventory.
                </div>
            )}

            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {SUMMARY_CARDS.map(([key, label, type]) => {
                    const value = summary?.[key];
                    const unavailable = value === null || value === undefined;
                    return (
                        <article key={key} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-semibold text-stone-500">{label}</p>
                            <p className={`mt-2 truncate text-lg font-black ${key === "netProfit" && !unavailable && Number(value) < 0 ? "text-rose-600" : "text-stone-900"}`}>
                                {unavailable ? "Incomplete" : type === "money" ? formatCurrency(Number(value), { compact: false }) : Number(value).toLocaleString("en-IN")}
                            </p>
                        </article>
                    );
                })}
            </section>

            {reportType === "sales" && (
                <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <div className="mb-4">
                        <h2 className="font-black">Sales trend</h2>
                        <p className="text-xs text-stone-500">Revenue excluding GST, grouped by month</p>
                    </div>
                    {salesTrend.length ? (
                        <div className="flex h-44 items-end gap-3 overflow-x-auto border-b border-stone-200 px-2">
                            {salesTrend.map(([month, amount]) => {
                                const maximum = Math.max(...salesTrend.map((entry) => entry[1]), 1);
                                const height = Math.max(4, (amount / maximum) * 100);
                                const label = new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
                                return <div key={month} className="flex h-full min-w-12 flex-1 flex-col items-center justify-end gap-2" title={`${label}: ${formatCurrency(amount, { compact: false })}`}>
                                    <div className="w-full rounded-t-md bg-orange-500 transition hover:bg-orange-600" style={{ height: `${height}%` }} />
                                    <span className="pb-2 text-[10px] font-semibold text-stone-500">{label}</span>
                                </div>;
                            })}
                        </div>
                    ) : <p className="text-sm text-stone-500">No sales data is available for this range.</p>}
                </section>
            )}

            <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-black text-stone-700">
                    <FiFilter className="text-orange-500" /> Report filters
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="text-xs font-bold text-stone-500">Date range
                        <select value={filters.period} onChange={(event) => updateFilter("period", event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800">
                            {PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </label>
                    {filters.period === "custom" && <>
                        <label className="text-xs font-bold text-stone-500">From
                            <input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
                        </label>
                        <label className="text-xs font-bold text-stone-500">To
                            <input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
                        </label>
                    </>}
                    {supportsFilter("product") && <label className="text-xs font-bold text-stone-500">Product
                        <select value={filters.productId} onChange={(event) => updateFilter("productId", event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
                            <option value="">All products</option>
                            {(options.products || []).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                        </select>
                    </label>}
                    {supportsFilter("category") && <label className="text-xs font-bold text-stone-500">Category
                        <select value={filters.category} onChange={(event) => updateFilter("category", event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
                            <option value="">All categories</option>
                            {(options.categories || []).map((category) => <option key={category} value={category}>{category}</option>)}
                        </select>
                    </label>}
                    {supportsFilter("customer") && <label className="text-xs font-bold text-stone-500">Customer
                        <select value={filters.customer} onChange={(event) => updateFilter("customer", event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
                            <option value="">All customers</option>
                            {(options.customers || []).map((customer) => <option key={customer} value={customer}>{customer}</option>)}
                        </select>
                    </label>}
                    {supportsFilter("supplier") && <label className="text-xs font-bold text-stone-500">Supplier
                        <select value={filters.supplierId} onChange={(event) => updateFilter("supplierId", event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
                            <option value="">All suppliers</option>
                            {(options.suppliers || []).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                        </select>
                    </label>}
                    {supportsFilter("paymentMethod") && <label className="text-xs font-bold text-stone-500">Payment method
                        <select value={filters.paymentMethod} onChange={(event) => updateFilter("paymentMethod", event.target.value)} className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
                            <option value="">All methods</option>
                            {(options.paymentMethods || PAYMENT_METHODS).map((method) => <option key={method} value={method}>{method}</option>)}
                        </select>
                    </label>}
                </div>
                {optionsError && <p className="mt-3 text-xs text-rose-600">{optionsError}</p>}
            </section>

            <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                <div className="border-b border-stone-200 p-4 sm:p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <h2 className="text-lg font-black">{activeReport}</h2>
                            <p className="text-xs text-stone-500">
                                {summary?.range?.from || "—"} to {summary?.range?.to || "—"} · {filteredRows.length.toLocaleString("en-IN")} matching rows
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button onClick={exportCsv} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-bold hover:bg-stone-50"><FiDownload className="mr-1 inline" /> CSV</button>
                            <button onClick={exportExcel} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-bold hover:bg-stone-50"><FiFileText className="mr-1 inline" /> Excel</button>
                            <button onClick={printReport} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-bold hover:bg-stone-50"><FiPrinter className="mr-1 inline" /> Print / PDF</button>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {REPORTS.map(([id, label]) => (
                                <button key={id} onClick={() => { setLoading(true); setError(""); setReportType(id); setHiddenColumns(["product_ids"]); }}
                                    className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition ${reportType === id ? "bg-orange-500 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <label className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search report..." className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-sm sm:w-52" />
                            </label>
                            <details className="relative">
                                <summary className="cursor-pointer list-none rounded-lg border border-stone-300 px-3 py-2 text-sm font-bold"><FiFilter className="mr-1 inline" /> Columns</summary>
                                <div className="absolute right-0 z-20 mt-2 max-h-64 w-56 overflow-y-auto rounded-xl border border-stone-200 bg-white p-3 shadow-xl">
                                    {allColumns.length ? allColumns.map((column) => (
                                        <label key={column} className="flex items-center gap-2 py-1 text-sm">
                                            <input type="checkbox" checked={!hiddenColumns.includes(column)} onChange={() => setHiddenColumns((current) =>
                                                current.includes(column) ? current.filter((entry) => entry !== column) : [...current, column])} />
                                            {displayLabel(column)}
                                        </label>
                                    )) : <p className="text-xs text-stone-500">Columns appear when data is available.</p>}
                                </div>
                            </details>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-3 p-5" aria-label="Loading report">
                        {[1, 2, 3, 4].map((item) => <div key={item} className="h-10 animate-pulse rounded-lg bg-stone-100" />)}
                    </div>
                ) : error ? (
                    <div className="p-10 text-center">
                        <p className="font-bold text-rose-700">{error}</p>
                        <button onClick={() => { setLoading(true); setError(""); setReloadKey((key) => key + 1); }} className="mt-3 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white">Retry</button>
                    </div>
                ) : sortedRows.length === 0 ? (
                    <div className="p-12 text-center">
                        <FiSearch className="mx-auto mb-3 text-3xl text-stone-300" />
                        <p className="font-bold text-stone-700">No report data found</p>
                        <p className="mt-1 text-sm text-stone-500">Try another date range or clear one or more filters.</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden overflow-x-auto md:block">
                            <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                                <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                                    <tr>
                                        {visibleColumns.map((column) => (
                                            <th key={column} className="whitespace-nowrap px-4 py-3">
                                                <button onClick={() => toggleSort(column)} className="font-bold hover:text-orange-600">
                                                    {displayLabel(column)}{sort.key === column ? (sort.direction === "asc" ? " ↑" : " ↓") : ""}
                                                </button>
                                            </th>
                                        ))}
                                        <th className="px-4 py-3">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {pageRows.map((row, index) => (
                                        <tr key={recordKey(row, index)} className="hover:bg-orange-50/40">
                                            {visibleColumns.map((column) => <td key={column} className="max-w-xs px-4 py-3 text-stone-700">{formatCell(row[column], column)}</td>)}
                                            <td className="px-4 py-3">
                                                <button onClick={() => setDetailRow(row)} title="View details" className="rounded-lg p-2 text-orange-600 hover:bg-orange-100"><FiEye /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="space-y-3 p-3 md:hidden">
                            {pageRows.map((row, index) => (
                                <article key={recordKey(row, index)} className="rounded-xl border border-stone-200 p-3">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <strong className="truncate">{row.reference || row.product || row.customer || row.supplier || `${activeReport} #${index + 1}`}</strong>
                                        <button onClick={() => setDetailRow(row)} className="rounded-lg p-2 text-orange-600"><FiEye /></button>
                                    </div>
                                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                                        {visibleColumns.slice(0, 8).map((column) => <div key={column} className="min-w-0">
                                            <dt className="truncate text-stone-400">{displayLabel(column)}</dt>
                                            <dd className="truncate font-semibold text-stone-700">{formatCell(row[column], column)}</dd>
                                        </div>)}
                                    </dl>
                                </article>
                            ))}
                        </div>
                        <footer className="flex flex-col gap-3 border-t border-stone-200 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-stone-500">Showing {Math.min((page - 1) * pageSize + 1, sortedRows.length)}–{Math.min(page * pageSize, sortedRows.length)} of {sortedRows.length}</span>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-stone-500">Rows
                                    <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="ml-2 rounded border border-stone-300 px-2 py-1 text-sm text-stone-700">
                                        {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                                    </select>
                                </label>
                                <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded border border-stone-300 px-3 py-1.5 font-bold disabled:opacity-40">Previous</button>
                                <span className="text-xs text-stone-500">{page} / {totalPages}</span>
                                <button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded border border-stone-300 px-3 py-1.5 font-bold disabled:opacity-40">Next</button>
                            </div>
                        </footer>
                    </>
                )}
            </section>

            {sourceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setSourceModal("");
                }}>
                    <form onSubmit={submitSource} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className="text-xl font-black">{modalTitle}</h2>
                            <button type="button" onClick={() => setSourceModal("")} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"><FiX /></button>
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
                            {sourceModal === "opening" && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">This records opening-stock quantity and FIFO unit cost for valuation. It does not increase current stock again.</p>}
                            <div className="space-y-3">
                                {purchaseLines.map((line, index) => <div key={index} className="grid gap-2 rounded-xl border border-stone-200 p-3 sm:grid-cols-4">
                                    <SelectField label="Product" required value={line.product_id} onChange={(value) => setPurchaseLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, product_id: value } : item))}>
                                        <option value="">Select product</option>
                                        {(options.products || []).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                                    </SelectField>
                                    <FormField label="Quantity" type="number" min="1" step="1" required value={line.quantity} onChange={(value) => setPurchaseLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: value } : item))} />
                                    <FormField label="Unit cost" type="number" min="0" step="0.01" required value={line.unit_cost} onChange={(value) => setPurchaseLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unit_cost: value } : item))} />
                                    <FormField label="GST rate %" type="number" min="0" max="100" step="0.01" value={line.gst_rate} onChange={(value) => setPurchaseLines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, gst_rate: value } : item))} />
                                </div>)}
                                <button type="button" onClick={() => setPurchaseLines((current) => [...current, { product_id: "", quantity: "1", unit_cost: "", gst_rate: "0" }])} className="text-sm font-bold text-orange-600"><FiPlus className="mr-1 inline" /> Add item</button>
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
                        <div className="mt-6 flex justify-end gap-2">
                            <button type="button" onClick={() => setSourceModal("")} className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-bold">Cancel</button>
                            <button type="submit" disabled={savingSource} className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60">
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
                    <section className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="Report row details">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-black">Record details</h2>
                            <button onClick={() => setDetailRow(null)} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"><FiX /></button>
                        </div>
                        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {Object.entries(detailRow).map(([key, value]) => <div key={key} className="rounded-lg bg-stone-50 p-3">
                                <dt className="text-xs font-semibold text-stone-500">{displayLabel(key)}</dt>
                                <dd className="mt-1 break-words text-sm font-bold text-stone-800">{formatCell(value, key)}</dd>
                            </div>)}
                        </dl>
                    </section>
                </div>
            )}
        </div>
    );
}

function FormField({ label, value = "", onChange, type = "text", required = false, ...props }) {
    return <label className="block text-xs font-bold text-stone-600">{label}
        <input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} {...props}
            className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal text-stone-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
    </label>;
}

function SelectField({ label, value, onChange, required = false, children }) {
    return <label className="block text-xs font-bold text-stone-600">{label}
        <select required={required} value={value} onChange={(event) => onChange(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-normal text-stone-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100">
            {children}
        </select>
    </label>;
}

export default Reports;
