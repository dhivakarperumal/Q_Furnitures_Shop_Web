import { useEffect, useRef } from "react";
import {
  CalendarDays,
  CreditCard,
  MapPin,
  PackageCheck,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { resolveMediaUrl } from "../utils/media";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function formatAmount(value) {
  const amount = Number(value || 0);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getStatusClass(status) {
  if (status === "Delivered") return "bg-emerald-50 text-emerald-700";
  if (status === "Cancelled") return "bg-red-50 text-red-700";
  if (status === "Shipping" || status === "Shipped") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-800";
}

function DetailCard({ icon: Icon, title, children }) {
  return (
    <section className="rounded-2xl border border-[#eee4d8] bg-white p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-sm font-bold text-[#351d0e]">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fff0df] text-[#a34720]">
          <Icon size={16} aria-hidden="true" />
        </span>
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function OrderDetailsModal({ order, onClose }) {
  const dialogRef = useRef(null);
  const address = order.shipping_address || order;
  const items = Array.isArray(order.items) ? order.items : [];
  const orderNumber = order.order_id || `ORD${String(order.id).padStart(4, "0")}`;
  const status = order.status || "Order Placed";
  const addressLines = [
    address.street_address || address.address,
    [address.city, address.district].filter(Boolean).join(", "),
    [address.state, address.zip_code].filter(Boolean).join(" "),
    address.country,
  ].filter(Boolean);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-[#21140d]/60 p-3 backdrop-blur-sm sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-details-title"
        tabIndex={-1}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-[#fffdfa] shadow-2xl outline-none"
      >
        <header className="flex items-center justify-between gap-4 border-b border-[#eee4d8] bg-gradient-to-r from-[#fff2e3] to-white px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#a06e46]">Order details</p>
            <h2 id="order-details-title" className="mt-1 truncate text-lg font-extrabold text-[#351d0e] sm:text-xl">
              {orderNumber}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${getStatusClass(status)}`}>{status}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close order details"
              className="rounded-lg p-2 text-[#806d5d] transition hover:bg-[#f5e9dd] hover:text-[#351d0e]"
            >
              <X size={19} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-5 sm:p-6">
          <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl bg-[#fcf5ed] px-4 py-3 text-xs text-[#725d4b]">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={15} className="text-[#a34720]" aria-hidden="true" />
              Placed {formatDate(order.created_at)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CreditCard size={15} className="text-[#a34720]" aria-hidden="true" />
              {order.payment_method || "Payment not specified"}
              {order.payment_status ? ` · ${order.payment_status}` : ""}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard icon={UserRound} title="Customer details">
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-[#8b735e]">Full name</dt>
                  <dd className="mt-0.5 font-semibold text-[#351d0e]">{address.customer_name || order.customer_name || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#8b735e]">Email address</dt>
                  <dd className="mt-0.5 break-all font-medium text-[#594333]">{address.customer_email || order.customer_email || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#8b735e]">Phone number</dt>
                  <dd className="mt-0.5 font-medium text-[#594333]">{address.customer_phone || order.customer_phone || "Not provided"}</dd>
                </div>
              </dl>
            </DetailCard>

            <DetailCard icon={MapPin} title="Delivery address">
              {addressLines.length ? (
                <address className="space-y-1 text-sm not-italic leading-5 text-[#594333]">
                  {addressLines.map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}
                </address>
              ) : (
                <p className="text-sm text-[#8b735e]">Delivery address is unavailable.</p>
              )}
            </DetailCard>
          </div>

          <DetailCard icon={PackageCheck} title={`Items (${items.length})`}>
            {items.length ? (
              <div className="divide-y divide-[#f0e8df]">
                {items.map((item, index) => (
                  <article
                    key={item.id || `${item.product_id || item.combo_id || item.product_name}-${index}`}
                    className="flex gap-3 py-4 first:pt-0 last:pb-0 sm:gap-4"
                  >
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#fcf5ed] sm:h-20 sm:w-20">
                      {item.image ? (
                        <img
                          src={resolveMediaUrl(item.image)}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-contain p-1.5"
                        />
                      ) : (
                        <PackageCheck size={24} className="text-[#a34720]" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-[#351d0e]">{item.product_name || item.name || "Furniture item"}</h4>
                          {item.item_type === "combo" && (
                            <span className="mt-1 inline-flex rounded-full bg-[#fff0df] px-2 py-0.5 text-[10px] font-bold text-[#a34720]">
                              Combo
                            </span>
                          )}
                        </div>
                        <p className="shrink-0 text-sm font-extrabold text-[#351d0e]">
                          {formatAmount(item.total ?? Number(item.price || 0) * Number(item.quantity || 0))}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-[#806d5d]">
                        Qty {item.quantity} · {formatAmount(item.price)} each
                        {item.variant_color ? ` · ${item.variant_color}` : ""}
                        {item.variant_size ? ` · ${item.variant_size}` : ""}
                      </p>
                      {Array.isArray(item.combo_items) && item.combo_items.length > 0 && (
                        <p className="mt-2 text-xs leading-5 text-[#806d5d]">
                          Includes: {item.combo_items.map((component) => component.product_name || "Furniture item").join(", ")}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#8b735e]">No item details are available for this order.</p>
            )}
          </DetailCard>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard icon={Truck} title="Delivery tracking">
              {order.courier_name || order.tracking_number ? (
                <dl className="space-y-2 text-sm">
                  {order.courier_name && (
                    <div>
                      <dt className="text-xs text-[#8b735e]">Courier</dt>
                      <dd className="mt-0.5 font-semibold text-[#351d0e]">{order.courier_name}</dd>
                    </div>
                  )}
                  {order.tracking_number && (
                    <div>
                      <dt className="text-xs text-[#8b735e]">Tracking number</dt>
                      <dd className="mt-0.5 break-all font-semibold text-[#351d0e]">{order.tracking_number}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-[#8b735e]">Tracking details will appear here when available.</p>
              )}
            </DetailCard>

            <DetailCard icon={CreditCard} title="Payment summary">
              <dl className="space-y-2 text-sm text-[#594333]">
                <div className="flex justify-between gap-4">
                  <dt>Subtotal</dt><dd className="font-medium">{formatAmount(order.subtotal ?? order.total_amount)}</dd>
                </div>
                {Number(order.discount_amount) > 0 && (
                  <div className="flex justify-between gap-4 text-emerald-700">
                    <dt>Discount</dt><dd className="font-medium">−{formatAmount(order.discount_amount)}</dd>
                  </div>
                )}
                {Number(order.gst_amount) > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt>GST{Number(order.gst_rate) > 0 ? ` (${Number(order.gst_rate)}%)` : ""}</dt>
                    <dd className="font-medium">{formatAmount(order.gst_amount)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 border-t border-[#eee4d8] pt-3 text-base font-extrabold text-[#351d0e]">
                  <dt>Order total</dt><dd>{formatAmount(order.total_amount)}</dd>
                </div>
              </dl>
            </DetailCard>
          </div>
        </div>
      </section>
    </div>
  );
}
