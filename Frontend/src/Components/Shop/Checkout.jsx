import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  CreditCard,
  Banknote,
  Info,
  LoaderCircle,
  LocateFixed,
  LockKeyhole,
  MapPin,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  UserRound,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api";
import { AuthContext } from "../../PrivateRouter/AuthContext";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import PageContainer from "../CommenComponents/PageContainer";
import PageHeader from "../CommenComponents/PageHeader";

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
  const [taxSettings, setTaxSettings] = useState(null);
  const [taxSettingsLoading, setTaxSettingsLoading] = useState(true);
  const [taxSettingsError, setTaxSettingsError] = useState("");
  const [taxSettingsLoadKey, setTaxSettingsLoadKey] = useState(0);
  const [form, setForm] = useState({
    customer_name: user?.name || user?.username || "",
    customer_email: user?.email || "",
    customer_phone: user?.phone || "",
    fulfillment_type: "Delivery",
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
    api.get("/settings/gst/public").then(({ data }) => {
      const gstRate = Number(data?.gst_rate);
      if (typeof data?.gst_enabled !== "boolean" || !Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100 ||
          !["Tax Exclusive", "Tax Inclusive"].includes(data?.tax_mode)) {
        throw new Error("The GST settings response was invalid.");
      }
      if (active) {
        setTaxSettings({
          gst_enabled: data.gst_enabled,
          gst_rate: gstRate,
          tax_mode: data.tax_mode,
        });
        setTaxSettingsError("");
      }
    }).catch((error) => {
      if (active) {
        setTaxSettings(null);
        setTaxSettingsError(error.response?.data?.message || error.message || "Unable to load current GST settings.");
      }
    }).finally(() => {
      if (active) setTaxSettingsLoading(false);
    });
    return () => { active = false; };
  }, [taxSettingsLoadKey]);

  useEffect(() => {
    let active = true;
    const loadSavedAddresses = async () => {
      setIsLoadingAddresses(true);
      try {
        const [savedResponse, ordersResponse] = await Promise.all([
          api.get("/users/me/addresses"),
          api.get("/orders/mine"),
        ]);
        if (!Array.isArray(savedResponse.data) || !Array.isArray(ordersResponse.data)) {
          throw new Error("The server returned invalid saved addresses or orders.");
        }

        const uniqueAddresses = new Map();
        savedResponse.data.forEach((address) => {
          const savedAddress = {
            ...address,
            customer_email: "",
            country: address.country || "India",
          };
          const signature = [
            savedAddress.street_address,
            savedAddress.city,
            savedAddress.district,
            savedAddress.state,
            savedAddress.country,
            savedAddress.zip_code,
          ].map((value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ")).join("|");
          if (savedAddress.street_address && !uniqueAddresses.has(signature)) {
            uniqueAddresses.set(signature, savedAddress);
          }
        });
        ordersResponse.data.forEach((order) => {
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
          ].map((value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ")).join("|");
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

  const subtotal = cart.reduce((total, item) => {
    const lineTotal = Math.round(
      (Number(item.price || 0) * Number(item.quantity || 0) + Number.EPSILON) * 100,
    ) / 100;
    return Math.round((total + lineTotal + Number.EPSILON) * 100) / 100;
  }, 0);
  const hasComboItems = cart.some((item) => item.item_type === "combo" || item.combo_id != null);
  const hasProductItems = cart.some((item) => item.item_type !== "combo" && item.combo_id == null);
  const orderComposition = hasComboItems && hasProductItems
    ? "Mixed"
    : hasComboItems
      ? "Combo"
      : hasProductItems
        ? "Single"
        : "Select items";
  const appliedGstRate = taxSettings?.gst_enabled ? taxSettings.gst_rate : 0;
  const gstAmount = taxSettings
    ? Math.round((subtotal * appliedGstRate /
      (taxSettings.tax_mode === "Tax Inclusive" ? 100 + appliedGstRate : 100) + Number.EPSILON) * 100) / 100
    : null;
  const total = taxSettings
    ? taxSettings.tax_mode === "Tax Inclusive"
      ? subtotal
      : Math.round((subtotal + gstAmount + Number.EPSILON) * 100) / 100
    : null;

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

  const getCheckoutPayload = () => ({
    ...form,
    ...(form.fulfillment_type === "Pickup" ? {
      street_address: "",
      city: "",
      district: "",
      state: "",
      country: "",
      zip_code: "",
    } : {}),
  });

  const verifyRazorpayPayment = async (paymentResponse) => {
    setSubmitting(true);
    try {
      const { data } = await api.post("/orders/checkout/verify-payment", {
        ...getCheckoutPayload(),
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
    if (!taxSettings) {
      toast.error("Current GST settings are unavailable. Please retry before placing your order.");
      return;
    }

    setSubmitting(true);
    let paymentModalOpened = false;
    const checkoutPayload = getCheckoutPayload();
    try {
      if (form.payment_method === "Cash") {
        const { data } = await api.post("/orders/checkout", checkoutPayload);
        await finishOrder(data);
        return;
      }

      const { data: paymentOrder } = await api.post("/orders/checkout/payment-order", checkoutPayload);
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

  const fieldClass = "mt-1.5 w-full rounded-lg border border-[#e5d8ca] bg-white px-3 py-2.5 text-sm text-[#351d0e] outline-none transition focus:border-[#ef7412] focus:ring-2 focus:ring-[#ef7412]/10";
  const labelClass = "block text-xs font-semibold text-[#4c3525]";

  if (createdOrderId) {
    return (
      <>
        <PageHeader title="Order placed" />
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
                Your {form.fulfillment_type === "Pickup" ? "pickup" : "delivery"} details are securely processed
              </div>
              <Link to="/shop" className="mt-7 inline-flex rounded-lg bg-[#351d0e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a34720]">
                Continue shopping
              </Link>
            </section>
          </PageContainer>
        </main>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Checkout" />
      <main className="relative min-h-[65vh] overflow-x-clip bg-[#fbf6f1] py-6 sm:py-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 bottom-8 h-64 w-64 rounded-full bg-[#f4d8bd]/35 blur-3xl" />
          <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-[#ffdfc5]/40 blur-3xl" />
        </div>
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
              <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h1 className="font-serif text-2xl font-bold leading-tight text-[#351d0e] sm:text-3xl">Complete Your Order</h1>
                  <p className="mt-1 text-sm text-[#725d4b]">Review your details, choose a payment method and place your order.</p>
                </div>
                <ol aria-label="Checkout progress" className="flex w-full max-w-[500px] items-center justify-between gap-2 sm:gap-4 lg:ml-auto">
                  <li className="flex shrink-0 flex-col items-center gap-1 text-[11px] font-semibold text-[#a34720] sm:text-xs">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ef7412] text-white shadow-sm"><ShoppingBag size={16} /></span>
                    Cart
                  </li>
                  <li aria-hidden="true" className="h-px flex-1 bg-[#ef7412]" />
                  <li aria-current="step" className="flex shrink-0 flex-col items-center gap-1 text-[11px] font-bold text-[#351d0e] sm:text-xs">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ef7412] text-white shadow-sm">
                      {form.fulfillment_type === "Pickup" ? <Store size={17} /> : <MapPin size={17} />}
                    </span>
                    {form.fulfillment_type}
                  </li>
                  <li aria-hidden="true" className="h-px flex-1 bg-[#d9c9b9]" />
                  <li className="flex shrink-0 flex-col items-center gap-1 text-[11px] text-[#8b735e] sm:text-xs">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d9c9b9] bg-white"><CreditCard size={16} /></span>
                    Payment
                  </li>
                  <li aria-hidden="true" className="h-px flex-1 bg-[#d9c9b9]" />
                  <li className="flex shrink-0 flex-col items-center gap-1 text-[11px] text-[#8b735e] sm:text-xs">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d9c9b9] bg-white"><Check size={16} /></span>
                    Complete
                  </li>
                </ol>
              </header>

            <form onSubmit={handleSubmit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.62fr)_minmax(330px,0.95fr)]">
              <section className="overflow-hidden rounded-2xl border border-[#eadccd] bg-white/95 shadow-[0_8px_28px_rgba(74,38,19,0.07)]">
                <fieldset className="border-b border-[#eee4d8] px-4 py-5 sm:px-6 sm:py-6">
                  <legend className="flex pt-4 items-center gap-2 text-sm font-bold text-[#351d0e]">
                    <MapPin size={17} className="text-[#ef7412]" /> Delivery Option
                  </legend>
                  <div className="mt-1 grid gap-4 sm:grid-cols-2">
                    {[
                      { value: "Delivery", label: "Delivery", description: "Deliver to my address", Icon: Truck },
                      { value: "Pickup", label: "Pickup", description: "I will collect my order", Icon: Store },
                    ].map(({ value, label, description, Icon }) => (
                      <label
                        key={value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                          form.fulfillment_type === value
                            ? "border-[#ef7412] bg-[#fff7ef] shadow-sm"
                            : "border-[#e5d8ca] bg-white hover:border-[#ef7412]/60"
                        } ${submitting ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        <input
                          type="radio"
                          name="fulfillment_type"
                          value={value}
                          checked={form.fulfillment_type === value}
                          onChange={updateForm}
                          disabled={submitting}
                          className="sr-only"
                        />
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0df] text-[#ef7412]">
                          <Icon size={20} />
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-[#351d0e]">{label}</span>
                          <span className="mt-0.5 block text-xs text-[#8b735e]">{description}</span>
                        </span>
                        <span className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          form.fulfillment_type === value
                            ? "border-[#ef7412] bg-[#ef7412] text-white"
                            : "border-[#d9c9b9] bg-white text-transparent"
                        }`}>
                          <Check size={12} />
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                {form.fulfillment_type === "Delivery" && (
                  <section className="border-b border-[#eee4d8] px-4 py-4 sm:px-6">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#351d0e]">
                      <MapPin size={17} className="text-[#ef7412]" /> Select Address
                    </h3>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8b735e]" size={16} />
                      <input
                        type="search"
                        value={addressSearch}
                        onChange={(event) => setAddressSearch(event.target.value)}
                        placeholder="Search saved address..."
                        aria-label="Search saved delivery addresses"
                        className={`${fieldClass} mt-0 py-2.5 pl-9`}
                      />
                    </div>
                    {isLoadingAddresses ? (
                      <p className="mt-2 text-xs text-[#8b735e]">Loading saved addresses...</p>
                    ) : savedAddresses.length === 0 ? (
                      <p className="mt-2 text-xs text-[#8b735e]">No saved addresses yet. Add your delivery address below.</p>
                    ) : addressSearch.trim() && filteredAddresses.length === 0 ? (
                      <p className="mt-2 text-xs text-[#8b735e]">No saved addresses match your search.</p>
                    ) : addressSearch.trim() ? (
                      <div className="mt-2 grid max-h-36 gap-2 overflow-y-auto sm:grid-cols-2">
                        {filteredAddresses.map((address) => (
                          <button
                            key={address.id}
                            type="button"
                            onClick={() => selectSavedAddress(address)}
                            aria-pressed={selectedAddressId === address.id}
                            className={`flex w-full items-start gap-2 rounded-lg border p-2.5 text-left transition ${
                              selectedAddressId === address.id
                                ? "border-[#ef7412] bg-[#fff7ef]"
                                : "border-[#e5d8ca] hover:border-[#ef7412]/60"
                            }`}
                          >
                            <span className="mt-0.5 text-[#ef7412]"><MapPin size={15} /></span>
                            <span className="min-w-0 text-xs">
                              <span className="block font-bold text-[#351d0e]">{address.customer_name || "Saved address"}</span>
                              <span className="mt-0.5 block text-[#8b735e]">
                                {[address.street_address, address.city, address.state, address.zip_code].filter(Boolean).join(", ")}
                              </span>
                            </span>
                            {selectedAddressId === address.id && <Check size={15} className="ml-auto shrink-0 text-[#ef7412]" />}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-[#8b735e]">
                        {savedAddresses.length} saved address{savedAddresses.length === 1 ? "" : "es"} available — search to select one.
                      </p>
                    )}
                  </section>
                )}

                <div className="p-4 sm:p-5 sm:px-6">
                  <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#351d0e]">
                    <UserRound size={17} className="text-[#ef7412]" /> Customer Details
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className={labelClass}>
                      Full Name *
                      <input className={fieldClass} name="customer_name" value={form.customer_name} onChange={updateForm} autoComplete="name" required maxLength={191} />
                    </label>
                    <label className={labelClass}>
                      Phone Number *
                      <input className={fieldClass} name="customer_phone" value={form.customer_phone} onChange={updateForm} type="tel" autoComplete="tel" required maxLength={32} />
                    </label>
                    <label className={labelClass}>
                      Email Address
                      <input className={fieldClass} name="customer_email" value={form.customer_email} onChange={updateForm} type="email" autoComplete="email" maxLength={191} />
                    </label>
                  </div>

                  {form.fulfillment_type === "Delivery" && (
                    <section className="mt-5 border-t border-[#eee4d8] pt-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-[#351d0e]">
                          <MapPin size={17} className="text-[#ef7412]" /> Delivery Address
                        </h3>
                        <button
                          type="button"
                          onClick={useCurrentLocation}
                          disabled={locating || submitting}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#ef7412]/50 px-3 py-1.5 text-xs font-bold text-[#ef7412] transition hover:bg-[#fff7ef] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {locating ? <LoaderCircle className="animate-spin" size={14} /> : <LocateFixed size={14} />}
                          {locating ? "Finding..." : "Use Current Location"}
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className={`${labelClass} sm:col-span-2 lg:col-span-4`}>
                          Street Address *
                          <textarea className={fieldClass} name="street_address" value={form.street_address} onChange={updateForm} autoComplete="street-address" rows={2} required maxLength={255} />
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
                          PIN Code *
                          <input className={fieldClass} name="zip_code" value={form.zip_code} onChange={updateForm} autoComplete="postal-code" required maxLength={32} />
                        </label>
                        <label className={`${labelClass} sm:col-span-2 lg:col-span-2`}>
                          Country *
                          <input className={fieldClass} name="country" value={form.country} onChange={updateForm} autoComplete="country-name" required maxLength={191} />
                        </label>
                      </div>
                    </section>
                  )}

                  <section className="mt-5 border-t border-[#eee4d8] pt-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#351d0e]">
                      <CreditCard size={17} className="text-[#ef7412]" /> Payment Method
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                        form.payment_method === "Cash" ? "border-[#ef7412] bg-[#fff7ef]" : "border-[#e5d8ca] hover:border-[#ef7412]/60"
                      } ${submitting ? "cursor-not-allowed opacity-60" : ""}`}>
                        <input type="radio" name="payment_method" value="Cash" checked={form.payment_method === "Cash"} onChange={updateForm} disabled={submitting} className="sr-only" />
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fff0df] text-[#ef7412]"><Banknote size={20} /></span>
                        <span>
                          <span className="block text-sm font-bold text-[#351d0e]">Cash on Delivery</span>
                          <span className="mt-0.5 block text-xs text-[#8b735e]">Pay when your order arrives</span>
                        </span>
                        {form.payment_method === "Cash" && <Check size={17} className="ml-auto shrink-0 text-[#ef7412]" />}
                      </label>
                      <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                        form.payment_method === "Razorpay" ? "border-[#ef7412] bg-[#fff7ef]" : "border-[#e5d8ca] hover:border-[#ef7412]/60"
                      } ${submitting ? "cursor-not-allowed opacity-60" : ""}`}>
                        <input type="radio" name="payment_method" value="Razorpay" checked={form.payment_method === "Razorpay"} onChange={updateForm} disabled={submitting} className="sr-only" />
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fff0df] text-[#ef7412]"><CreditCard size={20} /></span>
                        <span>
                          <span className="block text-sm font-bold text-[#351d0e]">Pay Online</span>
                          <span className="mt-0.5 block text-xs text-[#8b735e]">UPI, cards and netbanking</span>
                        </span>
                        {form.payment_method === "Razorpay" && <Check size={17} className="ml-auto shrink-0 text-[#ef7412]" />}
                      </label>
                    </div>
                  </section>
                </div>
              </section>

              <aside className="self-start lg:sticky lg:top-24">
                <section className="overflow-hidden rounded-2xl border border-[#eadccd] bg-white/95 shadow-[0_8px_28px_rgba(74,38,19,0.07)]">
                  <div className="flex items-center justify-between gap-3 border-b border-[#eee4d8] px-4 py-4 sm:px-5">
                    <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0df] text-[#ef7412]"><ShoppingBag size={19} /></span>
                    <div>
                      <h2 className="font-serif text-lg font-bold text-[#351d0e] sm:text-xl">Order Summary</h2>
                      <p className="text-xs text-[#8b735e]">
                        Order type: <span className="font-bold text-[#a34720]">{orderComposition}</span>
                      </p>
                    </div>
                    </div>
                    <span className="text-xs font-semibold text-[#725d4b]">{cart.length} {cart.length === 1 ? "item" : "items"}</span>
                  </div>
                  <div className="p-4 sm:p-5">
                    <ul className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                      {cart.map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-3 border-b border-[#f0e8df] pb-3 last:border-0">
                          <div className="flex min-w-0 items-center gap-3">
                            <img src={item.image || "/images/logo.png"} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-[#f7efe5] p-1 object-contain" />
                            <div className="min-w-0">
                              <p className="line-clamp-1 text-sm font-bold text-[#351d0e]">{item.name}</p>
                              <p className="mt-1 text-[11px] text-[#8b735e]">
                                {item.colorName || item.size
                                  ? [item.colorName, item.size].filter(Boolean).join(" · ")
                                  : item.item_type === "combo" ? "Furniture combo" : "Furniture"}
                                {" · "}Qty {item.quantity}
                              </p>
                              {item.item_type === "combo" && item.combo_items?.length > 0 && (
                                <p className="mt-0.5 text-[10px] text-[#8b735e]">
                                  Includes {item.combo_items.length} {item.combo_items.length === 1 ? "product" : "products"}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="shrink-0 text-sm font-extrabold text-[#351d0e]">
                            {formatCheckoutAmount(Number(item.price || 0) * Number(item.quantity || 0))}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 space-y-2 border-t border-[#eee4d8] pt-3 text-xs sm:text-sm">
                      <div className="flex justify-between text-[#725d4b]">
                        <span>Subtotal ({cart.length} {cart.length === 1 ? "item" : "items"})</span>
                        <span className="font-semibold text-[#351d0e]">{formatCheckoutAmount(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-[#725d4b]">
                        <span className="flex items-center gap-1.5">
                          {taxSettings
                            ? !taxSettings.gst_enabled
                              ? "GST (disabled)"
                              : `${taxSettings.tax_mode === "Tax Inclusive" ? "GST included" : "GST"} (${taxSettings.gst_rate}%)`
                            : "GST settings"}
                          <Info size={14} className="text-[#8b735e]" />
                        </span>
                        <span>{taxSettings ? formatCheckoutAmount(gstAmount) : taxSettingsLoading ? "Loading..." : "Unavailable"}</span>
                      </div>
                      <div className="flex justify-between text-[#725d4b]">
                        <span>{form.fulfillment_type === "Pickup" ? "Pickup Charges" : "Delivery Charges"}</span>
                        <span className="rounded-full bg-[#eaf5ed] px-2 py-0.5 text-[10px] font-bold uppercase text-[#278044]">
                          {form.fulfillment_type === "Pickup" ? "None" : "Free"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-[#fff0df] px-3.5 py-3 font-bold text-[#351d0e]">
                        <span className="font-serif text-base sm:text-lg">Total Amount</span>
                        <span className="text-lg font-extrabold text-[#ef7412] sm:text-xl">{taxSettings ? formatCheckoutAmount(total) : "Unavailable"}</span>
                      </div>
                    </div>
                    {taxSettingsError && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                        <p role="alert">Could not load current GST settings: {taxSettingsError}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setTaxSettingsLoading(true);
                            setTaxSettingsError("");
                            setTaxSettingsLoadKey((key) => key + 1);
                          }}
                          className="rounded-md bg-white px-3 py-1.5 font-bold text-red-700 shadow-sm hover:bg-red-100"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={submitting || !cart.length || !taxSettings}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#351d0e] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a34720] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <LockKeyhole size={16} />
                      {submitting ? "Processing..." : !taxSettings
                        ? taxSettingsLoading ? "Loading tax settings..." : "Tax settings unavailable"
                        : form.payment_method === "Cash"
                          ? `Place Order · ${formatCheckoutAmount(total)}`
                          : `Pay Securely · ${formatCheckoutAmount(total)}`}
                      <span aria-hidden="true">→</span>
                    </button>
                    <p className="mt-3 flex items-center justify-center gap-2 text-center text-[11px] text-[#725d4b]">
                      <ShieldCheck size={15} className="text-[#a34720]" />
                      Secure Checkout <span className="text-[#d9c9b9]">|</span> Your information is safe with us.
                    </p>
                  </div>
                </section>
              </aside>
            </form>

            </>
          )}
        </PageContainer>
      </main>
    </>
  );
};

export default Checkout;
