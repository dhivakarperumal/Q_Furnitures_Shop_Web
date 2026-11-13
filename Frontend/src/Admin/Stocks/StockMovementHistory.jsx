import { useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { FiDownload, FiFileText, FiSearch } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";

const transactionTypes = [
    "Opening Stock",
    "Purchase Stock",
    "Sales Invoice",
    "Invoice Cancellation",
    "Sales Return",
    "Stock Adjustment",
    "Damaged Stock",
    "Stock Transfer",
];

const columns = [
    { header: "Transaction ID", key: "transaction_id", width: 14 },
    { header: "Transaction Ref", key: "transaction_reference", width: 28 },
    { header: "Date", key: "created_at", width: 22 },
    { header: "Product", key: "product_name", width: 28 },
    { header: "SKU", key: "product_sku", width: 20 },
    { header: "Type", key: "transaction_type", width: 22 },
    { header: "Invoice", key: "invoice_number", width: 20 },
    { header: "Previous Stock", key: "previous_stock", width: 16 },
    { header: "Stock In", key: "stock_in", width: 12 },
    { header: "Stock Out", key: "stock_out", width: 12 },
    { header: "Damaged In", key: "damaged_in", width: 14 },
    { header: "Current Stock", key: "current_stock", width: 16 },
    { header: "Updated By", key: "updated_by", width: 18 },
    { header: "Remarks", key: "remarks", width: 36 },
];

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[character]);
}

function movementDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleString("en-IN");
}

export default function StockMovementHistory() {
    const [products, setProducts] = useState([]);
    const [movements, setMovements] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [filters, setFilters] = useState({
        product_id: "",
        invoice_id: "",
        from: "",
        to: "",
        type: "",
    });

    useEffect(() => {
        let mounted = true;
        const loadProducts = async () => {
            try {
                const first = await api.get("/stock", { params: { page: 1, limit: 100 } });
                const totalPages = Math.max(1, Number(first.data?.pagination?.totalPages) || 1);
                const rest = await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) =>
                    api.get("/stock", { params: { page: index + 2, limit: 100 } })));
                if (mounted) setProducts([first.data, ...rest.map((response) => response.data)].flatMap((data) => data.products || []));
            } catch (error) {
                console.error("Stock movement product filters failed to load:", error);
                toast.error(error.response?.data?.message || "Could not load products for stock filters.");
            }
        };
        loadProducts();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        let mounted = true;
        const loadMovements = async () => {
            setLoading(true);
            try {
                const response = await api.get("/stock/movements", {
                    params: { ...filters, page, limit: 25 },
                });
                if (!mounted) return;
                setMovements(response.data.movements || []);
                setPagination(response.data.pagination || { page: 1, totalPages: 1, total: 0 });
            } catch (error) {
                console.error("Stock movement history failed to load:", error);
                toast.error(error.response?.data?.message || "Could not load stock movement history.");
            } finally {
                if (mounted) setLoading(false);
            }
        };
        loadMovements();
        return () => { mounted = false; };
    }, [filters, page]);

    const filteredProductName = useMemo(() =>
        products.find((product) => String(product.id) === filters.product_id)?.name || "", [products, filters.product_id]);

    const updateFilter = (key, value) => {
        setFilters((current) => ({ ...current, [key]: value }));
        setPage(1);
    };

    const downloadFile = (blob, fileName) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const fetchAllFilteredMovements = async () => {
        const first = await api.get("/stock/movements", {
            params: { ...filters, page: 1, limit: 100 },
        });
        const totalPages = Math.max(1, Number(first.data?.pagination?.totalPages) || 1);
        if (totalPages > 500) throw new Error("Export is limited to 50,000 movements at a time. Add a narrower filter.");
        const rest = await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) =>
            api.get("/stock/movements", {
                params: { ...filters, page: index + 2, limit: 100 },
            })));
        return [first.data, ...rest.map((response) => response.data)].flatMap((data) => data.movements || []);
    };

    const exportMovements = async (format) => {
        let printWindow = null;
        setExporting(true);
        try {
            if (format === "pdf") {
                printWindow = window.open("", "_blank");
                if (!printWindow) throw new Error("Allow pop-ups to generate the PDF print view.");
            }
            const rows = await fetchAllFilteredMovements();
            if (!rows.length) throw new Error("There are no stock movements to export.");
            if (format === "pdf") {
                const header = columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join("");
                const body = rows.map((row) => `<tr>${columns.map((column) => {
                    const value = column.key === "created_at" ? movementDate(row[column.key]) : row[column.key];
                    return `<td>${escapeHtml(value)}</td>`;
                }).join("")}</tr>`).join("");
                printWindow.document.write(`<!doctype html><html><head><title>Stock Movement History</title>
                    <style>body{font-family:Arial,sans-serif;padding:20px;color:#222}h1{font-size:20px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#eee}@media print{button{display:none}}</style>
                    </head><body><h1>Stock Movement History</h1><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>
                    <script>window.onload=()=>window.print()</script></body></html>`);
                printWindow.document.close();
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Stock Movements");
            worksheet.columns = columns;
            const exportRows = rows.map((row) => ({ ...row, created_at: movementDate(row.created_at) }));
            worksheet.addRows(format === "csv"
                ? exportRows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [
                    key,
                    typeof value === "string" && /^[=+\-@]/.test(value) ? `'${value}` : value,
                ])))
                : exportRows);
            const buffer = format === "csv" ? await workbook.csv.writeBuffer() : await workbook.xlsx.writeBuffer();
            const type = format === "csv" ? "text/csv;charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            downloadFile(new Blob([buffer], { type }), `stock-movements.${format === "excel" ? "xlsx" : "csv"}`);
            toast.success("Stock movements exported.");
        } catch (error) {
            if (printWindow && !printWindow.closed) printWindow.close();
            console.error("Stock movement export failed:", error);
            toast.error(error.response?.data?.message || error.message || "Could not export stock movements.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <main className="space-y-6 pb-10">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">Inventory</p>
                    <h1 className="text-2xl font-black text-secondary-dark">Stock Movement History</h1>
                    <p className="mt-1 text-sm text-gray-500">Audit every stock receipt, sale, adjustment, and reversal.</p>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={() => exportMovements("excel")} disabled={exporting} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-secondary-dark shadow-sm hover:border-orange-200 disabled:opacity-50">
                        <FiDownload /> Excel
                    </button>
                    <button type="button" onClick={() => exportMovements("pdf")} disabled={exporting} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-dark disabled:opacity-50">
                        <FiFileText /> PDF
                    </button>
                </div>
            </header>

            <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                    <label className="space-y-1 text-xs font-bold text-slate-600 xl:col-span-2">Product
                        <select value={filters.product_id} onChange={(event) => updateFilter("product_id", event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal">
                            <option value="">All products</option>
                            {products.map((product) => <option key={product.id} value={product.id}>{product.name} {product.product_code ? `(${product.product_code})` : ""}</option>)}
                        </select>
                    </label>
                    <label className="space-y-1 text-xs font-bold text-slate-600">Invoice ID
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="number" min="1" value={filters.invoice_id} onChange={(event) => updateFilter("invoice_id", event.target.value)} placeholder="Invoice ID" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 pl-9 text-sm font-normal" />
                        </div>
                    </label>
                    <label className="space-y-1 text-xs font-bold text-slate-600">From
                        <input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => updateFilter("from", event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal" />
                    </label>
                    <label className="space-y-1 text-xs font-bold text-slate-600">To
                        <input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => updateFilter("to", event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal" />
                    </label>
                    <label className="space-y-1 text-xs font-bold text-slate-600">Transaction type
                        <select value={filters.type} onChange={(event) => updateFilter("type", event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal">
                            <option value="">All types</option>
                            {transactionTypes.map((type) => <option key={type}>{type}</option>)}
                        </select>
                    </label>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                    <p className="text-sm text-gray-500">
                        {pagination.total || 0} movements{filteredProductName ? ` · ${filteredProductName}` : ""}
                    </p>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setFilters({ product_id: "", invoice_id: "", from: "", to: "", type: "" })} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50">Clear filters</button>
                        <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold disabled:opacity-40">Previous</button>
                        <span className="text-xs font-semibold text-slate-600">Page {pagination.page || page} of {pagination.totalPages || 1}</span>
                        <button type="button" onClick={() => setPage((current) => Math.min(pagination.totalPages || 1, current + 1))} disabled={page >= (pagination.totalPages || 1) || loading} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold disabled:opacity-40">Next</button>
                    </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full min-w-[1450px] text-left text-sm">
                        <thead className="bg-gradient-to-r from-secondary-dark to-secondary-light text-[10px] uppercase tracking-wider text-[#FCD34D]">
                            <tr>{columns.map((column) => <th key={column.key} className="px-3 py-3">{column.header}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={columns.length} className="p-12 text-center text-gray-500">Loading stock movements...</td></tr>
                            ) : movements.length ? movements.map((movement) => (
                                <tr key={movement.id} className="hover:bg-orange-50/40">
                                    {columns.map((column) => {
                                        const value = column.key === "created_at"
                                            ? movementDate(movement[column.key])
                                            : column.key === "invoice_number"
                                                ? movement.invoice_number || (movement.invoice_id ? `#${movement.invoice_id}` : "—")
                                                : movement[column.key] ?? "—";
                                        return <td key={column.key} className="max-w-64 truncate px-3 py-3 text-slate-600" title={String(value)}>{value}</td>;
                                    })}
                                </tr>
                            )) : (
                                <tr><td colSpan={columns.length} className="p-12 text-center text-gray-400">No stock movements match these filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}
