import { useEffect, useState } from "react";
import { FiDownload, FiEdit2, FiFileText, FiPlus, FiSearch, FiTrash2, FiTruck, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../api";
import AddDealerModal from "./AddDealerModal";

const currency = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const initialSummary = { total: 0, active: 0, inactive: 0, invoices: 0 };

export default function Dealers() {
    const navigate = useNavigate();
    const [dealers, setDealers] = useState([]);
    const [summary, setSummary] = useState(initialSummary);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All");
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

    useEffect(() => {
        let current = true;
        api.get("/dealers", { params: { page: pagination.page, limit: 25, search, status } })
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
                params: { page: pagination.page, limit: 25, search, status },
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
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">Business partners</p>
                    <h1 className="text-3xl font-black text-slate-800">Dealers</h1>
                    <p className="mt-1 text-sm text-gray-500">Manage dealer accounts, invoices, balances, and transaction history.</p>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={exportCsv} disabled={!dealers.length || exporting} className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50"><FiDownload /> {exporting ? "Exporting..." : "Export CSV"}</button>
                    <button type="button" onClick={() => { setEditingDealer(null); setModalOpen(true); }} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white"><FiPlus /> Add dealer</button>
                </div>
            </header>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total dealers" value={summary.total} icon={<FiTruck />} />
                <StatCard label="Active dealers" value={summary.active} />
                <StatCard label="Inactive dealers" value={summary.inactive} />
                <StatCard label="Invoices issued" value={summary.invoices} icon={<FiFileText />} />
            </section>

            <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
                    <label className="relative flex-1">
                        <FiSearch className="absolute left-3 top-3.5 text-gray-400" />
                        <input value={search} onChange={(event) => { setLoading(true); setSearch(event.target.value); setPagination((current) => ({ ...current, page: 1 })); }} placeholder="Search name, phone, GSTIN, or dealer code" className="w-full rounded-lg border py-3 pl-10 pr-3 text-sm outline-none focus:border-primary" />
                    </label>
                    <select value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value); setPagination((current) => ({ ...current, page: 1 })); }} className="rounded-lg border px-3 py-2 text-sm">
                        <option value="All">All statuses</option><option value="Active">Active</option><option value="Inactive">Inactive</option>
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[940px] text-left text-sm">
                        <thead className="bg-slate-900 text-xs uppercase tracking-wide text-white">
                            <tr><th className="p-4">Dealer</th><th className="p-4">Contact</th><th className="p-4">GSTIN</th><th className="p-4">Invoices</th><th className="p-4">Outstanding</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? <tr><td colSpan="7" className="p-10 text-center text-gray-500">Loading dealers...</td></tr>
                                : dealers.length === 0 ? <tr><td colSpan="7" className="p-10 text-center text-gray-500">No dealers found.</td></tr>
                                    : dealers.map((dealer) => (
                                        <tr key={dealer.id} className="hover:bg-orange-50/40">
                                            <td className="p-4"><p className="font-bold text-slate-800">{dealer.name}</p><p className="text-xs text-gray-500">{dealer.dealer_code || "—"} · {dealer.company_name}</p></td>
                                            <td className="p-4"><p>{dealer.mobile}</p><p className="text-xs text-gray-500">{dealer.email || "—"}</p></td>
                                            <td className="p-4">{dealer.gstin || "—"}</td>
                                            <td className="p-4">{dealer.total_invoices || 0}<p className="text-xs text-gray-500">{currency(dealer.total_purchases)}</p></td>
                                            <td className="p-4 font-semibold">{currency(dealer.outstanding_balance)}</td>
                                            <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${dealer.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{dealer.status}</span></td>
                                            <td className="p-4"><div className="flex justify-end gap-2">
                                                <button type="button" onClick={() => openProfile(dealer)} className="rounded-lg border px-3 py-2 text-xs font-bold hover:bg-gray-50">History</button>
                                                <button type="button" onClick={() => navigate(`/admin/invoices/add?dealerId=${dealer.id}`)} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">Invoice</button>
                                                <button type="button" onClick={() => { setEditingDealer(dealer); setModalOpen(true); }} className="rounded-lg border p-2 text-gray-600 hover:bg-gray-50" aria-label={`Edit ${dealer.name}`}><FiEdit2 /></button>
                                                <button type="button" onClick={() => removeDealer(dealer)} className="rounded-lg border p-2 text-red-600 hover:bg-red-50" aria-label={`Delete ${dealer.name}`}><FiTrash2 /></button>
                                            </div></td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
                <footer className="flex items-center justify-between border-t p-4 text-sm text-gray-500">
                    <span>{pagination.total} dealers</span>
                    <div className="flex items-center gap-2">
                        <button type="button" disabled={pagination.page <= 1 || loading} onClick={() => { setLoading(true); setPagination((current) => ({ ...current, page: current.page - 1 })); }} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button>
                        <span>Page {pagination.page} of {pagination.totalPages}</span>
                        <button type="button" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => { setLoading(true); setPagination((current) => ({ ...current, page: current.page + 1 })); }} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button>
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

function StatCard({ label, value, icon }) {
    return <article className="flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-primary">{icon || <FiTruck />}</div>
        <div><p className="text-xs font-semibold text-gray-500">{label}</p><p className="text-2xl font-black text-slate-800">{Number(value || 0).toLocaleString()}</p></div>
    </article>;
}

function DealerProfile({ profile, loading, onClose, onCreateInvoice, onRecordPayment, onCreateCreditNote, onPrintInvoice }) {
    return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <section className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b p-5">
                <div><h2 className="text-xl font-black text-slate-800">{profile.name}</h2><p className="text-sm text-gray-500">{profile.dealer_code} · {profile.mobile} · {profile.gstin || "No GSTIN"}</p></div>
                <div className="flex gap-2"><button type="button" onClick={onCreateInvoice} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">New invoice</button><button type="button" onClick={onClose} className="rounded-lg border p-2" aria-label="Close"><FiX /></button></div>
            </header>
            {loading ? <p className="p-8 text-center text-gray-500">Loading account history...</p> : <div className="space-y-6 p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                    <Summary label="Total purchases" value={currency(profile.total_purchases)} />
                    <Summary label="Outstanding" value={currency(profile.outstanding_balance)} />
                    <Summary label="Total paid" value={currency(profile.total_paid)} />
                </div>
                <section><h3 className="mb-3 font-bold">Invoices</h3><div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-gray-50"><tr><th className="p-3">Invoice</th><th className="p-3">Date</th><th className="p-3">Total</th><th className="p-3">Paid</th><th className="p-3">Credited</th><th className="p-3">Balance</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                        <tbody className="divide-y">{profile.invoices?.map((invoice) => <tr key={invoice.id}><td className="p-3 font-semibold">{invoice.invoice_number}</td><td className="p-3">{String(invoice.invoice_date).slice(0, 10)}</td><td className="p-3">{currency(invoice.grand_total)}</td><td className="p-3">{currency(invoice.amount_paid)}</td><td className="p-3">{currency(invoice.credited_amount)}</td><td className="p-3">{currency(invoice.balance_due)}</td><td className="p-3">{invoice.status}</td><td className="p-3"><div className="flex gap-2"><button type="button" onClick={() => onPrintInvoice(invoice)} className="rounded border px-2 py-1 text-xs font-semibold">Print</button>{Number(invoice.balance_due) > 0 && invoice.status !== "Cancelled" && <><button type="button" onClick={() => onRecordPayment(invoice)} className="rounded bg-primary px-2 py-1 text-xs font-semibold text-white">Payment</button><button type="button" onClick={() => onCreateCreditNote(invoice)} className="rounded border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-800">Return</button></>}</div></td></tr>)}
                            {!profile.invoices?.length && <tr><td colSpan="8" className="p-6 text-center text-gray-500">No invoices recorded.</td></tr>}</tbody></table>
                </div></section>
                <section><h3 className="mb-3 font-bold">Dealer ledger</h3><div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-gray-50"><tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Reference</th><th className="p-3">Description</th><th className="p-3">Debit</th><th className="p-3">Credit</th><th className="p-3">Balance</th></tr></thead>
                        <tbody className="divide-y">{profile.ledger?.map((entry) => <tr key={entry.id}><td className="p-3">{String(entry.transaction_date).slice(0, 10)}</td><td className="p-3">{entry.transaction_type}</td><td className="p-3">{entry.reference_number || "—"}</td><td className="p-3">{entry.description}</td><td className="p-3">{currency(entry.debit)}</td><td className="p-3">{currency(entry.credit)}</td><td className="p-3">{currency(entry.balance)}</td></tr>)}
                            {!profile.ledger?.length && <tr><td colSpan="7" className="p-6 text-center text-gray-500">No ledger activity recorded.</td></tr>}</tbody></table>
                </div></section>
                <section><h3 className="mb-3 font-bold">Credit notes / returns</h3><div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-gray-50"><tr><th className="p-3">Credit note</th><th className="p-3">Invoice</th><th className="p-3">Date</th><th className="p-3">Reason</th><th className="p-3">Amount</th></tr></thead>
                        <tbody className="divide-y">{profile.credit_notes?.map((note) => <tr key={note.id}><td className="p-3 font-semibold">{note.credit_note_number}</td><td className="p-3">{note.invoice_number}</td><td className="p-3">{String(note.credit_date).slice(0, 10)}</td><td className="p-3">{note.reason}</td><td className="p-3">{currency(note.amount)}</td></tr>)}
                            {!profile.credit_notes?.length && <tr><td colSpan="5" className="p-6 text-center text-gray-500">No credit notes issued.</td></tr>}</tbody></table>
                </div></section>
            </div>}
        </section>
    </div>;
}

function Summary({ label, value }) {
    return <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 font-black text-slate-800">{value}</p></div>;
}

function PaymentModal({ invoice, form, setForm, saving, onClose, onSubmit }) {
    const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
    return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <form onSubmit={onSubmit} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <header><h2 className="text-xl font-black text-slate-800">Record payment</h2><p className="text-sm text-gray-500">{invoice.invoice_number} · Remaining {currency(invoice.balance_due)}</p></header>
            <label className="block text-sm font-semibold">Amount *
                <input type="number" min="0.01" max={invoice.balance_due} step="0.01" required value={form.amount} onChange={(event) => update("amount", event.target.value)} className="mt-1 w-full rounded-lg border p-3" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-semibold">Payment date *
                    <input type="date" required value={form.paid_at} onChange={(event) => update("paid_at", event.target.value)} className="mt-1 w-full rounded-lg border p-3" />
                </label>
                <label className="block text-sm font-semibold">Method *
                    <select value={form.payment_method} onChange={(event) => update("payment_method", event.target.value)} className="mt-1 w-full rounded-lg border p-3">
                        {["Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Other"].map((method) => <option key={method}>{method}</option>)}
                    </select>
                </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-semibold">Transaction ID
                    <input value={form.transaction_id} onChange={(event) => update("transaction_id", event.target.value)} className="mt-1 w-full rounded-lg border p-3" />
                </label>
                <label className="block text-sm font-semibold">Reference
                    <input value={form.reference_number} onChange={(event) => update("reference_number", event.target.value)} className="mt-1 w-full rounded-lg border p-3" />
                </label>
            </div>
            <label className="block text-sm font-semibold">Notes
                <textarea rows="2" value={form.notes} onChange={(event) => update("notes", event.target.value)} className="mt-1 w-full rounded-lg border p-3" />
            </label>
            <footer className="flex justify-end gap-2 border-t pt-4">
                <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 font-semibold">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 font-bold text-white disabled:opacity-60">{saving ? "Saving..." : "Record payment"}</button>
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
    return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <form onSubmit={onSubmit} className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
            <header><h2 className="text-xl font-black text-slate-800">Create credit note / return</h2><p className="text-sm text-gray-500">{invoice.invoice_number} · Unpaid balance {currency(invoice.balance_due)}</p></header>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-semibold">Credit date *
                    <input type="date" min={String(invoice.invoice_date).slice(0, 10)} required value={form.credit_date} onChange={(event) => update("credit_date", event.target.value)} className="mt-1 w-full rounded-lg border p-3" />
                </label>
                <label className="block text-sm font-semibold">Reason *
                    <input required maxLength="191" value={form.reason} onChange={(event) => update("reason", event.target.value)} placeholder="Damaged goods, return..." className="mt-1 w-full rounded-lg border p-3" />
                </label>
            </div>
            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="p-3">Invoice item</th><th className="p-3">Sold</th><th className="p-3">Remaining returnable</th><th className="p-3">Return qty</th></tr></thead>
                    <tbody className="divide-y">{items.map((item) => <tr key={item.id}>
                        <td className="p-3 font-semibold">{item.product_name}</td><td className="p-3">{item.quantity}</td><td className="p-3">{item.remaining_quantity}</td>
                        <td className="p-3"><input type="number" min="0" max={item.remaining_quantity} step="1" value={form.quantities[item.id] || ""} onChange={(event) => update("quantities", { ...form.quantities, [item.id]: Math.max(0, Math.min(Number(item.remaining_quantity), Number(event.target.value) || 0)) })} className="w-24 rounded border p-2" /></td>
                    </tr>)}
                        {!items.length && <tr><td colSpan="4" className="p-5 text-center text-gray-500">This invoice has no returnable line items.</td></tr>}
                    </tbody>
                </table>
            </div>
            <label className="block text-sm font-semibold">Notes
                <textarea rows="2" value={form.notes} onChange={(event) => update("notes", event.target.value)} className="mt-1 w-full rounded-lg border p-3" />
            </label>
            <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3 text-sm"><span>Estimated credit value</span><b>{currency(estimate)}</b></div>
            {estimate > Number(invoice.balance_due) && <p className="text-sm font-semibold text-red-600">Return value cannot exceed this invoice’s unpaid balance.</p>}
            <footer className="flex justify-end gap-2 border-t pt-4">
                <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 font-semibold">Cancel</button>
                <button type="submit" disabled={saving || !items.length || estimate <= 0 || estimate > Number(invoice.balance_due)} className="rounded-lg bg-primary px-4 py-2 font-bold text-white disabled:opacity-50">{saving ? "Issuing..." : "Issue credit note"}</button>
            </footer>
        </form>
    </div>;
}
