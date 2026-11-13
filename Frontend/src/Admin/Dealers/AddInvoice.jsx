import { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiPlus, FiSave, FiSearch, FiTrash2 } from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../api";

const today = new Date().toISOString().slice(0, 10);
const money = (value) => Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});
const productData = (product) => product?.data || product?.product_data || product || {};
const fieldClass = "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-orange-100";

export default function AddInvoice() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [dealers, setDealers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [dealerSearch, setDealerSearch] = useState("");
    const [form, setForm] = useState({
        dealer_id: searchParams.get("dealerId") || "",
        invoice_date: today,
        due_date: "",
        seller_state: "",
        place_of_supply: "",
        sales_person: "",
        payment_terms: "Due on receipt",
        additional_discount: 0,
        delivery_charges: 0,
        installation_charges: 0,
        amount_received: 0,
        payment_method: "Cash",
        transaction_id: "",
        reference_number: "",
        notes: "",
        items: [],
    });

    useEffect(() => {
        let mounted = true;
        const getAllPages = async (path, params) => {
            const first = await api.get(path, { params: { ...params, limit: 100, page: 1 } });
            const pageCount = Math.max(1, Number(first.data?.pagination?.totalPages) || 1);
            const remaining = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) =>
                api.get(path, { params: { ...params, limit: 100, page: index + 2 } })));
            return [first.data, ...remaining.map((response) => response.data)];
        };
        Promise.all([
            getAllPages("/dealers", { status: "Active" }),
            getAllPages("/products", { status: "Active" }),
        ]).then(([dealerPages, productPages]) => {
            if (!mounted) return;
            const dealerRows = dealerPages.flatMap((page) => page.dealers || []);
            const productRows = productPages.flatMap((page) => page.products || []);
            setDealers(dealerRows);
            setProducts(productRows.filter((product) => product.status === "Active"));
            const selectedDealer = dealerRows.find((dealer) => String(dealer.id) === searchParams.get("dealerId"));
            if (selectedDealer) {
                setDealerSearch(selectedDealer.name);
                setForm((current) => ({
                    ...current,
                    place_of_supply: selectedDealer.state || "",
                }));
            }
        }).catch((error) => {
            console.error("Invoice setup failed:", error);
            toast.error(error.response?.data?.message || "Could not load active dealers and products.");
        }).finally(() => {
            if (mounted) setLoadingData(false);
        });
        return () => { mounted = false; };
    }, [searchParams]);

    const selectedDealer = dealers.find((dealer) => String(dealer.id) === String(form.dealer_id));
    const filteredDealers = dealers.filter((dealer) =>
        `${dealer.name} ${dealer.company_name} ${dealer.mobile} ${dealer.dealer_code}`
            .toLowerCase().includes(dealerSearch.toLowerCase()));
    const filteredProducts = products.filter((product) =>
        `${product.name} ${product.product_code || ""}`.toLowerCase().includes(search.toLowerCase()));

    const totals = useMemo(() => {
        const subtotal = form.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const itemDiscount = form.items.reduce((sum, item) => sum + item.discount_amount, 0);
        const additionalDiscount = Math.min(Number(form.additional_discount) || 0, Math.max(0, subtotal - itemDiscount));
        const taxable = Math.max(0, subtotal - itemDiscount - additionalDiscount);
        const sameState = form.seller_state.trim().toLowerCase() === form.place_of_supply.trim().toLowerCase();
        const gst = form.items.reduce((sum, item) => {
            const rate = Number(productData(item.product).gst_percentage ?? productData(item.product).gst_rate ?? 18);
            const lineTaxable = item.price * item.quantity - item.discount_amount;
            return sum + Math.max(0, lineTaxable) * rate / 100;
        }, 0);
        const scale = subtotal - itemDiscount > 0 ? taxable / (subtotal - itemDiscount) : 1;
        const tax = gst * scale;
        const charges = (Number(form.delivery_charges) || 0) + (Number(form.installation_charges) || 0);
        const grandTotal = Math.round(taxable + tax + charges);
        return {
            subtotal,
            itemDiscount,
            additionalDiscount,
            taxable,
            cgst: sameState ? tax / 2 : 0,
            sgst: sameState ? tax / 2 : 0,
            igst: sameState ? 0 : tax,
            grandTotal,
            roundOff: grandTotal - taxable - tax - charges,
            balance: Math.max(0, grandTotal - (Number(form.amount_received) || 0)),
        };
    }, [form]);

    const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

    const selectDealer = (dealer) => {
        setForm((current) => ({
            ...current,
            dealer_id: String(dealer.id),
            place_of_supply: dealer.state || current.place_of_supply,
        }));
        setDealerSearch(dealer.name);
    };

    const addProduct = (product) => {
        setForm((current) => {
            if (current.items.some((item) => item.product_id === product.id)) {
                toast.error("This product is already on the invoice.");
                return current;
            }
            const price = Number(product.offer_price ?? product.selling_price ?? 0);
            return {
                ...current,
                items: [...current.items, {
                    product_id: product.id,
                    product,
                    price,
                    quantity: 1,
                    discount_type: "none",
                    discount_value: 0,
                    discount_amount: 0,
                }],
            };
        });
        setSearch("");
    };

    const updateItem = (index, changes) => setForm((current) => ({
        ...current,
        items: current.items.map((item, itemIndex) => {
            if (itemIndex !== index) return item;
            const next = { ...item, ...changes };
            const gross = next.price * next.quantity;
            next.discount_amount = next.discount_type === "percentage"
                ? gross * Number(next.discount_value || 0) / 100
                : next.discount_type === "fixed" ? Number(next.discount_value || 0) * next.quantity : 0;
            return next;
        }),
    }));

    const submit = async (event) => {
        event.preventDefault();
        if (!form.dealer_id) return toast.error("Select an active dealer.");
        if (!form.items.length) return toast.error("Add at least one product.");
        if (form.amount_received > totals.grandTotal) return toast.error("Payment cannot exceed the invoice total.");
        setSaving(true);
        try {
            const response = await api.post("/invoices", {
                ...form,
                dealer_id: Number(form.dealer_id),
                customer_name: selectedDealer.company_name || selectedDealer.name,
                mobile: selectedDealer.mobile,
                gstin: selectedDealer.gstin || "",
                billing_address: selectedDealer.billing_address || "",
                shipping_address: selectedDealer.shipping_address || "",
                items: form.items.map(({ product_id, quantity, discount_type, discount_value }) => ({
                    product_id, quantity, discount_type, discount_value,
                })),
            });
            toast.success(`Invoice ${response.data.invoice.invoice_number} created.`);
            navigate("/admin/dealers");
        } catch (error) {
            console.error("Invoice creation failed:", error);
            toast.error(error.response?.data?.message || "Invoice could not be created.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-6 pb-10">
            <header className="flex items-center gap-4">
                <button type="button" onClick={() => navigate(-1)} className="rounded-xl border border-gray-200 bg-white p-3 text-gray-500 shadow-sm transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-primary-dark" aria-label="Go back">
                    <FiArrowLeft />
                </button>
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">Dealer management</p>
                    <h1 className="text-2xl font-black text-secondary-dark">Create GST Invoice</h1>
                </div>
            </header>

            {loadingData ? <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center font-bold text-gray-500 shadow-sm">Loading invoice data...</div> : (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-6">
                        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                            <h2 className="text-sm font-black text-secondary-dark">Customer and invoice details</h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="relative space-y-1 text-sm font-semibold text-slate-600">
                                    Dealer *
                                    <input value={dealerSearch} onChange={(event) => {
                                        setDealerSearch(event.target.value);
                                        updateForm("dealer_id", "");
                                    }} placeholder="Search name, code, or phone" className={`${fieldClass} font-normal`} required />
                                    {dealerSearch && !selectedDealer && (
                                        <div className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                                            {filteredDealers.map((dealer) => (
                                                <button type="button" key={dealer.id} onClick={() => selectDealer(dealer)} className="block w-full border-b border-gray-50 p-3 text-left transition-colors hover:bg-orange-50">
                                                    <span className="font-semibold">{dealer.name}</span>
                                                    <span className="ml-2 text-xs text-gray-500">{dealer.dealer_code} · {dealer.mobile}</span>
                                                </button>
                                            ))}
                                            {!filteredDealers.length && <p className="p-3 text-sm text-gray-500">No active dealer matches this search.</p>}
                                        </div>
                                    )}
                                </label>
                                <label className="space-y-1 text-sm font-semibold text-slate-600">Invoice date *
                                    <input type="date" required value={form.invoice_date} onChange={(event) => updateForm("invoice_date", event.target.value)} className={`${fieldClass} font-normal`} />
                                </label>
                                <label className="space-y-1 text-sm font-semibold text-slate-600">Due date
                                    <input type="date" min={form.invoice_date} value={form.due_date} onChange={(event) => updateForm("due_date", event.target.value)} className={`${fieldClass} font-normal`} />
                                </label>
                                <label className="space-y-1 text-sm font-semibold text-slate-600">Sales person
                                    <input value={form.sales_person} onChange={(event) => updateForm("sales_person", event.target.value)} className={`${fieldClass} font-normal`} />
                                </label>
                                <label className="space-y-1 text-sm font-semibold text-slate-600">Seller state *
                                    <input required value={form.seller_state} onChange={(event) => updateForm("seller_state", event.target.value)} placeholder="e.g. Tamil Nadu" className={`${fieldClass} font-normal`} />
                                </label>
                                <label className="space-y-1 text-sm font-semibold text-slate-600">Place of supply *
                                    <input required value={form.place_of_supply} onChange={(event) => updateForm("place_of_supply", event.target.value)} placeholder="State" className={`${fieldClass} font-normal`} />
                                </label>
                                <label className="space-y-1 text-sm font-semibold text-slate-600">Payment terms
                                    <input value={form.payment_terms} onChange={(event) => updateForm("payment_terms", event.target.value)} className={`${fieldClass} font-normal`} />
                                </label>
                            </div>
                        </section>

                        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between gap-4">
                                <h2 className="text-sm font-black text-secondary-dark">Products and quantities</h2>
                                <span className="text-xs text-gray-500">{products.length} active products loaded</span>
                            </div>
                            <div className="relative">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400" />
                                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products by name or SKU" className={`${fieldClass} bg-gray-50 pl-11`} />
                                {search && (
                                    <div className="absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                                        {filteredProducts.map((product) => (
                                            <button type="button" key={product.id} onClick={() => addProduct(product)} className="flex w-full items-center justify-between border-b border-gray-50 p-3 text-left transition-colors hover:bg-orange-50">
                                                <span><b>{product.name}</b><small className="ml-2 text-gray-500">{product.product_code}</small></span>
                                                <span className="font-semibold">₹{money(product.offer_price ?? product.selling_price)}</span>
                                                <FiPlus />
                                            </button>
                                        ))}
                                        {!filteredProducts.length && <p className="p-3 text-sm text-gray-500">No active products match this search.</p>}
                                    </div>
                                )}
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-gray-200">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[700px] text-left text-sm">
                                    <thead className="border-b border-secondary-dark bg-gradient-to-r from-secondary-dark to-secondary-light text-[10px] uppercase tracking-wider text-[#FCD34D]">
                                        <tr><th className="p-3">Product</th><th className="p-3">Unit price</th><th className="p-3">Qty</th><th className="p-3">Discount</th><th className="p-3 text-right">Line total</th><th /></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {form.items.map((item, index) => (
                                            <tr key={item.product_id} className="transition-colors hover:bg-gray-50/60">
                                                <td className="p-3"><b>{item.product.name}</b><small className="block text-gray-500">{item.product.product_code || "No SKU"}</small></td>
                                                <td className="p-3">₹{money(item.price)}</td>
                                                <td className="p-3"><input type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(index, { quantity: Math.max(1, Number(event.target.value) || 1) })} className="w-20 rounded-lg border border-gray-200 bg-gray-50 p-2 outline-none focus:border-primary focus:ring-2 focus:ring-orange-500/20" /></td>
                                                <td className="p-3">
                                                    <div className="flex gap-1">
                                                        <select value={item.discount_type} onChange={(event) => updateItem(index, { discount_type: event.target.value })} className="rounded-lg border border-gray-200 bg-white p-2 outline-none focus:border-primary">
                                                            <option value="none">None</option><option value="percentage">%</option><option value="fixed">₹</option>
                                                        </select>
                                                        {item.discount_type !== "none" && <input type="number" min="0" max={item.discount_type === "percentage" ? 100 : undefined} step="0.01" value={item.discount_value} onChange={(event) => updateItem(index, { discount_value: Number(event.target.value) || 0 })} className="w-20 rounded-lg border border-gray-200 bg-gray-50 p-2 outline-none focus:border-primary" />}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right font-semibold">₹{money(item.price * item.quantity - item.discount_amount)}</td>
                                                <td className="p-3"><button type="button" onClick={() => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))} aria-label={`Remove ${item.product.name}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-100"><FiTrash2 size={14} /></button></td>
                                            </tr>
                                        ))}
                                        {!form.items.length && <tr><td colSpan="6" className="p-8 text-center text-gray-400">Search and add products to this invoice.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            </div>
                        </section>
                    </div>

                    <aside className="h-fit space-y-5 rounded-2xl border border-orange-100/80 border-t-4 border-t-primary-light bg-white p-6 text-slate-700 shadow-[0_8px_24px_rgba(74,46,25,0.08)] xl:sticky xl:top-5">
                        <h2 className="text-lg font-black text-secondary-dark">Invoice summary</h2>
                        <div className="space-y-3 border-b border-gray-100 pb-4 text-sm">
                            <SummaryRow label="Subtotal" value={totals.subtotal} />
                            <SummaryRow label="Item discounts" value={-totals.itemDiscount} />
                            <label className="flex items-center justify-between gap-3 text-gray-500">Additional discount
                                <input type="number" min="0" step="0.01" value={form.additional_discount} onChange={(event) => updateForm("additional_discount", Number(event.target.value) || 0)} className="w-28 rounded-lg border border-gray-200 bg-gray-50 p-2 text-right text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-orange-100" />
                            </label>
                            <SummaryRow label="Taxable amount" value={totals.taxable} />
                            <SummaryRow label="CGST" value={totals.cgst} />
                            <SummaryRow label="SGST" value={totals.sgst} />
                            <SummaryRow label="IGST" value={totals.igst} />
                            <label className="flex items-center justify-between gap-3 text-gray-500">Delivery
                                <input type="number" min="0" step="0.01" value={form.delivery_charges} onChange={(event) => updateForm("delivery_charges", Number(event.target.value) || 0)} className="w-28 rounded-lg border border-gray-200 bg-gray-50 p-2 text-right text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-orange-100" />
                            </label>
                            <label className="flex items-center justify-between gap-3 text-gray-500">Installation
                                <input type="number" min="0" step="0.01" value={form.installation_charges} onChange={(event) => updateForm("installation_charges", Number(event.target.value) || 0)} className="w-28 rounded-lg border border-gray-200 bg-gray-50 p-2 text-right text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-orange-100" />
                            </label>
                            <SummaryRow label="Round off" value={totals.roundOff} />
                        </div>
                        <div className="rounded-xl bg-orange-50 px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-widest text-primary-dark">Grand total</p>
                            <p className="mt-1 text-3xl font-black text-secondary-dark">₹{money(totals.grandTotal)}</p>
                        </div>
                        <div className="space-y-3 border-t border-gray-100 pt-4">
                            <label className="block text-sm font-semibold text-gray-600">Amount received
                                <input type="number" min="0" max={totals.grandTotal} step="0.01" value={form.amount_received} onChange={(event) => updateForm("amount_received", Number(event.target.value) || 0)} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-orange-100" />
                            </label>
                            {Number(form.amount_received) > 0 && <>
                                <label className="block text-sm font-semibold text-gray-600">Payment method
                                    <select value={form.payment_method} onChange={(event) => updateForm("payment_method", event.target.value)} className={`${fieldClass} mt-1`}>
                                        {["Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Other"].map((method) => <option key={method}>{method}</option>)}
                                    </select>
                                </label>
                                <input value={form.transaction_id} onChange={(event) => updateForm("transaction_id", event.target.value)} placeholder="Transaction ID (optional)" className={fieldClass} />
                                <input value={form.reference_number} onChange={(event) => updateForm("reference_number", event.target.value)} placeholder="Payment reference (optional)" className={fieldClass} />
                            </>}
                            <SummaryRow label="Balance due" value={totals.balance} />
                            <textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="Invoice notes" rows="3" className={`${fieldClass} resize-none`} />
                            <button type="submit" disabled={saving || loadingData} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-4 py-3 font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark active:scale-95 disabled:opacity-60">
                                <FiSave /> {saving ? "Saving invoice..." : "Create invoice"}
                            </button>
                        </div>
                    </aside>
                </div>
            )}
        </form>
    );
}

function SummaryRow({ label, value }) {
    return <div className="flex justify-between gap-3 text-gray-500"><span>{label}</span><span className="font-semibold text-secondary-dark">₹{money(value)}</span></div>;
}
