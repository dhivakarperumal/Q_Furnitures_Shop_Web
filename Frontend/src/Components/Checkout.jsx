import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CreditCard,
  Headphones,
  Info,
  LoaderCircle,
  LocateFixed,
  LockKeyhole,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api";
import { AuthContext } from "../PrivateRouter/AuthContext";
import { StoreContext } from "../PrivateRouter/StoreContext";
import PageContainer from "./CommenComponents/PageContainer";

const GST_RATE = 3;
const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
const checkoutAmountFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
let razorpayScriptPromise;

function formatCheckoutAmount(value) {
  const amount = Number(value || 0);
  return `₹${checkoutAmountFormatter.format(Number.isFinite(amount) ? amount : 0)}`;
}

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = RAZORPAY_SCRIPT_URL;
      script.onload = () => resolve(true);
      script.onerror = () => {
        razorpayScriptPromise = null;
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }
  return razorpayScriptPromise;
}

const Checkout = () => {
  const { user } = useContext(AuthContext);
  const { cart, loadingCart, clearCart } = useContext(StoreContext);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [addressSearch, setAddressSearch] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState(null);
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

  useEffect(() => {
    let active = true;
    const loadSavedAddresses = async () => {
      setIsLoadingAddresses(true);
      try {
        const { data } = await api.get("/orders/mine");
        if (!Array.isArray(data)) {
          throw new Error("The server returned an invalid order list.");
        }

        const uniqueAddresses = new Map();
        data.forEach((order) => {
          const address = order.shipping_address || order;
          const savedAddress = {
            id: order.order_id || order.id || "",
            customer_name: address.customer_name || order.customer_name || "",
            customer_email: address.customer_email || order.customer_email || "",
            customer_phone: address.customer_phone || order.customer_phone || "",
            street_address: address.street_address || address.address || "",
            city: address.city || "",
            district: address.district || "",
            state: address.state || "",
            country: address.country || "India",
            zip_code: address.zip_code || "",
          };
          const signature = [
            savedAddress.street_address,
            savedAddress.city,
            savedAddress.district,
            savedAddress.state,
            savedAddress.country,
            savedAddress.zip_code,
          ].map((value) => String(value).trim().toLowerCase().replace(/\s+/g, " ")).join("|");
          if (savedAddress.street_address && !uniqueAddresses.has(signature)) {
            if (!savedAddress.id) savedAddress.id = signature;
            uniqueAddresses.set(signature, savedAddress);
          }
        });

        if (active) setSavedAddresses([...uniqueAddresses.values()]);
      } catch (error) {
        if (active) {
          console.error("Could not load saved delivery addresses:", error);
          toast.error(error.response?.data?.message || "Could not load saved delivery addresses.");
        }
      } finally {
        if (active) setIsLoadingAddresses(false);
      }
    };

    if (user?.user_id) loadSavedAddresses();
    return () => {
      active = false;
    };
  }, [user?.user_id]);

  const filteredAddresses = useMemo(() => {
    const query = addressSearch.trim().toLowerCase();
    if (!query) return [];
    return savedAddresses.filter((address) =>
      [
        address.customer_name,
        address.customer_email,
        address.customer_phone,
        address.street_address,
        address.city,
        address.district,
        address.state,
        address.country,
        address.zip_code,
      ].some((value) => String(value || "").toLowerCase().includes(query)),
    );
  }, [addressSearch, savedAddresses]);

  const subtotal = cart.reduce(
    (total, item) => total + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );
  const gstAmount = Math.round((subtotal * GST_RATE + Number.EPSILON) * 100) / 100;
  const total = subtotal + gstAmount;

  const updateForm = (event) => {
    setSelectedAddressId(null);
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const selectSavedAddress = (address) => {
    setSelectedAddressId(address.id);
    setForm((current) => ({
      ...current,
      customer_name: address.customer_name || current.customer_name,
      customer_email: address.customer_email || current.customer_email,
      customer_phone: address.customer_phone || current.customer_phone,
      street_address: address.street_address,
      city: address.city,
      district: address.district,
      state: address.state,
      country: address.country,
      zip_code: address.zip_code,
    }));
    toast.success("Saved delivery address selected.");
  };

  const useCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported by this browser.");
      return;
    }

    setLocating(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        });
      });
      const { latitude, longitude } = position.coords;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,
        { headers: { "Accept-Language": "en" } },
      );
      if (!response.ok) throw new Error("Address lookup failed. Please enter your address manually.");

      const result = await response.json();
      const address = result.address;
      if (!address) throw new Error("Could not find an address for your current location.");

      const city = address.city || address.town || address.village || address.municipality || address.suburb || "";
      const streetAddress = [
        address.house_number,
        address.road || address.pedestrian || address.footway,
        address.neighbourhood || address.suburb,
      ].filter(Boolean).join(", ");
      const locationFields = {
        street_address: (streetAddress || result.name || "").slice(0, 255),
        city,
        district: address.state_district || address.county || "",
        state: address.state || "",
        country: address.country || "",
        zip_code: address.postcode || "",
      };
      if (!Object.values(locationFields).some(Boolean)) {
        throw new Error("Could not find delivery address details for your current location.");
      }

      setForm((current) => ({
        ...current,
        ...Object.fromEntries(Object.entries(locationFields).filter(([, value]) => value)),
      }));
      setSelectedAddressId(null);
      toast.success("Delivery address filled from your current location.");
    } catch (error) {
      if (error && typeof error.code === "number") {
        const messages = {
          1: "Location permission was denied. Allow location access or enter your address manually.",
          2: "Your current location is unavailable. Please try again or enter your address manually.",
          3: "Location request timed out. Please try again.",
        };
        toast.error(messages[error.code] || "Unable to get your current location.");
      } else {
        toast.error(error.message || "Unable to look up your current address.");
      }
    } finally {
      setLocating(false);
    }
  };

  const finishOrder = async (data) => {
    if (!data?.order_id) {
      throw new Error("The order was created but no order number was returned.");
    }
    setCreatedOrderId(data.order_id);
    await clearCart();
    toast.success("Your order has been placed.");
  };

  const verifyRazorpayPayment = async (paymentResponse) => {
    setSubmitting(true);
    try {
      const { data } = await api.post("/orders/checkout/verify-payment", {
        ...form,
        ...paymentResponse,
      });
      await finishOrder(data);
    } catch (error) {
      console.error("Razorpay payment verification failed:", error);
      toast.error(error.response?.data?.message || "Payment was received but order verification failed. Please contact support.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || cart.length === 0) return;

    setSubmitting(true);
    let paymentModalOpened = false;
    try {
      if (form.payment_method === "Cash") {
        const { data } = await api.post("/orders/checkout", form);
        await finishOrder(data);
        return;
      }

      const { data: paymentOrder } = await api.post("/orders/checkout/payment-order", form);
      if (!await loadRazorpay()) {
        throw new Error("Could not load Razorpay checkout. Please try again.");
      }
      const checkout = new window.Razorpay({
        key: paymentOrder.key_id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: "Q Living Furniture",
        description: "Furniture order payment",
        order_id: paymentOrder.order_id,
        prefill: {
          name: form.customer_name,
          email: form.customer_email,
          contact: form.customer_phone,
        },
        theme: { color: "#351d0e" },
        handler: verifyRazorpayPayment,
        modal: {
          ondismiss: () => {
            paymentModalOpened = false;
            setSubmitting(false);
            toast("Payment cancelled. Your cart is unchanged.");
          },
        },
      });
      checkout.on("payment.failed", (event) => {
        toast.error(event.error?.description || "Payment failed. Please try again.");
        paymentModalOpened = false;
        setSubmitting(false);
      });
      paymentModalOpened = true;
      checkout.open();
    } catch (error) {
      paymentModalOpened = false;
      console.error("Checkout failed:", error);
      toast.error(error.response?.data?.message || error.message || "Could not place your order.");
    } finally {
      if (!paymentModalOpened) setSubmitting(false);
    }
  };

  const fieldClass = "mt-1.5 w-full rounded-lg border border-[#e5d8ca] bg-white px-3.5 py-3 text-sm text-[#351d0e] outline-none transition focus:border-[#a34720] focus:ring-2 focus:ring-[#a34720]/10";
  const labelClass = "block text-sm font-semibold text-[#4c3525]";

  if (createdOrderId) {
    return (
      <main className="min-h-[60vh] bg-gradient-to-br from-[#f7efe5] via-white to-[#fcfaf7] py-12 sm:py-16">
        <PageContainer>
          <section className="mx-auto max-w-xl rounded-2xl border border-[#e5d8ca] bg-white px-6 py-10 text-center shadow-sm sm:px-10">
            <CheckCircle2 className="mx-auto text-[#278044]" size={54} />
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#a06e46]">Order confirmed</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#351d0e]">Thank you for your order</h1>
            <p className="mt-3 text-sm text-[#8b735e]">
              Your order number is <strong className="text-[#351d0e]">{createdOrderId}</strong>.
            </p>
            <div className="mt-8 flex items-center justify-center gap-2 text-xs font-bold text-[#278044]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eaf5ed]"><Check size={15} /></span>
              Payment and delivery details are securely processed
            </div>
            <Link to="/shop" className="mt-7 inline-flex rounded-lg bg-[#351d0e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a34720]">
              Continue shopping
            </Link>
          </section>
        </PageContainer>
      </main>
    );
  }

  return (
    <main className="min-h-[60vh] bg-gradient-to-br from-[#f7efe5] via-white to-[#fcfaf7] py-5 sm:py-8">
      <PageContainer>
        {loadingCart ? (
          <div className="mt-6 rounded-xl border border-[#e5d8ca] bg-white p-8 text-center text-sm text-[#8b735e]">Loading your cart...</div>
        ) : cart.length === 0 ? (
          <section className="mx-auto mt-8 max-w-xl rounded-2xl border border-dashed border-[#d9c4aa] bg-white px-5 py-14 text-center">
            <h1 className="text-xl font-semibold text-[#351d0e]">Your cart is empty</h1>
            <p className="mt-2 text-sm text-[#8b735e]">Add something beautiful before checking out.</p>
            <Link to="/shop" className="mt-6 inline-flex rounded-lg bg-[#351d0e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a34720]">
              Browse furniture
            </Link>
          </section>
        ) : (
          <>
            <header className="mb-5 overflow-hidden rounded-2xl border border-[#e5d8ca] bg-gradient-to-r from-[#f7efe5] via-white to-[#fcfaf7] p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-5">
              <div className="flex items-center gap-3">
                <Link to="/shop" aria-label="Continue shopping" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f7efe5] text-[#a34720] transition hover:bg-[#efe1d1]">
                  <ArrowLeft size={18} />
                </Link>
                <div>
                  <h1 className="text-xl font-semibold text-[#351d0e] sm:text-2xl">Checkout</h1>
                  <p className="text-xs text-[#8b735e] sm:text-sm">Complete your order securely</p>
                </div>
              </div>
              <ol aria-label="Checkout progress" className="mt-5 flex items-center justify-between gap-1 sm:mt-0 sm:min-w-[390px] sm:gap-3">
                <li className="flex flex-col items-center gap-1 text-[11px] font-semibold text-[#278044] sm:text-xs">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#278044] shadow-sm ring-1 ring-[#e5d8ca]"><ShoppingBag size={15} /></span>
                  <span className="flex items-center gap-1">Cart <CheckCircle2 size={12} /></span>
                </li>
                <li aria-hidden="true" className="mb-5 h-px flex-1 bg-[#a34720]/40 sm:w-7 sm:flex-none" />
                <li aria-current="step" className="flex flex-col items-center gap-1 text-[11px] font-bold text-[#a34720] sm:text-xs">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#351d0e] text-white shadow-sm"><MapPin size={15} /></span>
                  Delivery
                </li>
                <li aria-hidden="true" className="mb-5 h-px flex-1 bg-[#e5d8ca] sm:w-7 sm:flex-none" />
                <li className="flex flex-col items-center gap-1 text-[11px] text-[#8b735e] sm:text-xs">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5d8ca] bg-white"><CreditCard size={15} /></span>
                  Payment
                </li>
                <li aria-hidden="true" className="mb-5 h-px flex-1 bg-[#e5d8ca] sm:w-7 sm:flex-none" />
                <li className="flex flex-col items-center gap-1 text-[11px] text-[#8b735e] sm:text-xs">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5d8ca] bg-white"><Check size={15} /></span>
                  Complete
                </li>
              </ol>
            </header>

            <form onSubmit={handleSubmit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
              <section className="overflow-hidden rounded-2xl border border-[#e5d8ca] bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee4d8] bg-gradient-to-r from-[#f7efe5] to-white px-5 py-4 sm:px-7">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#351d0e] text-white"><Truck size={20} /></span>
                    <div>
                      <h2 className="text-lg font-semibold text-[#351d0e]">Delivery address</h2>
                      <p className="text-xs text-[#8b735e] sm:text-sm">Where should we deliver your furniture?</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    disabled={locating || submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#a34720] px-3 py-2.5 text-sm font-semibold text-[#a34720] transition hover:bg-[#a34720]/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {locating ? <LoaderCircle className="animate-spin" size={16} /> : <LocateFixed size={16} />}
                    <span>{locating ? "Finding..." : "Use current location"}</span>
                  </button>
                </div>
                <div className="p-4 sm:p-6 lg:p-7">
                  <section className="mb-5">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="flex items-center gap-2 text-sm font-bold text-[#351d0e]">
                        <MapPin size={16} className="text-[#a34720]" /> Saved addresses
                      </h3>
                      {savedAddresses.length > 0 && (
                        <span className="text-xs text-[#8b735e]">{savedAddresses.length} saved</span>
                      )}
                    </div>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8b735e]" size={16} />
                      <input
                        type="search"
                        value={addressSearch}
                        onChange={(event) => setAddressSearch(event.target.value)}
                        placeholder="Search your previous delivery addresses..."
                        aria-label="Search saved delivery addresses"
                        className={`${fieldClass} mt-0 pl-9`}
                      />
                    </div>
                    {isLoadingAddresses ? (
                      <p className="mt-3 text-sm text-[#8b735e]">Loading saved addresses...</p>
                    ) : savedAddresses.length === 0 ? (
                      <p className="mt-3 text-sm text-[#8b735e]">No previous delivery addresses yet. Enter a new address below.</p>
                    ) : !addressSearch.trim() ? (
                      <p className="mt-3 text-sm text-[#8b735e]">Search by name, phone, street, city, or PIN code to find a saved address.</p>
                    ) : filteredAddresses.length === 0 ? (
                      <p className="mt-3 text-sm text-[#8b735e]">No saved addresses match your search.</p>
                    ) : (
                      <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                        {filteredAddresses.map((address) => (
                          <button
                            key={address.id}
                            type="button"
                            onClick={() => selectSavedAddress(address)}
                            aria-pressed={selectedAddressId === address.id}
                            className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                              selectedAddressId === address.id
                                ? "border-[#a34720] bg-[#a34720]/5 ring-2 ring-[#a34720]/10"
                                : "border-[#e5d8ca] bg-white hover:border-[#a34720]/50 hover:bg-[#fcfaf7]"
                            }`}
                          >
                            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              selectedAddressId === address.id
                                ? "border-[#a34720] bg-[#a34720] text-white"
                                : "border-[#d9c4aa] text-transparent"
                            }`}>
                              <Check size={12} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-[#351d0e]">{address.customer_name || "Delivery address"}</span>
                                {selectedAddressId === address.id && (
                                  <span className="rounded-full bg-[#f7efe5] px-2 py-0.5 text-[10px] font-bold text-[#a34720]">Selected</span>
                                )}
                              </span>
                              {address.customer_phone && <span className="mt-1 block text-xs text-[#8b735e]">{address.customer_phone}</span>}
                              <span className="mt-1 block text-xs leading-snug text-[#8b735e]">
                                {[address.street_address, address.city, address.district, address.state, address.zip_code]
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
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
              </section>

              <aside className="space-y-4 lg:sticky lg:top-5">
                <section className="overflow-hidden rounded-2xl border border-[#e5d8ca] bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-[#eee4d8] bg-gradient-to-r from-[#f7efe5] to-white px-4 py-3.5 sm:px-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#351d0e] text-white"><ShoppingBag size={19} /></span>
                    <div>
                      <h2 className="text-base font-semibold text-[#351d0e] sm:text-lg">Order summary</h2>
                      <p className="text-xs text-[#8b735e]">Review your items and total</p>
                    </div>
                  </div>
                  <div className="p-4 sm:p-5">
                    <ul className="max-h-64 space-y-3 overflow-y-auto">
                      {cart.map((item) => (
                        <li key={item.id} className="flex items-start justify-between gap-3 border-b border-[#f0e8df] pb-3 last:border-0">
                          <div className="flex min-w-0 gap-3">
                            <img src={item.image || "/images/logo.png"} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-[#f0e8df] bg-[#f7efe5] p-1 object-contain" />
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-sm font-semibold text-[#351d0e]">{item.name}</p>
                              <p className="mt-1 text-xs text-[#8b735e]">
                                Qty {item.quantity}
                                {item.colorName ? ` · ${item.colorName}` : ""}
                                {item.size ? ` · ${item.size}` : ""}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-[#351d0e]">
                            {formatCheckoutAmount(Number(item.price || 0) * Number(item.quantity || 0))}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 space-y-2 border-t border-[#eee4d8] pt-3 text-sm">
                      <div className="flex justify-between text-[#725d4b]"><span>Subtotal</span><span className="font-semibold text-[#351d0e]">{formatCheckoutAmount(subtotal)}</span></div>
                      <div className="flex justify-between text-[#725d4b]">
                        <span className="flex items-center gap-1.5">GST ({GST_RATE}%) <Info size={14} className="text-[#8b735e]" /></span>
                        <span>{formatCheckoutAmount(gstAmount)}</span>
                      </div>
                      <div className="flex justify-between text-[#725d4b]">
                        <span>Delivery charges</span>
                        <span className="rounded-full bg-[#eaf5ed] px-2 py-0.5 text-[10px] font-bold uppercase text-[#278044]">Free</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-[#f7efe5] to-[#f3e6d8] px-3 py-2.5 font-bold text-[#351d0e]">
                        <span>Total amount</span><span className="text-lg">{formatCheckoutAmount(total)}</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-[#e5d8ca] bg-white p-4 shadow-sm sm:p-5">
                  <h3 className="text-sm font-bold text-[#351d0e]">Payment method</h3>
                  <label className="mt-3 flex items-center gap-2 rounded-lg border border-[#a34720] bg-white p-3 text-sm font-semibold text-[#a34720]">
                    <input type="radio" name="payment_method" value="Cash" checked={form.payment_method === "Cash"} onChange={updateForm} />
                    Cash on delivery
                  </label>
                  <label className="mt-2 flex items-center gap-2 rounded-lg border border-[#a34720] bg-white p-3 text-sm font-semibold text-[#a34720]">
                    <input type="radio" name="payment_method" value="Razorpay" checked={form.payment_method === "Razorpay"} onChange={updateForm} />
                    Pay online with Razorpay
                  </label>
                  <p className="mt-3 flex items-center gap-2 text-xs text-[#8b735e]">
                    <ShieldCheck size={15} className="shrink-0 text-[#278044]" />
                    Online payments support UPI, cards, and netbanking.
                  </p>
                  <button
                    type="submit"
                    disabled={submitting || !cart.length}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#351d0e] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a34720] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LockKeyhole size={16} />
                    {submitting ? "Processing..." : form.payment_method === "Cash"
                      ? `Place order · ${formatCheckoutAmount(total)}`
                      : `Pay securely · ${formatCheckoutAmount(total)}`}
                  </button>
                  <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-[#8b735e]"><LockKeyhole size={12} /> Your payment details are securely processed.</p>
                </section>

                <section className="rounded-2xl border border-[#e5d8ca] bg-white p-4 shadow-sm sm:p-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-[#351d0e]"><ShieldCheck size={18} className="text-[#a34720]" /> Why shop with us?</h3>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#8b735e]">
                    <p className="flex items-center gap-2 rounded-xl bg-[#f7efe5] p-3"><ShieldCheck className="shrink-0 text-[#a34720]" size={17} /><span><span className="block font-bold text-[#351d0e]">Secure payment</span>Protected checkout</span></p>
                    <p className="flex items-center gap-2 rounded-xl bg-[#f7efe5] p-3"><Truck className="shrink-0 text-[#a34720]" size={17} /><span><span className="block font-bold text-[#351d0e]">Delivery support</span>Help with your order</span></p>
                    <p className="flex items-center gap-2 rounded-xl bg-[#f7efe5] p-3"><RotateCcw className="shrink-0 text-[#a34720]" size={17} /><span><span className="block font-bold text-[#351d0e]">Returns information</span>Clear policy details</span></p>
                    <p className="flex items-center gap-2 rounded-xl bg-[#f7efe5] p-3"><Headphones className="shrink-0 text-[#a34720]" size={17} /><span><span className="block font-bold text-[#351d0e]">Support</span>We’re here to help</span></p>
                  </div>
                </section>
              </aside>
            </form>
          </>
        )}
      </PageContainer>
    </main>
  );
};

export default Checkout;
