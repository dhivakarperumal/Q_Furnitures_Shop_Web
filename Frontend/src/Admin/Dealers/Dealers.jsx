import { useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiDownload, FiEdit2, FiFileText, FiGrid, FiList, FiPlus, FiSearch, FiTrash2, FiTruck, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../api";
import AddDealerModal from "./AddDealerModal";

const currency = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const initialSummary = { total: 0, active: 0, inactive: 0, invoices: 0 };
const dealersPageSize = 25;

export default function Dealers() {
    const navigate = useNavigate();
    const [dealers, setDealers] = useState([]);
    const [summary, setSummary] = useState(initialSummary);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All");
    const [viewMode, setViewMode] = useState("table");
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingDealer, setEditingDealer] = useState(null);
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [paymentInvoice, setPaymentInvoice] = useState(null);
    const [creditInvoice, setCreditInvoice] = useState(null);
    const [paymentSaving, setPaymentSaving] = useState(false);
    const [creditSaving, setCreditSaving] = useState(false);
    const [paymentForm, setPaymentForm] = useState(() => ({ paid_at: new Date().toISOString().slice(0, 10), amount: "", payment_method: "Cash", transaction_id: "", reference_number: "", notes: "" }));
    const [creditForm, setCreditForm] = useState(() => ({ credit_date: new Date().toISOString().slice(0, 10), reason: "", notes: "", quantities: {} }));
    const currentPage = Number(pagination.page) || 1;
    const totalPages = Math.max(Number(pagination.totalPages) || 1, 1);
    const totalDealers = Number(pagination.total) || 0;
    const firstDealer = totalDealers ? (currentPage - 1) * dealersPageSize + 1 : 0;
    const lastDealer = Math.min(currentPage * dealersPageSize, totalDealers);
    const firstVisiblePage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const visiblePages = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => firstVisiblePage + index);

    useEffect(() => {
        let current = true;
        api.get("/dealers", { params: { page: pagination.page, limit: dealersPageSize, search, status } })
            .then((response) => {
                if (!current) return;
                setDealers(response.data.dealers || []);
                setSummary(response.data.summary || initialSummary);
                setPagination(response.data.pagination || { page: 1, totalPages: 1, total: 0 });
            })
            .catch((error) => {
                if (!current) return;
                console.error("Dealer list request failed:", error);
                toast.error(error.response?.data?.message || "Could not load dealers.");
            })
            .finally(() => { if (current) setLoading(false); });
        return () => { current = false; };
    }, [pagination.page, search, status]);

    const reloadDealers = async () => {
        setLoading(true);
        try {
            const response = await api.get("/dealers", {
                params: { page: pagination.page, limit: dealersPageSize, search, status },
            });
            setDealers(response.data.dealers || []);
            setSummary(response.data.summary || initialSummary);
            setPagination(response.data.pagination || { page: 1, totalPages: 1, total: 0 });
        } catch (error) {
            console.error("Dealer list request failed:", error);
            toast.error(error.response?.data?.message || "Could not load dealers.");
        } finally {
            setLoading(false);
        }
    };

    const openProfile = async (dealer) => {
        setProfileLoading(true);
        setProfile({ ...dealer, invoices: [], ledger: [] });
        try {
            const response = await api.get(`/dealers/${dealer.id}`);
            setProfile(response.data.dealer);
        } catch (error) {
            console.error("Dealer profile request failed:", error);
            toast.error(error.response?.data?.message || "Could not load dealer history.");
        } finally {
            setProfileLoading(false);
        }
    };

    const removeDealer = async (dealer) => {
        if (!window.confirm(`Delete ${dealer.name}? This action cannot be undone.`)) return;
        try {
            await api.delete(`/dealers/${dealer.id}`);
            toast.success("Dealer deleted.");
            await reloadDealers();
        } catch (error) {
            toast.error(error.response?.data?.message || "Dealer could not be deleted.");
        }
    };

    const exportCsv = async () => {
        const columns = ["dealer_code", "name", "company_name", "contact_person", "mobile", "email", "gstin", "dealer_type", "city", "state", "status", "total_invoices", "total_purchases", "outstanding_balance"];
        const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
        setExporting(true);
        try {
            const first = await api.get("/dealers", { params: { page: 1, limit: 100, search, status } });
            const pageCount = Math.max(1, Number(first.data.pagination?.totalPages) || 1);
            const remaining = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) =>
                api.get("/dealers", { params: { page: index + 2, limit: 100, search, status } })));
            const rows = [first.data, ...remaining.map((response) => response.data)].flatMap((page) => page.dealers || []);
            const csv = [columns.join(","), ...rows.map((dealer) => columns.map((column) => quote(dealer[column])).join(","))].join("\r\n");
            const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = "dealers.csv";
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Dealer export failed:", error);
            toast.error(error.response?.data?.message || "Dealer export failed.");
        } finally {
            setExporting(false);
        }
    };

    const savePayment = async (event) => {
        event.preventDefault();
        if (!paymentInvoice) return;
        const amount = Number(paymentForm.amount);
        if (!Number.isFinite(amount) || amount <= 0 || amount > Number(paymentInvoice.balance_due)) {
            toast.error("Enter a payment amount within the remaining balance.");
            return;
        }
        setPaymentSaving(true);
        try {
            await api.post(`/invoices/${paymentInvoice.id}/payments`, { ...paymentForm, amount });
            toast.success("Payment recorded.");
            setPaymentInvoice(null);
            setPaymentForm({ paid_at: new Date().toISOString().slice(0, 10), amount: "", payment_method: "Cash", transaction_id: "", reference_number: "", notes: "" });
            await openProfile(profile);
            await reloadDealers();
        } catch (error) {
            console.error("Payment recording failed:", error);
            toast.error(error.response?.data?.message || "Payment could not be recorded.");
        } finally {
            setPaymentSaving(false);
        }
    };

    const openCreditNote = async (invoice) => {
        try {
            const response = await api.get(`/invoices/${invoice.id}`);
            setCreditInvoice(response.data.invoice);
            setCreditForm({ credit_date: new Date().toISOString().slice(0, 10), reason: "", notes: "", quantities: {} });
        } catch (error) {
            console.error("Invoice items could not be loaded for return:", error);
            toast.error(error.response?.data?.message || "Invoice items could not be loaded.");
        }
    };

    const saveCreditNote = async (event) => {
        event.preventDefault();
        if (!creditInvoice) return;
        const items = Object.entries(creditForm.quantities)
            .filter(([, quantity]) => Number(quantity) > 0)
            .map(([invoice_item_id, quantity]) => ({ invoice_item_id: Number(invoice_item_id), quantity: Number(quantity) }));
        if (!items.length) {
            toast.error("Choose at least one product quantity to return.");
            return;
        }
        setCreditSaving(true);
        try {
            await api.post(`/invoices/${creditInvoice.id}/credit-notes`, {
                credit_date: creditForm.credit_date,
                reason: creditForm.reason,
                notes: creditForm.notes,
                items,
            });
            toast.success("Credit note issued and dealer balance updated.");
            setCreditInvoice(null);
            await openProfile(profile);
            await reloadDealers();
        } catch (error) {
            console.error("Credit note creation failed:", error);
            toast.error(error.response?.data?.message || "Credit note could not be issued.");
        } finally {
            setCreditSaving(false);
        }
    };

    const printInvoice = async (invoice) => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            toast.error("Allow pop-ups to print this invoice.");
            return;
        }
        try {
            const response = await api.get(`/invoices/${invoice.id}`);
            const data = response.data.invoice;
            const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
                "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
            })[character]);
            const items = data.items.map((item) => `<tr><td>${escape(item.product_name)}</td><td>${escape(item.hsn_code)}</td><td>${escape(item.quantity)} ${escape(item.unit)}</td><td>₹${Number(item.unit_price).toFixed(2)}</td><td>₹${Number(item.taxable_amount).toFixed(2)}</td><td>₹${Number(item.gst_amount).toFixed(2)}</td><td>₹${Number(item.line_total).toFixed(2)}</td></tr>`).join("");
            printWindow.document.write(`<!doctype html><html><head><title>${escape(data.invoice_number)}</title><style>body{font:14px Arial,sans-serif;color:#172033;margin:32px}h1{margin:0 0 8px}header,.row{display:flex;justify-content:space-between;gap:24px}.card{border:1px solid #ddd;padding:16px;margin:18px 0}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}.totals{margin-left:auto;width:300px}.totals p{display:flex;justify-content:space-between;margin:8px 0}@media print{body{margin:12mm}}</style></head><body><header><div><h1>Tax Invoice</h1><p>${escape(data.invoice_number)}</p></div><div><b>Invoice date</b><br>${escape(String(data.invoice_date).slice(0, 10))}<br><b>Due date</b><br>${escape(String(data.due_date || "—").slice(0, 10))}</div></header><section class="card"><b>${escape(data.customer_name)}</b><p>${escape(data.billing_address)}</p><p>Mobile: ${escape(data.mobile)} · GSTIN: ${escape(data.gstin)}</p><p>Place of supply: ${escape(data.place_of_supply)}</p></section><table><thead><tr><th>Product</th><th>HSN/SAC</th><th>Qty</th><th>Price</th><th>Taxable</th><th>GST</th><th>Total</th></tr></thead><tbody>${items}</tbody></table><section class="totals"><p><span>Subtotal</span><b>₹${Number(data.subtotal).toFixed(2)}</b></p><p><span>Discount</span><b>₹${(Number(data.item_discount) + Number(data.additional_discount)).toFixed(2)}</b></p><p><span>Taxable amount</span><b>₹${Number(data.taxable_amount).toFixed(2)}</b></p><p><span>CGST / SGST / IGST</span><b>₹${(Number(data.cgst_amount) + Number(data.sgst_amount) + Number(data.igst_amount)).toFixed(2)}</b></p><p><span>Delivery & installation</span><b>₹${(Number(data.delivery_charges) + Number(data.installation_charges)).toFixed(2)}</b></p><p><span>Grand total</span><b>₹${Number(data.grand_total).toFixed(2)}</b></p><p><span>Paid / Credited / Balance</span><b>₹${Number(data.amount_paid).toFixed(2)} / ₹${Number(data.credited_amount || 0).toFixed(2)} / ₹${Number(data.balance_due).toFixed(2)}</b></p></section><p>${escape(data.notes)}</p><script>window.onload=()=>window.print()</script></body></html>`);
            printWindow.document.close();
        } catch (error) {
            printWindow.close();
            console.error("Invoice print failed:", error);
            toast.error(error.response?.data?.message || "Invoice could not be loaded for printing.");
        }
    };

    return (
        <div className="space-y-6 pb-10">
          

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total dealers" value={summary.total} icon={<FiTruck />} tone="orange" />
                <StatCard label="Active dealers" value={summary.active} tone="green" />
                <StatCard label="Inactive dealers" value={summary.inactive} tone="amber" />
                <StatCard label="Invoices issued" value={summary.invoices} icon={<FiFileText />} tone="brown" />
            </section>

            <section aria-label="Dealer filters" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <label className="relative w-full sm:max-w-lg">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400" />
                    <input value={search} onChange={(event) => { setLoading(true); setSearch(event.target.value); setPagination((current) => ({ ...current, page: 1 })); }} placeholder="Search name, phone, GSTIN, or dealer code" className="w-full rounded-xl border border-gray-100 bg-gray-50 py-2.5 pl-11 pr-4 text-sm font-medium text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-orange-100" />
                </label>


                <div className="flex items-center gap-3">
                    
                    <select value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value); setPagination((current) => ({ ...current, page: 1 })); }} className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600 outline-none focus:border-primary">
                        <option value="All">Select Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option>
                    </select>
                    <div className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                        <button type="button" onClick={() => setViewMode("table")} aria-label="Table view" className={`rounded-lg p-2 transition-all ${viewMode === "table" ? "bg-orange-100 text-primary-dark" : "text-gray-400 hover:text-slate-600"}`}><FiList size={18} /></button>
                        <button type="button" onClick={() => setViewMode("grid")} aria-label="Grid view" className={`rounded-lg p-2 transition-all ${viewMode === "grid" ? "bg-orange-100 text-primary-dark" : "text-gray-400 hover:text-slate-600"}`}><FiGrid size={18} /></button>
                    </div>

                     <div className="flex gap-2">
                    <button type="button" onClick={exportCsv} disabled={!dealers.length || exporting} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600 shadow-sm transition-all hover:bg-orange-50 hover:text-primary-dark disabled:opacity-50"><FiDownload /> {exporting ? "Exporting..." : "Export CSV"}</button>
                    <button type="button" onClick={() => { setEditingDealer(null); setModalOpen(true); }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark active:scale-95"><FiPlus /> Add dealer</button>
                </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                {viewMode === "table" ? (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[940px] text-left text-sm">
                        <thead className="border-b border-secondary-dark bg-gradient-to-r from-secondary-dark to-secondary-light text-[10px] uppercase tracking-wider text-[#FCD34D]">
                            <tr><th className="w-16 rounded-tl-2xl p-4 text-center font-bold">S No</th><th className="p-4 font-bold">Dealer</th><th className="p-4 font-bold">Contact</th><th className="p-4 font-bold">GSTIN</th><th className="p-4 font-bold">Invoices</th><th className="p-4 font-bold">Outstanding</th><th className="p-4 font-bold">Status</th><th className="rounded-tr-2xl p-4 text-right font-bold">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? <tr><td colSpan="8" className="p-10 text-center text-gray-500">Loading dealers...</td></tr>
                                : dealers.length === 0 ? <tr><td colSpan="8" className="p-10 text-center text-gray-500">No dealers found.</td></tr>
                                    : dealers.map((dealer, index) => (
                                        <tr key={dealer.id} className="group transition-colors hover:bg-gray-50/60">
                                            <td className="p-4 text-center text-gray-500">{(pagination.page - 1) * 25 + index + 1}</td>
                                            <td className="p-4"><p className="font-bold text-slate-800">{dealer.name}</p><p className="text-xs text-gray-500">{dealer.dealer_code || "—"} · {dealer.company_name}</p></td>
                                            <td className="p-4"><p>{dealer.mobile}</p><p className="text-xs text-gray-500">{dealer.email || "—"}</p></td>
                                            <td className="p-4">{dealer.gstin || "—"}</td>
                                            <td className="p-4">{dealer.total_invoices || 0}<p className="text-xs text-gray-500">{currency(dealer.total_purchases)}</p></td>
                                            <td className="p-4 font-semibold">{currency(dealer.outstanding_balance)}</td>
                                            <td className="p-4"><span className={`rounded-lg px-3 py-1 text-[11px] font-bold ${dealer.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}>{dealer.status}</span></td>
                                            <td className="p-4"><div className="flex justify-end gap-2">
                                                <button type="button" onClick={() => openProfile(dealer)} className="rounded-lg border border-orange-200 px-3 py-2 text-xs font-bold text-primary-dark transition-colors hover:bg-orange-50">History</button>
                                                <button type="button" onClick={() => navigate(`/admin/invoices/add?dealerId=${dealer.id}`)} className="rounded-lg bg-gradient-to-r from-primary to-primary-dark px-3 py-2 text-xs font-bold text-white shadow-sm transition-all hover:from-secondary-light hover:to-secondary-dark">Invoice</button>
                                                <button type="button" onClick={() => { setEditingDealer(dealer); setModalOpen(true); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-primary-dark transition-colors hover:bg-orange-100" aria-label={`Edit ${dealer.name}`}><FiEdit2 size={14} /></button>
                                                <button type="button" onClick={() => removeDealer(dealer)} className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-100" aria-label={`Delete ${dealer.name}`}><FiTrash2 size={14} /></button>
                                            </div></td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 xl:grid-cols-3">
                        {loading ? <p className="col-span-full p-10 text-center font-bold text-gray-500">Loading dealers...</p>
                            : dealers.length === 0 ? <p className="col-span-full p-10 text-center font-bold text-gray-500">No dealers found.</p>
                                : dealers.map((dealer) => (
                                    <article key={dealer.id} className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                                        <div className="mb-4 flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-lg font-black text-white shadow-md shadow-orange-200">{dealer.name?.charAt(0)?.toUpperCase() || <FiTruck />}</div>
                                                <div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-800">{dealer.name}</h3><p className="text-[11px] font-medium text-gray-400">ID: {dealer.dealer_code || "N/A"}</p></div>
                                            </div>
                                            <span className={`shrink-0 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${dealer.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}>{dealer.status}</span>
                                        </div>
                                        <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3">
                                            <div><p className="text-[10px] font-medium text-gray-400">Invoices</p><p className="text-sm font-bold text-slate-800">{dealer.total_invoices || 0}</p></div>
                                            <div><p className="text-[10px] font-medium text-gray-400">Outstanding</p><p className="text-sm font-bold text-slate-800">{currency(dealer.outstanding_balance)}</p></div>
                                        </div>
                                        <div className="flex-1 space-y-1.5 text-xs text-gray-500">
                                            <p>{dealer.company_name}</p><p>{dealer.mobile}</p><p>{dealer.email || "No email provided"}</p><p>{[dealer.city, dealer.state].filter(Boolean).join(", ") || "No location provided"}</p>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                                            <button type="button" onClick={() => openProfile(dealer)} className="flex-1 rounded-lg border border-orange-200 px-3 py-2 text-xs font-bold text-primary-dark hover:bg-orange-50">History</button>
                                            <button type="button" onClick={() => navigate(`/admin/invoices/add?dealerId=${dealer.id}`)} className="flex-1 rounded-lg bg-gradient-to-r from-primary to-primary-dark px-3 py-2 text-xs font-bold text-white hover:from-secondary-light hover:to-secondary-dark">New invoice</button>
                                            <button type="button" onClick={() => { setEditingDealer(dealer); setModalOpen(true); }} aria-label={`Edit ${dealer.name}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-primary-dark hover:bg-orange-100"><FiEdit2 size={14} /></button>
                                            <button type="button" onClick={() => removeDealer(dealer)} aria-label={`Delete ${dealer.name}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100"><FiTrash2 size={14} /></button>
                                        </div>
                                    </article>
                                ))}
                    </div>
                )}
                <footer className="flex flex-col items-center justify-between gap-3 bg-white p-4 text-sm text-gray-500 sm:flex-row">
                <p className="text-xs font-medium text-gray-500">Showing {firstDealer} to {lastDealer} of {totalDealers} dealers</p>
                <div className="flex items-center gap-2">
                    <button type="button" aria-label="Previous page" disabled={currentPage <= 1 || loading} onClick={() => { setLoading(true); setPagination((current) => ({ ...current, page: current.page - 1 })); }} className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:border-primary hover:text-primary-dark disabled:cursor-not-allowed disabled:opacity-40"><FiChevronLeft size={16} /></button>
                    {firstVisiblePage > 1 && (
                        <>
                            <button type="button" onClick={() => { setLoading(true); setPagination((current) => ({ ...current, page: 1 })); }} className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-sm font-bold text-gray-600 transition-colors hover:border-primary">1</button>
                            {firstVisiblePage > 2 && <span className="px-1 text-gray-400">...</span>}
                        </>
                    )}
                    {visiblePages.map((page) => (
                        <button key={page} type="button" aria-current={currentPage === page ? "page" : undefined} onClick={() => { setLoading(true); setPagination((current) => ({ ...current, page })); }} className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold transition-all ${currentPage === page ? "border-primary-dark bg-gradient-to-br from-primary to-primary-dark text-white shadow-md shadow-orange-200" : "border-gray-200 text-gray-600 hover:border-primary"}`}>{page}</button>
                    ))}
                    {visiblePages[visiblePages.length - 1] < totalPages && (
                        <>
                            {visiblePages[visiblePages.length - 1] < totalPages - 1 && <span className="px-1 text-gray-400">...</span>}
                            <button type="button" onClick={() => { setLoading(true); setPagination((current) => ({ ...current, page: totalPages })); }} className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-sm font-bold text-gray-600 transition-colors hover:border-primary">{totalPages}</button>
                        </>
                    )}
                    <button type="button" aria-label="Next page" disabled={currentPage >= totalPages || loading} onClick={() => { setLoading(true); setPagination((current) => ({ ...current, page: current.page + 1 })); }} className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:border-primary hover:text-primary-dark disabled:cursor-not-allowed disabled:opacity-40"><FiChevronRight size={16} /></button>
                </div>
                </footer>
            </section>

            {modalOpen && <AddDealerModal key={editingDealer?.id || "new"} isOpen={modalOpen} dealer={editingDealer} onClose={() => setModalOpen(false)} onSuccess={reloadDealers} />}
            {profile && <DealerProfile profile={profile} loading={profileLoading} onClose={() => setProfile(null)} onCreateInvoice={() => navigate(`/admin/invoices/add?dealerId=${profile.id}`)} onRecordPayment={(invoice) => { setPaymentInvoice(invoice); setPaymentForm((current) => ({ ...current, amount: String(invoice.balance_due) })); }} onCreateCreditNote={openCreditNote} onPrintInvoice={printInvoice} />}
            {paymentInvoice && <PaymentModal invoice={paymentInvoice} form={paymentForm} setForm={setPaymentForm} saving={paymentSaving} onClose={() => setPaymentInvoice(null)} onSubmit={savePayment} />}
            {creditInvoice && <CreditNoteModal invoice={creditInvoice} form={creditForm} setForm={setCreditForm} saving={creditSaving} onClose={() => setCreditInvoice(null)} onSubmit={saveCreditNote} />}
        </div>
    );
}

function StatCard({ label, value, icon, tone }) {
    const tones = {
        orange: {
            border: "border-orange-100/80 hover:border-orange-200",
            stripe: "from-primary-light to-primary-dark",
            icon: "from-primary to-primary-dark shadow-orange-200/70",
            watermark: "text-orange-300/20",
        },
        green: {
            border: "border-emerald-100/80 hover:border-emerald-200",
            stripe: "from-emerald-400 to-emerald-600",
            icon: "from-emerald-400 to-emerald-600 shadow-emerald-200/70",
            watermark: "text-emerald-300/20",
        },
        amber: {
            border: "border-amber-100/80 hover:border-amber-200",
            stripe: "from-amber-400 to-amber-600",
            icon: "from-amber-400 to-amber-600 shadow-amber-200/70",
            watermark: "text-amber-300/20",
        },
        brown: {
            border: "border-orange-100/80 hover:border-orange-200",
            stripe: "from-secondary-light to-secondary-dark",
            icon: "from-secondary-light to-secondary-dark shadow-orange-200/70",
            watermark: "text-orange-300/20",
        },
    };
    const colors = tones[tone] || tones.orange;
    return <article className={`group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)] ${colors.border}`}>
        <div className={`absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b ${colors.stripe}`} />
        <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-lg transition-transform duration-200 group-hover:scale-105 ${colors.icon}`}>{icon || <FiTruck className="text-xl" />}</div>
        <div className="relative z-10"><p className="mb-1 text-xs font-bold tracking-wide text-secondary-light">{label}</p><p className="mb-1 text-3xl font-black leading-none text-secondary-dark">{Number(value || 0).toLocaleString()}</p><p className="text-[10px] font-medium text-stone-500">Dealer management</p></div>
        <FiTruck className={`pointer-events-none absolute -right-1 bottom-1 ${colors.watermark}`} size={60} />
    </article>;
}

function DealerProfile({ profile, loading, onClose, onCreateInvoice, onRecordPayment, onCreateCreditNote, onPrintInvoice }) {
    return <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <section className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-[24px] bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white p-6">
                <div><h2 className="text-xl font-black text-slate-800">{profile.name}</h2><p className="text-sm text-gray-500">{profile.dealer_code} · {profile.mobile} · {profile.gstin || "No GSTIN"}</p></div>
                <div className="flex gap-2"><button type="button" onClick={onCreateInvoice} className="rounded-xl bg-gradient-to-r from-primary to-primary-dark px-4 py-2 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark">New invoice</button><button type="button" onClick={onClose} className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-slate-700" aria-label="Close"><FiX /></button></div>
            </header>
            {loading ? <p className="p-8 text-center font-bold text-gray-500">Loading account history...</p> : <div className="space-y-6 p-6">
                <div className="grid gap-3 sm:grid-cols-3">
                    <Summary label="Total purchases" value={currency(profile.total_purchases)} />
                    <Summary label="Outstanding" value={currency(profile.outstanding_balance)} />
                    <Summary label="Total paid" value={currency(profile.total_paid)} />
                </div>
                <section><h3 className="mb-3 text-sm font-black text-secondary-dark">Invoices</h3><div className="overflow-hidden rounded-2xl border border-gray-200">
                    <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-secondary-dark bg-gradient-to-r from-secondary-dark to-secondary-light text-[10px] uppercase tracking-wider text-[#FCD34D]"><tr><th className="p-3">Invoice</th><th className="p-3">Date</th><th className="p-3">Total</th><th className="p-3">Paid</th><th className="p-3">Credited</th><th className="p-3">Balance</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                        <tbody className="divide-y divide-gray-50">{profile.invoices?.map((invoice) => <tr key={invoice.id} className="transition-colors hover:bg-gray-50/60"><td className="p-3 font-semibold">{invoice.invoice_number}</td><td className="p-3">{String(invoice.invoice_date).slice(0, 10)}</td><td className="p-3">{currency(invoice.grand_total)}</td><td className="p-3">{currency(invoice.amount_paid)}</td><td className="p-3">{currency(invoice.credited_amount)}</td><td className="p-3">{currency(invoice.balance_due)}</td><td className="p-3">{invoice.status}</td><td className="p-3"><div className="flex gap-2"><button type="button" onClick={() => onPrintInvoice(invoice)} className="rounded-lg border border-orange-200 px-2 py-1 text-xs font-semibold text-primary-dark transition-colors hover:bg-orange-50">Print</button>{Number(invoice.balance_due) > 0 && invoice.status !== "Cancelled" && <><button type="button" onClick={() => onRecordPayment(invoice)} className="rounded-lg bg-gradient-to-r from-primary to-primary-dark px-2 py-1 text-xs font-semibold text-white">Payment</button><button type="button" onClick={() => onCreateCreditNote(invoice)} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100">Return</button></>}</div></td></tr>)}
                            {!profile.invoices?.length && <tr><td colSpan="8" className="p-6 text-center text-gray-500">No invoices recorded.</td></tr>}</tbody></table>
                    </div>
                </div></section>
                <section><h3 className="mb-3 text-sm font-black text-secondary-dark">Dealer ledger</h3><div className="overflow-hidden rounded-2xl border border-gray-200">
                    <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-secondary-dark bg-gradient-to-r from-secondary-dark to-secondary-light text-[10px] uppercase tracking-wider text-[#FCD34D]"><tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Reference</th><th className="p-3">Description</th><th className="p-3">Debit</th><th className="p-3">Credit</th><th className="p-3">Balance</th></tr></thead>
                        <tbody className="divide-y divide-gray-50">{profile.ledger?.map((entry) => <tr key={entry.id} className="transition-colors hover:bg-gray-50/60"><td className="p-3">{String(entry.transaction_date).slice(0, 10)}</td><td className="p-3">{entry.transaction_type}</td><td className="p-3">{entry.reference_number || "—"}</td><td className="p-3">{entry.description}</td><td className="p-3">{currency(entry.debit)}</td><td className="p-3">{currency(entry.credit)}</td><td className="p-3">{currency(entry.balance)}</td></tr>)}
                            {!profile.ledger?.length && <tr><td colSpan="7" className="p-6 text-center text-gray-500">No ledger activity recorded.</td></tr>}</tbody></table>
                    </div>
                </div></section>
                <section><h3 className="mb-3 text-sm font-black text-secondary-dark">Credit notes / returns</h3><div className="overflow-hidden rounded-2xl border border-gray-200">
                    <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b border-secondary-dark bg-gradient-to-r from-secondary-dark to-secondary-light text-[10px] uppercase tracking-wider text-[#FCD34D]"><tr><th className="p-3">Credit note</th><th className="p-3">Invoice</th><th className="p-3">Date</th><th className="p-3">Reason</th><th className="p-3">Amount</th></tr></thead>
                        <tbody className="divide-y divide-gray-50">{profile.credit_notes?.map((note) => <tr key={note.id} className="transition-colors hover:bg-gray-50/60"><td className="p-3 font-semibold">{note.credit_note_number}</td><td className="p-3">{note.invoice_number}</td><td className="p-3">{String(note.credit_date).slice(0, 10)}</td><td className="p-3">{note.reason}</td><td className="p-3">{currency(note.amount)}</td></tr>)}
                            {!profile.credit_notes?.length && <tr><td colSpan="5" className="p-6 text-center text-gray-500">No credit notes issued.</td></tr>}</tbody></table>
                    </div>
                </div></section>
            </div>}
        </section>
    </div>;
}

function Summary({ label, value }) {
    return <div className="rounded-xl border border-orange-100/80 bg-white p-4 shadow-[0_8px_24px_rgba(74,46,25,0.06)]"><p className="text-xs font-bold tracking-wide text-secondary-light">{label}</p><p className="mt-1 font-black text-secondary-dark">{value}</p></div>;
}

function PaymentModal({ invoice, form, setForm, saving, onClose, onSubmit }) {
    const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
    const inputClass = "mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-orange-500/20";
    return <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <form onSubmit={onSubmit} className="w-full max-w-lg space-y-4 overflow-hidden rounded-[24px] border border-gray-100 bg-white p-6 shadow-2xl">
            <header className="border-b border-gray-100 pb-4"><h2 className="text-xl font-black text-slate-800">Record payment</h2><p className="mt-1 text-sm text-gray-500">{invoice.invoice_number} · Remaining {currency(invoice.balance_due)}</p></header>
            <label className="block text-sm font-semibold">Amount *
                <input type="number" min="0.01" max={invoice.balance_due} step="0.01" required value={form.amount} onChange={(event) => update("amount", event.target.value)} className={inputClass} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-semibold">Payment date *
                    <input type="date" required value={form.paid_at} onChange={(event) => update("paid_at", event.target.value)} className={inputClass} />
                </label>
                <label className="block text-sm font-semibold">Method *
                    <select value={form.payment_method} onChange={(event) => update("payment_method", event.target.value)} className={inputClass}>
                        {["Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Other"].map((method) => <option key={method}>{method}</option>)}
                    </select>
                </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-semibold">Transaction ID
                    <input value={form.transaction_id} onChange={(event) => update("transaction_id", event.target.value)} className={inputClass} />
                </label>
                <label className="block text-sm font-semibold">Reference
                    <input value={form.reference_number} onChange={(event) => update("reference_number", event.target.value)} className={inputClass} />
                </label>
            </div>
            <label className="block text-sm font-semibold">Notes
                <textarea rows="2" value={form.notes} onChange={(event) => update("notes", event.target.value)} className={inputClass} />
            </label>
            <footer className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/80 -mx-6 -mb-6 p-5">
                <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 font-bold text-gray-600 transition-all hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 py-2 font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark disabled:opacity-60">{saving ? "Saving..." : "Record payment"}</button>
            </footer>
        </form>
    </div>;
}

function CreditNoteModal({ invoice, form, setForm, saving, onClose, onSubmit }) {
    const items = invoice.items || [];
    const estimate = items.reduce((total, item) => {
        const quantity = Number(form.quantities[item.id] || 0);
        return total + (Number(item.line_total) / Number(item.quantity)) * quantity;
    }, 0);
    const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
    const inputClass = "mt-1 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-orange-500/20";
    return <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <form onSubmit={onSubmit} className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-auto rounded-[24px] border border-gray-100 bg-white p-6 shadow-2xl">
            <header className="border-b border-gray-100 pb-4"><h2 className="text-xl font-black text-slate-800">Create credit note / return</h2><p className="mt-1 text-sm text-gray-500">{invoice.invoice_number} · Unpaid balance {currency(invoice.balance_due)}</p></header>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-semibold">Credit date *
                    <input type="date" min={String(invoice.invoice_date).slice(0, 10)} required value={form.credit_date} onChange={(event) => update("credit_date", event.target.value)} className={inputClass} />
                </label>
                <label className="block text-sm font-semibold">Reason *
                    <input required maxLength="191" value={form.reason} onChange={(event) => update("reason", event.target.value)} placeholder="Damaged goods, return..." className={inputClass} />
                </label>
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-200">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="border-b border-secondary-dark bg-gradient-to-r from-secondary-dark to-secondary-light text-[10px] uppercase tracking-wider text-[#FCD34D]"><tr><th className="p-3">Invoice item</th><th className="p-3">Sold</th><th className="p-3">Remaining returnable</th><th className="p-3">Return qty</th></tr></thead>
                    <tbody className="divide-y divide-gray-50">{items.map((item) => <tr key={item.id} className="hover:bg-gray-50/60">
                        <td className="p-3 font-semibold">{item.product_name}</td><td className="p-3">{item.quantity}</td><td className="p-3">{item.remaining_quantity}</td>
                        <td className="p-3"><input type="number" min="0" max={item.remaining_quantity} step="1" value={form.quantities[item.id] || ""} onChange={(event) => update("quantities", { ...form.quantities, [item.id]: Math.max(0, Math.min(Number(item.remaining_quantity), Number(event.target.value) || 0)) })} className="w-24 rounded-lg border border-gray-200 bg-gray-50 p-2 outline-none focus:border-primary focus:ring-2 focus:ring-orange-500/20" /></td>
                    </tr>)}
                        {!items.length && <tr><td colSpan="4" className="p-5 text-center text-gray-500">This invoice has no returnable line items.</td></tr>}
                    </tbody>
                </table>
                </div>
            </div>
            <label className="block text-sm font-semibold">Notes
                <textarea rows="2" value={form.notes} onChange={(event) => update("notes", event.target.value)} className={inputClass} />
            </label>
            <div className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50 p-3 text-sm text-secondary-dark"><span className="font-semibold">Estimated credit value</span><b>{currency(estimate)}</b></div>
            {estimate > Number(invoice.balance_due) && <p className="text-sm font-semibold text-red-600">Return value cannot exceed this invoice’s unpaid balance.</p>}
            <footer className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/80 -mx-6 -mb-6 p-5">
                <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 font-bold text-gray-600 transition-all hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={saving || !items.length || estimate <= 0 || estimate > Number(invoice.balance_due)} className="rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 py-2 font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark disabled:opacity-50">{saving ? "Issuing..." : "Issue credit note"}</button>
            </footer>
        </form>
    </div>;
}
