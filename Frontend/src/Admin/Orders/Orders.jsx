import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../api";
import { Link } from "react-router-dom";
import { useAdmin } from "../../PrivateRouter/AdminContext";
import {
  FiSearch,
  FiFilter,
  FiEye,
  FiTruck,
  FiCheckCircle,
  FiShoppingBag,
  FiPackage,
  FiXCircle,
  FiClock,
  FiCalendar,
  FiMoreVertical,
  FiGrid,
  FiList,
  FiPrinter,
} from "react-icons/fi";
import { toast, Toaster } from "react-hot-toast";

const formatOrderId = (order) => order.order_id || `ORD${String(order.id).padStart(4, "0")}`;
const isOnLocalDate = (timestamp, date) => {
  const orderDate = new Date(timestamp);
  return !Number.isNaN(orderDate.getTime()) &&
    orderDate.getFullYear() === date.getFullYear() &&
    orderDate.getMonth() === date.getMonth() &&
    orderDate.getDate() === date.getDate();
};

const Orders = ({ statusFilter = "All" }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { ordersCache, setOrdersCache } = useAdmin();
  const [orders, setOrders] = useState(ordersCache[statusFilter] || []);
  const [loading, setLoading] = useState(!ordersCache[statusFilter]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({
    orderId: null,
    status: "",
    tracking: "",
    courier: "",
    reason: ""
  });

  const [activeStatus, setActiveStatus] = useState(statusFilter);
  const [viewMode, setViewMode] = useState("table");
  const isNewOrdersPage = statusFilter === "Order Placed";
  const isDeliveredOrdersPage = statusFilter === "Delivered";
  const isFixedStatusPage = isNewOrdersPage || isDeliveredOrdersPage;
  const today = new Date();
  const ordersForDisplay = isNewOrdersPage
    ? orders.filter((order) => order.status === "Order Placed" && isOnLocalDate(order.created_at, today))
    : isDeliveredOrdersPage
      ? orders.filter((order) => order.status === "Delivered")
      : orders;

  useEffect(() => {
    setActiveStatus(statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [activeStatus]);

  const fetchOrders = async () => {
    if (!ordersCache[activeStatus]) setLoading(true);
    try {
      const res = await api.get(`/orders?status=${activeStatus}`);
      const data = res.data || [];
      setOrders(data);
      setOrdersCache((prev) => ({ ...prev, [activeStatus]: data }));
    } catch (error) {
      console.error("Fetch Orders Error:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStatusUpdate = async (orderId, newStatus) => {
    if (newStatus === "Shipping" || newStatus === "Cancelled") {
      setModalData({
        orderId,
        status: newStatus,
        tracking: "",
        courier: "",
        reason: ""
      });
      setShowModal(true);
      return;
    }

    performStatusUpdate(orderId, { status: newStatus });
  };

  const performStatusUpdate = async (orderId, updateData) => {
    setLoading(true);
    try {
      await api.put(`/orders/${orderId}/status`, updateData);
      toast.success(`Pipeline synchronized to: ${updateData.status}`);
      fetchOrders();
    } catch (error) {
      console.error("Status Sync Error:", error);
      toast.error("Failed to sync pipeline status");
    } finally {
      setLoading(false);
    }
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    const updateData = { status: modalData.status };

    if (modalData.status === "Shipping") {
      if (!modalData.tracking || !modalData.courier) {
        return toast.error("Logistics data incomplete");
      }
      updateData.tracking_number = modalData.tracking;
      updateData.courier_name = modalData.courier;
      updateData.shipped_at = new Date().toISOString();
    } else if (modalData.status === "Cancelled") {
      if (!modalData.reason) {
        return toast.error("Cancellation rationale required");
      }
      updateData.cancellation_reason = modalData.reason;
      updateData.cancelled_at = new Date().toISOString();
    }

    performStatusUpdate(modalData.orderId, updateData);
    setShowModal(false);
  };

  const filteredOrders = ordersForDisplay.filter((order) => {
    const matchesSearch =
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id?.toString().includes(searchTerm);
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);

  const handlePrintTable = () => {
    const printWindow = window.open("", "", "width=1000,height=700");
    if (!printWindow) return;

    const rows = filteredOrders.map((order, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${formatOrderId(order)}</td>
        <td>${order.customer_name || "Guest Customer"}</td>
        <td>₹${Number(order.total_amount || 0).toFixed(2)}</td>
        <td>${order.payment_method || "-"}</td>
        <td>${order.status || "-"}</td>
        <td>${order.created_at ? new Date(order.created_at).toLocaleDateString() : "-"}</td>
      </tr>
    `).join("");

    printWindow.document.write(`<!doctype html><html><head><title>Orders Report</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#1e293b}h1{color:#350866;margin:0 0 6px}p{color:#64748b;margin:0 0 24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #dbe1ea;padding:10px;text-align:left;font-size:12px}th{background:#350866;color:#fcd34d;text-transform:uppercase;font-size:11px}tr:nth-child(even){background:#f8fafc}</style></head><body><h1>Orders Report</h1><p>${filteredOrders.length} order${filteredOrders.length === 1 ? "" : "s"}</p><table><thead><tr><th>S No</th><th>Order ID</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Status</th><th>Order Date</th></tr></thead><tbody>${rows || `<tr><td colspan="7">${isNewOrdersPage ? "No new orders placed today" : "No orders found"}</td></tr>`}</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeStatus]);

  const getStatusBadgeClasses = (status) => {
    switch (status) {
      case "Order Placed":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Packing":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "Shipping":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "Out for Delivery":
        return "bg-cyan-100 text-cyan-700 border-cyan-200";
      case "Delivered":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Cancelled":
        return "bg-red-100 text-red-700 border-red-200";
      case "New":
        return "bg-gray-100 text-gray-500 border-gray-200";
      case "Processing":
        return "bg-indigo-50 text-indigo-400 border-indigo-100";
      case "Shipped":
        return "bg-amber-50 text-amber-500 border-amber-100";
      default:
        return "bg-gray-50 text-gray-500 border-gray-100";
    }
  };

  return (
    <div className="min-h-screen pb-10 font-sans animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Toaster position="top-right" />
      <div className="max-w-[1600px] mx-auto px-2 sm:px-6 lg:px-2 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-orange-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
            <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-primary-light to-primary-dark" />
            <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-orange-200/70 transition-transform duration-200 group-hover:scale-105">
              <FiShoppingBag size={22} />
            </div>
            <div className="relative z-10">
              <p className="text-xs text-gray-400 font-medium">Total Orders</p>
              <h3 className="text-3xl font-black text-slate-800 leading-none my-0.5">{filteredOrders.length || 0}</h3>
              <p className="text-[10px] text-gray-400">{isNewOrdersPage ? "Placed today" : "All orders placed"}</p>
            </div>
            <FiShoppingBag className="pointer-events-none absolute -right-1 bottom-1 text-orange-300/20" size={60} />
          </div>

          <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-emerald-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
            <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
            <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-200/70 transition-transform duration-200 group-hover:scale-105">
              <FiCheckCircle size={22} />
            </div>
            <div className="relative z-10">
              <p className="text-xs text-gray-400 font-medium">Confirmed Orders</p>
              <h3 className="text-3xl font-black text-slate-800 leading-none my-0.5">{ordersForDisplay.filter((o) => ["Order Placed", "Processing", "New"].includes(o.status)).length || 0}</h3>
              <p className="text-[10px] text-gray-400">Orders confirmed</p>
            </div>
            <FiCheckCircle className="pointer-events-none absolute -right-1 bottom-1 text-emerald-300/20" size={60} />
          </div>

          <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-sky-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
            <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-sky-400 to-blue-600" />
            <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-sky-200/70 transition-transform duration-200 group-hover:scale-105">
              <FiTruck size={22} />
            </div>
            <div className="relative z-10">
              <p className="text-xs text-gray-400 font-medium">Shipped Orders</p>
              <h3 className="text-3xl font-black text-slate-800 leading-none my-0.5">{ordersForDisplay.filter((o) => ["Shipping", "Out for Delivery", "Shipped", "Packing"].includes(o.status)).length || 0}</h3>
              <p className="text-[10px] text-gray-400">Orders shipped</p>
            </div>
            <FiTruck className="pointer-events-none absolute -right-1 bottom-1 text-sky-300/20" size={60} />
          </div>

          <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-amber-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-amber-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
            <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-amber-400 to-amber-600" />
            <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-200/70 transition-transform duration-200 group-hover:scale-105">
              <FiShoppingBag size={22} />
            </div>
            <div className="relative z-10">
              <p className="text-xs text-gray-400 font-medium">Delivered Orders</p>
              <h3 className="text-3xl font-black text-slate-800 leading-none my-0.5">{ordersForDisplay.filter((o) => o.status === "Delivered").length || 0}</h3>
              <p className="text-[10px] text-gray-400">Orders delivered</p>
            </div>
            <FiShoppingBag className="pointer-events-none absolute -right-1 bottom-1 text-amber-300/20" size={60} />
          </div>

          <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-red-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-red-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
            <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-red-400 to-red-600" />
            <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-400 to-red-600 text-white shadow-lg shadow-red-200/70 transition-transform duration-200 group-hover:scale-105">
              <FiXCircle size={22} />
            </div>
            <div className="relative z-10">
              <p className="text-xs text-gray-400 font-medium">Cancelled Orders</p>
              <h3 className="text-3xl font-black text-slate-800 leading-none my-0.5">{ordersForDisplay.filter((o) => o.status === "Cancelled").length || 0}</h3>
              <p className="text-[10px] text-gray-400">Orders cancelled</p>
            </div>
            <FiXCircle className="pointer-events-none absolute -right-1 bottom-1 text-red-300/20" size={60} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            <div className="relative w-full md:w-72">
              <input
                type="text"
                placeholder="Search by Order ID, Customer, Phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-[#4318FF]"
              />
              <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            {!isFixedStatusPage && (
              <div className="relative">
                <select
                  value={activeStatus}
                  onChange={(e) => setActiveStatus(e.target.value)}
                  className="w-36 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-[#4318FF] appearance-none"
                >
                  <option value="All">All Status</option>
                  <option value="Order Placed">Confirmed</option>
                  <option value="Shipping">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">▼</span>
              </div>
            )}

            <div className="relative">
              
              <select className="w-36 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-[#4318FF] appearance-none">
                <option>All Payment</option>
                <option>Online</option>
                <option>COD</option>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">▼</span>
            </div>

           
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrintTable}
              className="rounded-lg border border-gray-200 bg-white p-2 text-[#4318FF] shadow-sm transition-colors hover:bg-[#4318FF] hover:text-white"
              aria-label="Print orders table"
              title="Print orders table"
            >
              <FiPrinter size={16} />
            </button>
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-md transition-colors ${viewMode === "table" ? "bg-white text-[#4318FF] shadow-sm" : "text-gray-500 hover:text-[#4318FF]"}`}
                aria-label="Table mode"
                title="Table mode"
              >
                <FiList size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={`p-2 rounded-md transition-colors ${viewMode === "card" ? "bg-white text-[#4318FF] shadow-sm" : "text-gray-500 hover:text-[#4318FF]"}`}
                aria-label="Card mode"
                title="Card mode"
              >
                <FiGrid size={16} />
              </button>
            </div>
           
         
          </div>
        </div>

        {viewMode === "table" ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gradient-to-r from-secondary-dark to-secondary-light border-b border-secondary-dark">
                  <th scope="col" className="w-12 px-4 py-4">
                    <input type="checkbox" aria-label="Select all orders" className="rounded border-gray-300 text-[#4318FF] focus:ring-[#4318FF]" />
                  </th>
                  <th scope="col" className="w-28 px-4 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Order ID</th>
                  <th scope="col" className="min-w-[220px] px-4 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Customer</th>
                  <th scope="col" className="w-32 px-4 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Amount</th>
                  <th scope="col" className="w-28 px-4 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Payment</th>
                  <th scope="col" className="w-40 px-4 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Status</th>
                  <th scope="col" className="w-36 px-4 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Order Date</th>
                  <th scope="col" className="w-24 px-4 py-4 text-center text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-10 text-center text-gray-400 text-sm font-semibold">Loading orders...</td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-10 text-center text-gray-400 text-sm font-semibold">{isNewOrdersPage ? "No new orders placed today." : "No orders found."}</td>
                  </tr>
                ) : (
                  currentItems.map((order, idx) => {
                    const paymentMethod = order.payment_method || (idx % 2 === 0 ? "Online" : "COD");
                    const paymentStatus = paymentMethod === "Online" ? "Paid" : "Pending";
                    const customerName = order.customer_name || "Guest Customer";
                    const customerPhone = order.customer_phone || "+91 98765 43210";

                    return (
                      <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                        <td className="w-12 px-4 py-4">
                          <input type="checkbox" className="rounded border-gray-300 text-[#4318FF] focus:ring-[#4318FF]" />
                        </td>
                        <td className="w-28 px-4 py-4 text-[13px] font-black text-[#4318FF]">{formatOrderId(order)}</td>
                        <td className="min-w-[220px] px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold shrink-0">
                              {customerName.charAt(0)}
                            </div>
                            <div>
                              <div className="text-[13px] font-bold text-[#2B3674]">{customerName}</div>
                              <div className="text-[11px] text-gray-400 font-medium mt-0.5">{customerPhone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="w-32 px-4 py-4">
                          <div className="text-[13px] font-black text-[#2B3674]">₹{parseFloat(order.total_amount || 0).toLocaleString()}</div>
                          <div className="text-[11px] text-gray-400 font-medium mt-0.5">1 Item</div>
                        </td>
                        <td className="w-28 px-4 py-4">
                          <div className="flex flex-col items-start gap-1">
                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${paymentMethod === "Online" ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#f4f1ff] text-[#4318FF]"}`}>
                              {paymentMethod}
                            </span>
                            <span className="text-[10px] text-gray-500 font-medium">{paymentStatus}</span>
                          </div>
                        </td>
                        <td className="w-40 px-4 py-4">
                          <div className="flex flex-col items-start gap-1 relative group/status">
                            <select
                              value={order.status}
                              onChange={(e) => handleQuickStatusUpdate(order.id, e.target.value)}
                              className={`appearance-none cursor-pointer flex items-center gap-2 px-2.5 py-1 rounded text-[10px] font-bold border outline-none transition-all ${getStatusBadgeClasses(order.status)}`}
                            >
                              {(() => {
                                const flow = ["Order Placed", "Packing", "Shipping", "Out for Delivery", "Delivered"];
                                const currentIndex = flow.indexOf(order.status);
                                const options = currentIndex === -1 ? [...flow, "Cancelled", order.status] : [...flow.slice(currentIndex), ...(currentIndex < 2 ? ["Cancelled"] : [])];
                                return Array.from(new Set(options)).map((status) => (
                                  <option key={status} value={status}>{status}</option>
                                ));
                              })()}
                            </select>
                            <div className="text-[9px] text-gray-400 font-medium mt-1">
                              {order.status === "Delivered" ? "Delivered on" : order.status === "Shipped" || order.status === "Out for Delivery" ? "Shipped on" : order.status === "Cancelled" ? "Cancelled on" : "Updated on"}
                              <br />
                              {order.updated_at ? new Date(order.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Unknown"}
                            </div>
                          </div>
                        </td>
                        <td className="w-36 px-4 py-4">
                          <div className="text-[12px] font-bold text-[#2B3674]">{order.created_at ? new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Unknown"}</div>
                          <div className="text-[11px] text-gray-500 font-medium">{order.created_at ? new Date(order.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}</div>
                        </td>
                        <td className="w-24 px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Link to={`/admin/orders/${order.id}`} className="p-1.5 border border-gray-200 rounded hover:bg-gray-100 text-[#4318FF] transition-colors shadow-sm">
                              <FiEye size={14} />
                            </Link>
                           
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <p className="text-[13px] font-bold text-[#2B3674]">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredOrders.length)} of {filteredOrders.length} orders
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] font-bold text-[#2B3674] shadow-sm cursor-pointer hover:bg-gray-50">
                10 per page <span className="text-gray-400 text-[10px] ml-1">▼</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 shadow-sm font-bold text-[13px]">
                  &lt;
                </button>
                {[...Array(Math.min(totalPages || 1, 3))].map((_, i) => (
                  <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-bold shadow-sm ${currentPage === i + 1 ? 'bg-[#4318FF] text-white border border-[#4318FF]' : 'border border-gray-200 text-[#2B3674] hover:bg-gray-50'}`}>
                    {i + 1}
                  </button>
                ))}
                {totalPages > 3 && <span className="w-8 h-8 flex items-center justify-center text-gray-400">...</span>}
                {totalPages > 3 && (
                  <button onClick={() => setCurrentPage(totalPages)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-bold border border-gray-200 text-[#2B3674] hover:bg-gray-50 shadow-sm">
                    {totalPages}
                  </button>
                )}
                <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 shadow-sm font-bold text-[13px]">
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full bg-white rounded-xl border border-gray-100 px-6 py-10 text-center text-gray-400 text-sm font-semibold">
                Loading orders...
              </div>
            ) : currentItems.length === 0 ? (
              <div className="col-span-full bg-white rounded-xl border border-gray-100 px-6 py-10 text-center text-gray-400 text-sm font-semibold">
                {isNewOrdersPage ? "No new orders placed today." : "No orders found."}
              </div>
            ) : (
              currentItems.map((order, idx) => {
                const customerName = order.customer_name || "Guest Customer";
                const paymentMethod = order.payment_method || (idx % 2 === 0 ? "Online" : "COD");
                const paymentStatus = paymentMethod === "Online" ? "Paid" : "Pending";

                return (
                  <article key={order.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
                      <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Order ID</p>
                        <h3 className="text-sm font-black text-[#4318FF] mt-1">{formatOrderId(order)}</h3>
                      </div>
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold border ${getStatusBadgeClasses(order.status)}`}>
                        {order.status || "Pending"}
                      </span>
                    </div>

                    <div className="py-4 space-y-3">
                      <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Customer</p>
                        <p className="text-sm font-bold text-[#2B3674] mt-1">{customerName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{order.customer_phone || "+91 98765 43210"}</p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Amount</p>
                          <p className="text-base font-black text-[#2B3674] mt-1">₹{parseFloat(order.total_amount || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Payment</p>
                          <p className="text-xs font-bold text-[#2B3674] mt-1">{paymentMethod} · {paymentStatus}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Order Date</p>
                        <p className="text-xs font-semibold text-gray-600 mt-1">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Unknown"}
                        </p>
                      </div>
                    </div>

                    <Link to={`/admin/orders/${order.id}`} className="w-full inline-flex items-center justify-center gap-2 border border-[#4318FF] text-[#4318FF] rounded-lg py-2 text-xs font-bold hover:bg-[#4318FF] hover:text-white transition-colors">
                      <FiEye size={14} /> View order
                    </Link>
                  </article>
                );
              })
            )}
          </div>
        )}

        {showModal && (
          createPortal(
          <div className="fixed inset-0 z-[100] flex h-screen w-screen items-center justify-center bg-transparent p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[3px] animate-in fade-in duration-300" onClick={() => setShowModal(false)} />
            <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className={`p-8 ${modalData.status === "Cancelled" ? "bg-red-600" : "bg-slate-900"} text-white`}>
                <h3 className="text-xl font-black tracking-tight">{modalData.status} Pipeline Meta</h3>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1 italic">Order Ref: #ORD-0{modalData.orderId}</p>
              </div>

              <form onSubmit={handleModalSubmit} className="p-8 space-y-6">
                {modalData.status === "Shipping" ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Docket Number / AWB</label>
                      <input
                        required
                        type="text"
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500/20 transition-all outline-none font-bold"
                        placeholder="Enter Tracking ID..."
                        value={modalData.tracking}
                        onChange={(e) => setModalData((p) => ({ ...p, tracking: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Courier Intelligence Unit</label>
                      <input
                        required
                        type="text"
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500/20 transition-all outline-none font-bold"
                        placeholder="e.g. BlueDart, Delhivery..."
                        value={modalData.courier}
                        onChange={(e) => setModalData((p) => ({ ...p, courier: e.target.value }))}
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Cancellation Rationale</label>
                    <textarea
                      required
                      rows="4"
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-500/20 transition-all outline-none font-bold resize-none"
                      placeholder="Reason for order termination..."
                      value={modalData.reason}
                      onChange={(e) => setModalData((p) => ({ ...p, reason: e.target.value }))}
                    />
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-gray-100 text-gray-400 hover:bg-gray-50 transition-all">
                    Abort
                  </button>
                  <button type="submit" className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-white shadow-lg transition-all active:scale-95 ${modalData.status === "Cancelled" ? "bg-red-600 shadow-red-500/20 hover:bg-red-500" : "bg-[#4318FF] shadow-blue-500/20 hover:bg-blue-800"}`}>
                    Sync Pipeline
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
          )
        )}
      </div>
    </div>
  );
};

export default Orders;
