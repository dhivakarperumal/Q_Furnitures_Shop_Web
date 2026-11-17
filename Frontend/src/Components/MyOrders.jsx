import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, CreditCard, MapPin, PackageCheck, ShoppingBag } from "lucide-react";
import api from "../api";
import PageContainer from "./CommenComponents/PageContainer";
import PageHeader from "./CommenComponents/PageHeader";

const amountFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatAmount(value) {
  const amount = Number(value || 0);
  return `₹${amountFormatter.format(Number.isFinite(amount) ? amount : 0)}`;
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
  if (status === "Shipping") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-800";
}

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchOrders = async () => {
      try {
        const { data } = await api.get("/orders/mine");
        if (!Array.isArray(data)) {
          throw new Error("The server returned an invalid order list.");
        }
        if (active) {
          setOrders(data);
          setError("");
        }
      } catch (requestError) {
        console.error("Could not load your orders:", requestError);
        if (active) {
          setError(requestError.response?.data?.message || "Could not load your orders. Please try again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchOrders();
    return () => {
      active = false;
    };
  }, [reloadCount]);

  const retryLoadingOrders = () => {
    setLoading(true);
    setError("");
    setReloadCount((current) => current + 1);
  };

  return (
    <>
      <PageHeader title="My Orders" />
      <main className="min-h-[60vh] bg-[#fcfaf7] py-8 sm:py-12">
        <PageContainer>
          <Link to="/shop" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#725d4b] transition hover:text-[#a34720]">
            <ArrowLeft size={17} /> Continue shopping
          </Link>
          <p className="mb-7 text-sm text-[#8b735e]">Review your order status, items, and delivery details.</p>

          {loading ? (
            <div className="rounded-2xl border border-[#e5d8ca] bg-white p-8 text-center text-sm text-[#8b735e]">
              Loading your orders...
            </div>
          ) : error ? (
            <section role="alert" className="rounded-2xl border border-red-200 bg-white p-8 text-center">
              <p className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={retryLoadingOrders}
                className="mt-5 rounded-lg bg-[#351d0e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a34720]"
              >
                Try again
              </button>
            </section>
          ) : orders.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-[#d9c4aa] bg-white px-5 py-14 text-center">
              <ShoppingBag className="mx-auto text-[#a34720]" size={38} />
              <h2 className="mt-4 text-xl font-semibold text-[#351d0e]">No orders yet</h2>
              <p className="mt-2 text-sm text-[#8b735e]">Your furniture orders will appear here after checkout.</p>
              <Link to="/shop" className="mt-6 inline-flex rounded-lg bg-[#351d0e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#a34720]">
                Browse furniture
              </Link>
            </section>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const address = order.shipping_address || order;
                return (
                  <article key={order.order_id || order.id} className="overflow-hidden rounded-2xl border border-[#e5d8ca] bg-white shadow-sm">
                    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee4d8] bg-gradient-to-r from-[#f7efe5] to-white px-4 py-4 sm:px-6">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#8b735e]">Order number</p>
                        <h2 className="mt-1 text-base font-bold text-[#351d0e]">{order.order_id || `ORD${String(order.id).padStart(4, "0")}`}</h2>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(order.status)}`}>
                        {order.status || "Order Placed"}
                      </span>
                    </header>

                    <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.8fr)]">
                      <section>
                        <h3 className="flex items-center gap-2 text-sm font-bold text-[#351d0e]">
                          <PackageCheck size={17} className="text-[#a34720]" /> Items
                        </h3>
                        <ul className="mt-3 divide-y divide-[#f0e8df]">
                          {(order.items || []).map((item, index) => (
                            <li key={item.id || `${item.product_id || item.product_name}-${index}`} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#351d0e]">{item.product_name || item.name || "Furniture item"}</p>
                                <p className="mt-1 text-xs text-[#8b735e]">
                                  Qty {item.quantity}
                                  {item.variant_color ? ` · ${item.variant_color}` : ""}
                                  {item.variant_size ? ` · ${item.variant_size}` : ""}
                                </p>
                              </div>
                              <span className="shrink-0 text-sm font-semibold text-[#351d0e]">
                                {formatAmount(item.total ?? Number(item.price || 0) * Number(item.quantity || 0))}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>

                      <section className="space-y-3 rounded-xl bg-[#fcfaf7] p-4">
                        <p className="flex items-start gap-2 text-sm text-[#725d4b]">
                          <CalendarDays size={16} className="mt-0.5 shrink-0 text-[#a34720]" />
                          <span><span className="font-semibold text-[#351d0e]">Placed</span> · {formatDate(order.created_at)}</span>
                        </p>
                        <p className="flex items-start gap-2 text-sm text-[#725d4b]">
                          <CreditCard size={16} className="mt-0.5 shrink-0 text-[#a34720]" />
                          <span><span className="font-semibold text-[#351d0e]">Payment</span> · {order.payment_method || "Not specified"}{order.payment_status ? ` · ${order.payment_status}` : ""}</span>
                        </p>
                        <p className="flex items-start gap-2 text-sm text-[#725d4b]">
                          <MapPin size={16} className="mt-0.5 shrink-0 text-[#a34720]" />
                          <span className="min-w-0">
                            <span className="font-semibold text-[#351d0e]">Delivery</span>
                            <span className="mt-1 block break-words">
                              {[address.street_address || address.address, address.city, address.district, address.state, address.zip_code]
                                .filter(Boolean)
                                .join(", ") || "Address unavailable"}
                            </span>
                          </span>
                        </p>
                        <div className="flex items-center justify-between border-t border-[#e5d8ca] pt-3 font-bold text-[#351d0e]">
                          <span>Total</span><span>{formatAmount(order.total_amount)}</span>
                        </div>
                      </section>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </PageContainer>
      </main>
    </>
  );
}

export default MyOrders;
