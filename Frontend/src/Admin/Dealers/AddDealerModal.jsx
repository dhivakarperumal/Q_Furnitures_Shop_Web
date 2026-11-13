import { useState } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";

const emptyDealer = {
    name: "",
    company_name: "",
    contact_person: "",
    mobile: "",
    whatsapp: "",
    email: "",
    gstin: "",
    pan: "",
    dealer_type: "Retail Dealer",
    dealer_category: "",
    billing_address: "",
    shipping_address: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    opening_balance: 0,
    credit_limit: 0,
    payment_terms: "",
    status: "Active",
    notes: "",
};

const dealerTypes = ["Retail Dealer", "Wholesale Dealer", "Distributor", "Furniture Reseller", "Corporate Dealer", "Franchise Dealer"];

export default function AddDealerModal({ isOpen, onClose, onSuccess, dealer = null }) {
    const [form, setForm] = useState(() => dealer ? { ...emptyDealer, ...dealer } : emptyDealer);
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));
    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            if (dealer) await api.put(`/dealers/${dealer.id}`, form);
            else await api.post("/dealers", form);
            toast.success(dealer ? "Dealer details updated." : "Dealer added successfully.");
            await onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Dealer save failed:", error);
            toast.error(error.response?.data?.message || "Dealer could not be saved.");
        } finally {
            setSaving(false);
        }
    };

    const inputClass = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary";
    const fields = [
        ["name", "Dealer name *", true],
        ["company_name", "Company name", false],
        ["contact_person", "Contact person", false],
        ["mobile", "Mobile number *", true],
        ["whatsapp", "WhatsApp", false],
        ["email", "Email", false],
        ["gstin", "GSTIN", false],
        ["pan", "PAN", false],
        ["dealer_category", "Dealer category", false],
        ["city", "City", false],
        ["district", "District", false],
        ["state", "State", false],
        ["pincode", "PIN code", false],
        ["opening_balance", "Opening balance (₹)", false],
        ["credit_limit", "Credit limit (₹)", false],
        ["payment_terms", "Payment terms", false],
    ];

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
            <section className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white shadow-2xl">
                <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
                    <div><h2 className="text-xl font-black text-slate-800">{dealer ? "Edit dealer" : "Add dealer"}</h2><p className="text-sm text-gray-500">Contact, GST, address and credit settings</p></div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Close"><FiX size={20} /></button>
                </header>
                <form onSubmit={submit} className="space-y-6 p-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {fields.map(([name, label, required]) => (
                            <label key={name} className="space-y-1 text-xs font-bold text-slate-600">
                                {label}
                                <input
                                    type={name === "email" ? "email" : ["opening_balance", "credit_limit"].includes(name) ? "number" : "text"}
                                    min={["opening_balance", "credit_limit"].includes(name) ? "0" : undefined}
                                    step={["opening_balance", "credit_limit"].includes(name) ? "0.01" : undefined}
                                    required={required}
                                    value={form[name] ?? ""}
                                    onChange={(event) => set(name, event.target.value)}
                                    className={inputClass}
                                />
                            </label>
                        ))}
                        <label className="space-y-1 text-xs font-bold text-slate-600">Dealer type
                            <select value={form.dealer_type} onChange={(event) => set("dealer_type", event.target.value)} className={inputClass}>
                                {dealerTypes.map((type) => <option key={type}>{type}</option>)}
                            </select>
                        </label>
                        <label className="space-y-1 text-xs font-bold text-slate-600">Status
                            <select value={form.status} onChange={(event) => set("status", event.target.value)} className={inputClass}>
                                <option>Active</option><option>Inactive</option>
                            </select>
                        </label>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1 text-xs font-bold text-slate-600">Billing address
                            <textarea rows="3" value={form.billing_address ?? ""} onChange={(event) => set("billing_address", event.target.value)} className={inputClass} />
                        </label>
                        <label className="space-y-1 text-xs font-bold text-slate-600">Shipping address
                            <textarea rows="3" value={form.shipping_address ?? ""} onChange={(event) => set("shipping_address", event.target.value)} className={inputClass} />
                        </label>
                        <label className="space-y-1 text-xs font-bold text-slate-600 sm:col-span-2">Notes
                            <textarea rows="2" value={form.notes ?? ""} onChange={(event) => set("notes", event.target.value)} className={inputClass} />
                        </label>
                    </div>
                    <footer className="flex justify-end gap-3 border-t pt-4">
                        <button type="button" onClick={onClose} className="rounded-lg border px-5 py-2.5 text-sm font-bold text-gray-600">Cancel</button>
                        <button type="submit" disabled={saving} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : dealer ? "Save changes" : "Create dealer"}</button>
                    </footer>
                </form>
            </section>
        </div>,
        document.body,
    );
}
