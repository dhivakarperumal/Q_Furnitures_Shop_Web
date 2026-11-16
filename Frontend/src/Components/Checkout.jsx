import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, CreditCard, ShieldCheck, Truck } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api";
import { AuthContext } from "../PrivateRouter/AuthContext";
import { StoreContext } from "../PrivateRouter/StoreContext";
import { formatCurrency } from "../utils/currency";
import PageContainer from "./CommenComponents/PageContainer";

const GST_RATE = 3;

const Checkout = () => {
  const { user } = useContext(AuthContext);
  const { cart, loadingCart, clearCart } = useContext(StoreContext);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState("");
  const [form, setForm] = useState({
    customer_name: user?.name || user?.username || "",
    customer_email: user?.email || "",
    customer_phone: user?.phone || "",
    street_address: "",
    city: "",
    district: "",
    state: "",
    country: "India",
    zip_code: "",
    payment_method: "Cash",
  });

  const subtotal = cart.reduce(
    (total, item) => total + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );
  const gstAmount = Math.round((subtotal * GST_RATE + Number.EPSILON) * 100) / 100;
  const total = subtotal + gstAmount;

  const updateForm = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || cart.length === 0) return;

    setSubmitting(true);
    try {
      const { data } = await api.post("/orders/checkout", form);
      if (!data?.order_id) {
        throw new Error("The order was created but no order number was returned.");
      }
      setCreatedOrderId(data.order_id);
      await clearCart();
      toast.success("Your order has been placed.");
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error(error.response?.data?.message || error.message || "Could not place your order.");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = "mt-1.5 w-full rounded-lg border border-[#e5d8ca] bg-white px-3.5 py-3 text-sm text-[#351d0e] outline-none transition focus:border-[#a34720] focus:ring-2 focus:ring-[#a34720]/10";
  const labelClass = "block text-sm font-semibold text-[#4c3525]";

  if (createdOrderId) {
    return (
      <main className="min-h-[60vh] bg-[#fcfaf7] py-14 sm:py-20">
        <PageContainer>
          <section className="mx-auto max-w-xl rounded-2xl border border-[#e5d8ca] bg-white px-6 py-12 text-center shadow-sm sm:px-10">
            <CheckCircle2 className="mx-auto text-[#278044]" size={54} />
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#a06e46]">Order confirmed</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#351d0e]">Thank you for your order</h1>
            <p className="mt-3 text-sm text-[#8b735e]">
              Your order number is <strong className="text-[#351d0e]">{createdOrderId}</strong>.
            </p>
            <Link to="/shop" className="mt-7 inline-flex rounded-lg bg-[#351d0e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a34720]">
              Continue shopping
            </Link>
          </section>
        </PageContainer>
      </main>
    );
  }

  return (
    <main className="min-h-[60vh] bg-[#fcfaf7] py-8 sm:py-12">
      <PageContainer>
        <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-[#725d4b] transition hover:text-[#a34720]">
          <ArrowLeft size={17} /> Continue shopping
        </Link>
        <div className="mb-8 mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a06e46]">Almost home</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#351d0e] sm:text-4xl">Checkout</h1>
          <p className="mt-2 text-sm text-[#8b735e]">Add your delivery details to place your order.</p>
        </div>

        {loadingCart ? (
          <div className="rounded-2xl border border-[#e5d8ca] bg-white p-8 text-center text-sm text-[#8b735e]">Loading your cart…</div>
        ) : cart.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-[#d9c4aa] bg-white px-5 py-14 text-center">
            <h2 className="text-xl font-semibold text-[#351d0e]">Your cart is empty</h2>
            <p className="mt-2 text-sm text-[#8b735e]">Add something beautiful before checking out.</p>
            <Link to="/shop" className="mt-6 inline-flex rounded-lg bg-[#351d0e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a34720]">
              Browse furniture
            </Link>
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
            <section className="space-y-6">
              <div className="rounded-2xl border border-[#e5d8ca] bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-6 flex items-start gap-3">
                  <span className="rounded-xl bg-[#f7efe5] p-2.5 text-[#a34720]"><Truck size={20} /></span>
                  <div>
                    <h2 className="text-lg font-semibold text-[#351d0e]">Delivery information</h2>
                    <p className="mt-1 text-sm text-[#8b735e]">Where should we deliver your furniture?</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={`${labelClass} sm:col-span-2`}>
                    Full name *
                    <input className={fieldClass} name="customer_name" value={form.customer_name} onChange={updateForm} autoComplete="name" required maxLength={191} />
                  </label>
                  <label className={labelClass}>
                    Phone number *
                    <input className={fieldClass} name="customer_phone" value={form.customer_phone} onChange={updateForm} type="tel" autoComplete="tel" required maxLength={32} />
                  </label>
                  <label className={labelClass}>
                    Email address
                    <input className={fieldClass} name="customer_email" value={form.customer_email} onChange={updateForm} type="email" autoComplete="email" maxLength={191} />
                  </label>
                  <label className={`${labelClass} sm:col-span-2`}>
                    Street address *
                    <textarea className={fieldClass} name="street_address" value={form.street_address} onChange={updateForm} autoComplete="street-address" rows={3} required maxLength={255} />
                  </label>
                  <label className={labelClass}>
                    City *
                    <input className={fieldClass} name="city" value={form.city} onChange={updateForm} autoComplete="address-level2" required maxLength={191} />
                  </label>
                  <label className={labelClass}>
                    District
                    <input className={fieldClass} name="district" value={form.district} onChange={updateForm} maxLength={191} />
                  </label>
                  <label className={labelClass}>
                    State *
                    <input className={fieldClass} name="state" value={form.state} onChange={updateForm} autoComplete="address-level1" required maxLength={191} />
                  </label>
                  <label className={labelClass}>
                    PIN code *
                    <input className={fieldClass} name="zip_code" value={form.zip_code} onChange={updateForm} autoComplete="postal-code" required maxLength={32} />
                  </label>
                  <label className={labelClass}>
                    Country *
                    <input className={fieldClass} name="country" value={form.country} onChange={updateForm} autoComplete="country-name" required maxLength={191} />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e5d8ca] bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <span className="rounded-xl bg-[#f7efe5] p-2.5 text-[#a34720]"><CreditCard size={20} /></span>
                  <div>
                    <h2 className="text-lg font-semibold text-[#351d0e]">Payment method</h2>
                    <p className="mt-1 text-sm text-[#8b735e]">Choose how you would like to pay.</p>
                  </div>
                </div>
                <label className={labelClass}>
                  Payment
                  <select className={fieldClass} name="payment_method" value={form.payment_method} onChange={updateForm}>
                    <option value="Cash">Cash on delivery</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Credit or debit card</option>
                  </select>
                </label>
                <p className="mt-3 flex items-center gap-2 text-xs text-[#8b735e]">
                  <ShieldCheck size={15} className="shrink-0 text-[#278044]" />
                  Your order and delivery details are securely processed.
                </p>
              </div>
            </section>

            <aside className="rounded-2xl border border-[#e5d8ca] bg-white p-5 shadow-sm sm:p-7 lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold text-[#351d0e]">Order summary</h2>
              <ul className="mt-5 divide-y divide-[#f0e8df]">
                {cart.map((item) => (
                  <li key={item.id} className="flex gap-3 py-4 first:pt-0">
                    <img src={item.image || "/images/logo.png"} alt={item.name || "Furniture"} className="h-16 w-16 shrink-0 rounded-lg bg-[#f7efe5] object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#351d0e]">{item.name}</p>
                      <p className="mt-1 text-xs text-[#8b735e]">
                        Qty {item.quantity}
                        {item.colorName ? ` · ${item.colorName}` : ""}
                        {item.size ? ` · ${item.size}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-[#351d0e]">
                      {formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="space-y-3 border-t border-[#eee4d8] pt-4 text-sm">
                <div className="flex justify-between text-[#725d4b]"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between text-[#725d4b]"><span>GST ({GST_RATE}%)</span><span>{formatCurrency(gstAmount)}</span></div>
                <div className="flex justify-between border-t border-[#eee4d8] pt-4 text-base font-bold text-[#351d0e]"><span>Total</span><span>{formatCurrency(total)}</span></div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full rounded-lg bg-[#351d0e] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#a34720] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Placing order…" : `Place order · ${formatCurrency(total)}`}
              </button>
              <p className="mt-3 text-center text-xs text-[#8b735e]">Taxes calculated at checkout.</p>
            </aside>
          </form>
        )}
      </PageContainer>
    </main>
  );
};

export default Checkout;
