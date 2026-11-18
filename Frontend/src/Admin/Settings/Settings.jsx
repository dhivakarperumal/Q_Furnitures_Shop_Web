import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  CreditCard,
  Info,
  Percent,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import api from "../../api";

const INITIAL_SETTINGS = {
  printerModel: "Epson TM-T82",
  printerConnection: "USB",
  paperSize: "80mm",
  printCopies: "1",
  autoPrintReceipts: true,
  printLogo: true,
  printBarcodeLabels: false,
  storeName: "Q Furnitures",
  storeEmail: "admin@qfurnitures.in",
  receiptLogo: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  zipCode: "",
  gstin: "",
  invoicePrefix: "QF-",
  dateFormat: "DD/MM/YYYY",
  showTax: true,
  showDiscount: true,
  showPaymentQr: true,
  footerMessage: "Thank you for shopping with Q Furnitures!",
  cashPayments: true,
  upiPayments: true,
  cardPayments: true,
  onlinePayments: true,
  upiId: "",
  paymentTerms: "Payment due on delivery",
  businessType: "Furniture Retailer",
  timezone: "Asia/Kolkata",
  language: "English",
  currency: "INR (₹)",
  openingTime: "09:00",
  closingTime: "21:00",
  latitude: "",
  longitude: "",
  gstEnabled: true,
  gstRate: "18%",
  taxMode: "Tax Exclusive",
  timeFormat: "12-hour",
  numberFormat: "Indian (1,00,000)",
  baseDeliveryCharge: "0",
  freeDeliveryMinimum: "0",
  perKmCharge: "0",
  maxDeliveryDistance: "15",
  deliveryArea: "Local",
  expressDelivery: false,
  expressCharge: "0",
  estimatedDelivery: "3-7 business days",
  couponsEnabled: true,
  allowCouponStacking: false,
  defaultDiscountType: "Percentage",
  maxDiscount: "0",
  customerAccountsRequired: false,
  guestCheckout: true,
  orderNotifications: true,
  requireDeliveryAddress: true,
  lowStockAlerts: true,
  allowNegativeStock: false,
  automaticStockDeduction: true,
  reorderThreshold: "5",
  backupFrequency: "Weekly",
  exportFormat: "Excel (.xlsx)",
  includeOrderHistory: true,
  dataRetention: "12 months",
};

const SETTINGS_SECTIONS = [
  {
    id: "receipt",
    title: "Receipt Settings",
    description: "Set store details and choose what appears on receipts.",
    icon: ReceiptText,
    fields: [
      { name: "receiptLogo", label: "Receipt logo", type: "image", wide: true },
      { name: "storeName", label: "Store name", type: "text" },
      { name: "address", label: "Store address", type: "textarea", wide: true },
      { name: "phone", label: "Phone number", type: "tel" },
      { name: "storeEmail", label: "Store email", type: "email" },
      { name: "gstin", label: "GSTIN" },
      { name: "invoicePrefix", label: "Invoice prefix" },
      { name: "dateFormat", label: "Date format", type: "select", options: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] },
      { name: "footerMessage", label: "Receipt footer message", type: "textarea", wide: true },
      { name: "showTax", label: "Show tax details", type: "toggle" },
      { name: "showDiscount", label: "Show discounts", type: "toggle" },
      { name: "showPaymentQr", label: "Show payment QR code", type: "toggle" },
    ],
  },
  {
    id: "payments",
    title: "Payment Methods",
    description: "Choose the payment methods available to customers.",
    icon: CreditCard,
    fields: [
      { name: "cashPayments", label: "Cash on delivery", type: "toggle" },
      { name: "upiPayments", label: "UPI payments", type: "toggle" },
      { name: "cardPayments", label: "Card payments", type: "toggle" },
      { name: "onlinePayments", label: "Online payments", type: "toggle" },
      { name: "upiId", label: "UPI ID", placeholder: "store@upi" },
      { name: "paymentTerms", label: "Payment terms", type: "select", options: ["Payment due on delivery", "Pay before dispatch", "Full payment required"] },
    ],
  },
  {
    id: "store",
    title: "Store Profile",
    description: "Manage furniture store details, hours, and location.",
    icon: Store,
    fields: [
      { name: "storeName", label: "Store name" },
      { name: "businessType", label: "Business type", type: "select", options: ["Furniture Retailer", "Furniture Wholesaler", "Furniture Manufacturer", "Home Decor Store"] },
      { name: "storeEmail", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "tel" },
      { name: "openingTime", label: "Opening time", type: "time" },
      { name: "closingTime", label: "Closing time", type: "time" },
      { name: "address", label: "Address", type: "textarea", wide: true },
      { name: "city", label: "City" },
      { name: "state", label: "State" },
      { name: "country", label: "Country" },
      { name: "zipCode", label: "Postal code" },
      { name: "gstin", label: "GSTIN" },
      { name: "latitude", label: "Latitude", type: "number", step: "any" },
      { name: "longitude", label: "Longitude", type: "number", step: "any" },
    ],
  },
  {
    id: "tax",
    title: "Tax & GST",
    description: "Set the tax rules used to calculate customer orders.",
    icon: Percent,
    fields: [
      { name: "gstEnabled", label: "Enable GST", type: "toggle" },
      { name: "gstRate", label: "Default GST rate", type: "select", options: ["0%", "5%", "12%", "18%", "28%"] },
      { name: "taxMode", label: "Tax calculation mode", type: "select", options: ["Tax Exclusive", "Tax Inclusive"] },
    ],
  },
  {
    id: "delivery",
    title: "Delivery & Service Charges",
    description: "Set delivery pricing, service areas, and estimated delivery time.",
    icon: Truck,
    fields: [
      { name: "baseDeliveryCharge", label: "Base delivery charge (₹)", type: "number", min: 0, step: "0.01" },
      { name: "freeDeliveryMinimum", label: "Free delivery minimum (₹)", type: "number", min: 0, step: "0.01" },
      { name: "perKmCharge", label: "Charge per kilometre (₹)", type: "number", min: 0, step: "0.01" },
      { name: "maxDeliveryDistance", label: "Maximum delivery distance (km)", type: "number", min: 0, step: "0.1" },
      { name: "deliveryArea", label: "Delivery service area", type: "select", options: ["Local", "City", "Custom radius"] },
      { name: "expressDelivery", label: "Offer express delivery", type: "toggle" },
      { name: "expressCharge", label: "Express delivery charge (₹)", type: "number", min: 0, step: "0.01" },
      { name: "estimatedDelivery", label: "Estimated delivery", placeholder: "3-7 business days" },
    ],
  },
];

function SettingField({ field, value, onChange }) {
  const [imageError, setImageError] = useState("");
  const controlClass = "w-full rounded-xl border border-orange-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

  if (field.type === "image") {
    const handleImageChange = (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setImageError("Choose an image file to use as the receipt logo.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onChange(reader.result);
          setImageError("");
        } else {
          setImageError("Could not preview this image. Try another file.");
        }
      };
      reader.onerror = () => setImageError("Could not read this image. Try another file.");
      reader.readAsDataURL(file);
    };

    return (
      <div className={`space-y-3 ${field.wide ? "sm:col-span-2" : ""}`}>
        <label htmlFor={field.name} className="block text-xs font-bold uppercase tracking-wider text-stone-500">{field.label}</label>
        <input
          id={field.name}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="w-full rounded-xl border border-orange-100 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:font-bold file:text-orange-800 hover:file:bg-orange-100"
        />
        {imageError && <p role="alert" className="text-sm font-semibold text-red-600">{imageError}</p>}
        {value ? (
          <div className="flex items-center gap-4 rounded-xl border border-orange-100 bg-orange-50/50 p-3">
            <img src={value} alt="Receipt logo preview" className="h-16 w-24 rounded-lg border border-stone-200 bg-white object-contain p-1" />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-700">Logo selected</p>
              <p className="mt-1 text-xs text-stone-500">This preview is temporary and isn’t uploaded.</p>
            </div>
            <button type="button" onClick={() => { onChange(""); setImageError(""); }} className="rounded-lg px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50">
              Remove
            </button>
          </div>
        ) : (
          <p className="text-xs text-stone-500">Choose an image to preview it on the receipt. It will not be saved.</p>
        )}
      </div>
    );
  }

  if (field.type === "toggle") {
    return (
      <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border border-orange-100 bg-white px-4 py-3">
        <span className="text-sm font-semibold text-slate-700">{field.label}</span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 accent-orange-600"
        />
      </label>
    );
  }

  return (
    <label className={`block space-y-2 ${field.wide ? "sm:col-span-2" : ""}`}>
      <span className="block text-xs font-bold uppercase tracking-wider text-stone-500">{field.label}</span>
      {field.type === "select" ? (
        <select value={value} onChange={(event) => onChange(event.target.value)} className={controlClass}>
          {field.options.map((option) => <option key={option}>{option}</option>)}
        </select>
      ) : field.type === "textarea" ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className={`${controlClass} resize-y`} />
      ) : (
        <input
          type={field.type || "text"}
          value={value}
          min={field.min}
          step={field.step}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={controlClass}
        />
      )}
    </label>
  );
}

function ReceiptPreview({ settings }) {
  const total = 124_990;

  return (
    <aside className="rounded-2xl border border-orange-100 bg-orange-50/60 p-5">
      <h3 className="font-black text-secondary-dark">Receipt Preview</h3>
      <div className="mx-auto mt-4 max-w-sm rounded-xl border border-stone-200 bg-white p-5 text-center shadow-sm">
        {settings.receiptLogo && <img src={settings.receiptLogo} alt="Store logo on receipt" className="mx-auto mb-3 max-h-16 max-w-36 object-contain" />}
        {settings.storeName && <p className="text-sm font-black text-slate-800">{settings.storeName}</p>}
        <p className="mt-1 text-xs text-stone-500">{settings.address || "Store address"}</p>
        <div className="my-4 border-t border-dashed border-stone-300" />
        <div className="space-y-2 text-left text-xs text-slate-600">
          <div className="flex justify-between gap-4"><span>Accent Lounge Chair</span><span>{formatCurrency(49_990)}</span></div>
          <div className="flex justify-between gap-4"><span>Wooden Bookshelf</span><span>{formatCurrency(75_000)}</span></div>
        </div>
        <div className="my-4 border-t border-dashed border-stone-300" />
        <div className="flex justify-between text-sm font-black text-slate-800">
          <span>Total</span><span>{formatCurrency(total)}</span>
        </div>
        {settings.showPaymentQr && (
          <div className="mt-4 flex justify-center">
            <QRCodeSVG value={`upi://pay?pa=${encodeURIComponent(settings.upiId || "qfurnitures@upi")}&pn=Q%20Furnitures&am=${total}`} size={84} />
          </div>
        )}
        {settings.footerMessage && <p className="mt-3 text-xs text-stone-500">{settings.footerMessage}</p>}
      </div>
    </aside>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(null);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [taxSettingsLoading, setTaxSettingsLoading] = useState(true);
  const [taxSettingsLoaded, setTaxSettingsLoaded] = useState(false);
  const [taxSettingsSaving, setTaxSettingsSaving] = useState(false);
  const [taxSettingsError, setTaxSettingsError] = useState("");
  const [taxSettingsLoadKey, setTaxSettingsLoadKey] = useState(0);
  const activeSectionData = SETTINGS_SECTIONS.find((section) => section.id === activeSection);

  useEffect(() => {
    let cancelled = false;
    api.get("/settings/gst").then(({ data }) => {
      const gstRate = Number(data?.gst_rate);
      if (typeof data?.gst_enabled !== "boolean" || !Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100 ||
          !["Tax Exclusive", "Tax Inclusive"].includes(data?.tax_mode)) {
        throw new Error("The GST settings response was invalid.");
      }
      if (cancelled) return;
      setSettings((current) => ({
        ...current,
        gstEnabled: data.gst_enabled,
        gstRate: `${gstRate}%`,
        taxMode: data.tax_mode,
      }));
      setTaxSettingsLoaded(true);
    }).catch((error) => {
      if (cancelled) return;
      const message = error.response?.data?.message || error.message || "Unable to load GST settings.";
      setTaxSettingsError(message);
      toast.error(`Unable to load GST settings: ${message}`);
    }).finally(() => {
      if (!cancelled) setTaxSettingsLoading(false);
    });
    return () => { cancelled = true; };
  }, [taxSettingsLoadKey]);

  const updateSetting = (name, value) => {
    setSettings((current) => ({ ...current, [name]: value }));
  };

  const saveTaxSettings = async () => {
    const gstRate = Number(String(settings.gstRate).replace("%", "").trim());
    if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) {
      const message = "GST rate must be between 0% and 100%.";
      setTaxSettingsError(message);
      toast.error(message);
      return;
    }

    setTaxSettingsSaving(true);
    setTaxSettingsError("");
    try {
      const { data } = await api.put("/settings/gst", {
        gst_enabled: settings.gstEnabled,
        gst_rate: gstRate,
        tax_mode: settings.taxMode,
      });
      const savedRate = Number(data?.gst_rate);
      if (typeof data?.gst_enabled !== "boolean" || !Number.isFinite(savedRate) || savedRate < 0 || savedRate > 100 ||
          !["Tax Exclusive", "Tax Inclusive"].includes(data?.tax_mode)) {
        throw new Error("The saved GST settings response was invalid.");
      }
      setSettings((current) => ({
        ...current,
        gstEnabled: data.gst_enabled,
        gstRate: `${savedRate}%`,
        taxMode: data.tax_mode,
      }));
      toast.success("GST settings saved.");
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Unable to save GST settings.";
      setTaxSettingsError(message);
      toast.error(`Unable to save GST settings: ${message}`);
    } finally {
      setTaxSettingsSaving(false);
    }
  };

  const resetSection = () => {
    if (!activeSectionData) return;
    setSettings((current) => {
      const resetValues = Object.fromEntries(
        activeSectionData.fields.map((field) => [field.name, INITIAL_SETTINGS[field.name]]),
      );
      return { ...current, ...resetValues };
    });
  };

  return (
    <main className="space-y-6 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-secondary-dark">Store Settings</h1>
          <p className="mt-1 text-sm text-stone-500">Configure Q Furnitures store preferences and workflows.</p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 sm:self-auto">
          <Info size={14} /> GST status, rate, and calculation mode are saved
        </span>
      </header>

      {!activeSectionData ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className="group flex min-h-32 items-start gap-4 rounded-2xl border border-orange-100/80 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-800 transition group-hover:bg-orange-100">
                  <Icon size={21} />
                </span>
                <span>
                  <span className="block font-black text-slate-800">{section.title}</span>
                  <span className="mt-1 block text-sm leading-5 text-stone-500">{section.description}</span>
                </span>
              </button>
            );
          })}
        </section>
      ) : (
        <section className="space-y-5 rounded-2xl border border-orange-100/80 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-50 pb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveSection(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-600 transition hover:bg-stone-50"
                aria-label="Back to settings"
              >
                <ArrowLeft size={17} />
              </button>
              <div>
                <h2 className="text-lg font-black text-slate-800">{activeSectionData.title}</h2>
                <p className="text-sm text-stone-500">{activeSectionData.description}</p>
              </div>
            </div>
            <button type="button" onClick={resetSection} disabled={activeSection === "tax" && (!taxSettingsLoaded || taxSettingsLoading)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50">
              <RotateCcw size={15} /> Reset section
            </button>
          </div>

          {activeSection === "tax" && taxSettingsLoading ? (
            <p className="rounded-xl bg-orange-50 p-4 text-sm font-semibold text-orange-900">Loading GST settings...</p>
          ) : activeSection === "tax" && !taxSettingsLoaded ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
              <p role="alert" className="text-sm font-semibold text-red-700">{taxSettingsError || "GST settings could not be loaded."}</p>
              <button type="button" onClick={() => {
                setTaxSettingsLoading(true);
                setTaxSettingsLoaded(false);
                setTaxSettingsError("");
                setTaxSettingsLoadKey((key) => key + 1);
              }} className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-red-700 shadow-sm hover:bg-red-100">
                Retry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {activeSectionData.fields.map((field) => (
                <SettingField
                  key={field.name}
                  field={field}
                  value={settings[field.name]}
                  onChange={(value) => updateSetting(field.name, value)}
                />
              ))}
            </div>
          )}

          {activeSection === "tax" && taxSettingsLoaded && (
            <div className="flex flex-col gap-3 border-t border-orange-50 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">GST status, default rate, and calculation mode are saved to the server.</p>
                {taxSettingsError && <p role="alert" className="mt-1 text-sm font-semibold text-red-600">{taxSettingsError}</p>}
              </div>
              <button type="button" onClick={saveTaxSettings} disabled={taxSettingsSaving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">
                {taxSettingsSaving ? "Saving..." : "Save GST settings"}
              </button>
            </div>
          )}

          {activeSection === "receipt" && <ReceiptPreview settings={settings} />}

          {activeSectionData.link && (
            <button
              type="button"
              onClick={() => navigate(activeSectionData.link.path)}
              className="rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-105"
            >
              {activeSectionData.link.label}
            </button>
          )}

          <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            <ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" size={15} />
            {activeSection === "tax"
              ? "Checkout uses the saved GST status, rate, and tax calculation mode."
              : "These controls are a UI preview only. Changes stay on this page and reset when you leave or refresh."}
          </div>
        </section>
      )}
    </main>
  );
}
