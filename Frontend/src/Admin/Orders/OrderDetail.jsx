import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import {
    FiArrowLeft,
    FiPackage,
    FiTruck,
    FiCheckCircle,
    FiClock,
    FiUser,
    FiMail,
    FiPhone,
    FiMapPin,
    FiPrinter,
    FiDownload,
    FiMoreVertical,
    FiCreditCard,
    FiXCircle
} from "react-icons/fi";
import api from "../../api";
import { toast, Toaster } from "react-hot-toast";

const logo = "/images/logo.png";
const formatOrderId = (order) => order.order_id || `ORD${String(order.id).padStart(5, "0")}`;
const formatCurrency = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const getDiscountLabel = (order) => order.discount_type === "percentage"
    ? `Discount (${Number(order.discount_value || 0)}%)`
    : "Discount";

const OrderDetail = () => {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    // Status update states
    const [selectedStatus, setSelectedStatus] = useState("");
    const [trackingNumber, setTrackingNumber] = useState("");
    const [courierName, setCourierName] = useState("");
    const [shippedAt, setShippedAt] = useState("");
    const [cancellationReason, setCancellationReason] = useState("");
    const [cancelledAt, setCancelledAt] = useState("");

    const location = useLocation();

    useEffect(() => {
        fetchOrderDetail();
    }, [id]);

    useEffect(() => {
        if (!loading && order && location.state?.autoPrint) {
            handlePrint();
            // Clear state so it doesn't print again on refresh
            window.history.replaceState({}, document.title);
        }
    }, [loading, order, location.state]);

    const fetchOrderDetail = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/orders/${id}`);
            setOrder(res.data);
            setSelectedStatus(res.data.status);
            setTrackingNumber(res.data.tracking_number || "");
            setCourierName(res.data.courier_name || "");
            setShippedAt(res.data.shipped_at ? new Date(res.data.shipped_at).toISOString().slice(0, 16) : "");
            setCancellationReason(res.data.cancellation_reason || "");
            setCancelledAt(res.data.cancelled_at ? new Date(res.data.cancelled_at).toISOString().slice(0, 16) : "");
        } catch (error) {
            console.error("Fetch Order Detail Error:", error);
            toast.error("Failed to load order details");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        if (!order) return;

        const logoUrl = logo.startsWith('http') ? logo : window.location.origin + (logo.startsWith('/') ? logo : '/' + logo);
        const items = Array.isArray(order.items) ? order.items : [];
        const subtotal = Number(order.subtotal ?? order.total_amount ?? 0);
        const gstAmount = Number(order.gst_amount || 0);
        const discountAmount = Number(order.discount_amount || 0);
        const gstRate = Number(order.gst_rate || 0);

        const itemsHTML = items
            .map((i, index) => {
                const sizeVal = i.variant_size || "";
                const colorVal = i.variant_color || "";
                const finalImgUrl = getProductImage(i);

                return `
          <tr>
            <td style="border:1px solid #ddd;padding:10px;text-align:center;">${index + 1}</td>
            <td style="border:1px solid #ddd;padding:10px;display:flex;align-items:center;gap:10px;">
              <img src="${finalImgUrl}" alt="${i.product_name || ""}" style="width:50px;height:50px;object-fit:cover;border-radius:5px;border:1px solid #ddd;" />
              <div style="display:flex;flex-direction:column;text-align:left;">
                <span style="font-weight:bold;">${i.product_name || ""}</span>
                <small style="color:#666;margin-top:4px;font-size:10px;">${sizeVal ? 'Size: ' + sizeVal : ''} ${colorVal ? '| Color: ' + colorVal : ''}</small>
              </div>
            </td>
            <td style="border:1px solid #ddd;padding:10px;text-align:center;">${i.quantity || 1}</td>
            <td style="border:1px solid #ddd;padding:10px;text-align:center;">₹${Number(i.price || 0).toLocaleString()}</td>
            <td style="border:1px solid #ddd;padding:10px;text-align:center;">₹${Number((i.quantity || 1) * (i.price || 0)).toLocaleString()}</td>
          </tr>`;
            })
            .join("");

        const html = `
        <div id="printableArea" style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; padding: 40px; border: 1px solid #eee; max-width: 800px; margin: auto;">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #3b82f6;padding-bottom:20px;margin-bottom:30px;">
            <img src="${logoUrl}" style="height:70px;" />
            <div style="text-align:right;">
                <div style="font-size:32px;color:#3b82f6;font-weight:900;text-transform:uppercase;letter-spacing:1px;">Invoice</div>
                <div style="font-size:14px;color:#94a3b8;font-weight:bold;margin-top:4px;">${formatOrderId(order)}</div>
            </div>
          </div>
    
          <div style="display:flex;justify-content:space-between;margin-top:20px;flex-wrap:wrap;gap:30px;">
            <div style="flex:1; min-width:240px; font-size:14px;">
              <h3 style="font-size:12px;text-transform:uppercase;color:#94a3b8;letter-spacing:1.5px;margin-bottom:15px;font-weight:900;">Customer Info</h3>
              <p style="margin:5px 0;"><strong>Name:</strong> ${order.customer_name || "Guest Customer"}</p>
              <p style="margin:5px 0;"><strong>Email:</strong> ${order.customer_email || "N/A"}</p>
              <p style="margin:5px 0;"><strong>Phone:</strong> ${order.customer_phone || "N/A"}</p>
              <p style="margin:5px 0;"><strong>Address:</strong> ${order.street_address || ""}, ${order.city || ""}, ${order.state || ""}, ${order.zip_code || ""}</p>
              <p style="margin:5px 0;"><strong>Country:</strong> ${order.country || "India"}</p>
            </div>
    
            <div style="flex:1; min-width:240px; font-size:14px;">
              <h3 style="font-size:12px;text-transform:uppercase;color:#94a3b8;letter-spacing:1.5px;margin-bottom:15px;font-weight:900;">Order Info</h3>
              <p style="margin:5px 0;"><strong>Shop:</strong> Q Furnitures</p>
              <p style="font-size:12px; color:#64748b; margin-bottom:10px; line-height:1.4;">
                78/3, Chetty Street Tirupattur,<br/>
                Near AVS Mahal and Jain Temple 635601<br/>
                Ph: +91 7010575375
              </p>
              <p style="margin:5px 0;"><strong>Status:</strong> <span style="text-transform:uppercase; font-size:10px; background:#eff6ff; color:#1d4ed8; padding:2px 8px; border-radius:4px; font-weight:bold;">${order.status || "-"}</span></p>
              <p style="margin:5px 0;"><strong>Payment:</strong> ${order.payment_method || "Online"}</p>
              <p style="margin:5px 0;"><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
            </div>
          </div>
    
          <h3 style="margin-top:40px;font-size:12px;text-transform:uppercase;color:#94a3b8;letter-spacing:1.5px;font-weight:900;">Item Manifest</h3>
          <table style="width:100%;border-collapse:collapse;margin-top:15px;font-size:13px;">
            <thead>
              <tr style="background:#f8fafc; color:#64748b;">
                <th style="border:1px solid #e2e8f0;padding:12px;text-align:center;width:40px;">#</th>
                <th style="border:1px solid #e2e8f0;padding:12px;text-align:left;">Product Details</th>
                <th style="border:1px solid #e2e8f0;padding:12px;text-align:center;width:60px;">Qty</th>
                <th style="border:1px solid #e2e8f0;padding:12px;text-align:center;width:100px;">Price</th>
                <th style="border:1px solid #e2e8f0;padding:12px;text-align:center;width:100px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
    
          <div style="margin-top:30px; border-top:2px solid #f1f5f9; padding-top:20px; display:flex; justify-content:flex-end;">
            <div style="width:250px; text-align:right; font-size:14px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="color:#64748b;">Subtotal:</span>
                    <span style="font-weight:bold;">₹${subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="color:#64748b;">GST (${gstRate}% before discount):</span>
                    <span style="font-weight:bold;">₹${gstAmount.toLocaleString("en-IN")}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="color:#64748b;">${getDiscountLabel(order)}:</span>
                    <span style="font-weight:bold;">-₹${discountAmount.toLocaleString("en-IN")}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="color:#64748b;">Shipping:</span>
                    <span style="font-weight:bold;">₹0.00</span>
                </div>
                <div style="display:flex; justify-content:space-between; padding-top:10px; border-top:1px solid #f1f5f9; margin-top:10px;">
                    <span style="font-size:16px; font-weight:900; color:#1e293b;">Total Amount:</span>
                    <span style="font-size:20px; font-weight:900; color:#3b82f6;">₹${Number(order.total_amount).toLocaleString()}</span>
                </div>
            </div>
          </div>
    
          <div style="text-align:center;margin-top:60px;font-size:12px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:20px;">
            <p style="margin:0; font-weight:bold; color:#64748b;">Thank you for shopping with Q Furnitures!</p>
            <p style="margin:5px 0 0 0;">For any support, please contact us at support@qfurnitures.in</p>
          </div>
        </div>
      `;

        // Create hidden iframe
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.style.visibility = "hidden";
        document.body.appendChild(iframe);

        const doc = (iframe.contentWindow && iframe.contentWindow.document) || iframe.contentDocument;

        try {
            doc.open();
            doc.write(`<!doctype html><html><head><title>Invoice - ${formatOrderId(order)}</title><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${html}</body></html>`);
            doc.close();
        } catch (err) {
            console.error("Error writing to print iframe:", err);
            document.body.removeChild(iframe);
            window.print();
            return;
        }

        let printStarted = false;
        const triggerPrint = () => {
            if (printStarted) return;
            printStarted = true;
            try {
                const win = iframe.contentWindow || iframe;
                win.focus && win.focus();
                win.print && win.print();
            } catch (e) {
                console.error("Print error:", e);
            } finally {
                setTimeout(() => {
                    try { document.body.removeChild(iframe); } catch { }
                }, 1000);
            }
        };

        const imgs = doc.getElementsByTagName("img") || [];
        if (imgs.length === 0) {
            setTimeout(triggerPrint, 500);
        } else {
            let loaded = 0;
            const checkDone = () => {
                loaded++;
                if (loaded >= imgs.length) triggerPrint();
            };
            for (let i = 0; i < imgs.length; i++) {
                const img = imgs[i];
                if (img.complete) checkDone();
                else {
                    img.addEventListener("load", checkDone);
                    img.addEventListener("error", checkDone);
                }
            }
            setTimeout(triggerPrint, 4000);
        }
    };

    const getProductImage = (item) => {
        let imgUrl = null;
        try {
            // Helper to clean and prefix URL
            const processUrl = (url) => {
                if (!url || typeof url !== 'string') return null;
                if (url.startsWith('http') || url.startsWith('data:')) return url;
                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
                // Convert Windows backslashes to forward slashes
                const cleanPath = url.replace(/\\/g, '/');
                const finalPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
                return `${backendUrl}${finalPath}`;
            };

            // 1. Check direct image from order item
            if (item.image && typeof item.image === 'string' && !item.image.startsWith('[')) {
                imgUrl = item.image;
            } 
            // 2. Check if image is a JSON string
            else if (item.image && typeof item.image === 'string' && item.image.startsWith('[')) {
                try {
                    const parsed = JSON.parse(item.image);
                    if (Array.isArray(parsed) && parsed.length > 0) imgUrl = parsed[0];
                } catch (e) {}
            }

            // 3. Fallback to variants from product join
            if (!imgUrl && item.variants && Array.isArray(item.variants) && item.variants.length > 0) {
                const firstVariant = item.variants[0];
                if (firstVariant.images) {
                    const vImgs = typeof firstVariant.images === 'string' ? JSON.parse(firstVariant.images) : firstVariant.images;
                    if (Array.isArray(vImgs) && vImgs.length > 0) imgUrl = vImgs[0];
                }
            }

            // 4. Final attempt: item might have "images" directly
            if (!imgUrl && item.images) {
                const imgs = typeof item.images === 'string' ? JSON.parse(item.images) : item.images;
                if (Array.isArray(imgs) && imgs.length > 0) imgUrl = imgs[0];
            }

            const finalUrl = processUrl(imgUrl);
            if (finalUrl) return finalUrl;

        } catch (error) {
            console.error("Error getting product image:", error);
        }

        // Final Fallback: UI Avatars
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(item.product_name || 'Product')}&background=random`;
    };


    const handleStatusUpdate = async () => {
        if (!selectedStatus) return toast.error("Please select a status");

        setUpdating(true);
        try {
            const updateData = { status: selectedStatus };

            if (selectedStatus === 'Shipping') {
                if (!trackingNumber || !courierName) {
                    toast.error("Docket Number and Courier Name are required for Shipping");
                    setUpdating(false);
                    return;
                }
                updateData.tracking_number = trackingNumber;
                updateData.courier_name = courierName;
                if (shippedAt) updateData.shipped_at = shippedAt;
            }

            if (selectedStatus === 'Cancelled') {
                if (!cancellationReason) {
                    toast.error("Cancellation reason is required");
                    setUpdating(false);
                    return;
                }
                updateData.cancellation_reason = cancellationReason;
                if (cancelledAt) updateData.cancelled_at = cancelledAt;
            }

            await api.put(`/orders/${id}/status`, updateData);
            toast.success(`Order updated to ${selectedStatus}`);
            fetchOrderDetail();
        } catch (error) {
            toast.error("Status update failed");
        } finally {
            setUpdating(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case "Order Placed": return "bg-blue-100 text-blue-700";
            case "Packing": return "bg-indigo-100 text-indigo-700";
            case "Shipping": return "bg-amber-100 text-amber-700";
            case "Out for Delivery": return "bg-cyan-100 text-cyan-700";
            case "Delivered": return "bg-emerald-100 text-emerald-700";
            case "Cancelled": return "bg-red-100 text-red-700";
            case "New": return "bg-gray-100 text-gray-700 border border-gray-200";
            case "Processing": return "bg-indigo-50 text-indigo-500 border border-indigo-100";
            case "Shipped": return "bg-amber-50 text-amber-500 border border-amber-100";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Retrieving Order Artifacts...</p>
        </div>
    );

    if (!order) return <div className="p-20 text-center font-bold text-gray-400">Order not found</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Toaster position="top-right" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
                <div className="flex items-center gap-4">
                    <Link to="/admin/orders/all" className="p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-primary transition-all shadow-sm">
                        <FiArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Order {formatOrderId(order)}</h1>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusStyle(order.status)}`}>
                                {order.status}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium mt-1 uppercase tracking-widest text-[10px] italic">Placed on {new Date(order.created_at).toLocaleString()}</p>
                    </div>
                </div>

                {/* Logistics Badges */}
                <div className="flex flex-wrap gap-2">
                    {order.status === 'Shipping' && order.tracking_number && (
                        <div className="px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl flex flex-col items-end">
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{order.courier_name || 'Shipping'}</span>
                            <span className="text-xs font-bold text-amber-500 italic">{order.tracking_number}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={handlePrint} className="p-3 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-primary transition-all shadow-sm">
                        <FiPrinter />
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-light text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95">
                        <FiDownload size={14} /> Export Invoice
                    </button>
                </div>
            </div>

            {/* Print Only Header (Hidden in Browser) */}
            <div className="hidden print:block border-b-4 border-slate-900 pb-8 mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 uppercase">Store Invoice</h1>
                        <p className="text-sm font-bold text-gray-500 mt-2 italic">Official Manifest Record</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-black text-slate-800">{formatOrderId(order)}</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Date: {new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print-container print:block">
                <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                    {/* Items */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Manifest Items</h3>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-lg">{order.items?.length || 0} Products</span>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {order.items?.map((item) => (
                                <div key={item.id} className="p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 group hover:bg-blue-50/20 transition-all">
                                    <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden border border-gray-200 shrink-0 shadow-sm animate-in zoom-in-90 duration-300">
                                        <img
                                            src={getProductImage(item)}
                                            alt={item.product_name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            onError={(e) => {
                                                if (!e.target.src.includes('ui-avatars')) {
                                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.product_name)}&background=random`;
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-black text-slate-800 text-md tracking-tight">{item.product_name}</h4>

                                        <p className="text-xs font-bold text-gray-400 mt-2 italic uppercase tracking-wider">Unit Price: ₹{parseFloat(item.price).toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        {item.variant_color && (
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                <div className="w-2 h-2 rounded-full border border-gray-200" style={{ backgroundColor: item.variant_color.startsWith('#') ? item.variant_color : 'transparent' }}></div>
                                                {item.variant_color}
                                            </span>
                                        )}
                                        {item.variant_size && (
                                            <span className="px-2.5 py-1 bg-primary/5 border border-primary/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-primary">
                                                Size: {item.variant_size}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Quantity: {item.quantity}</p>
                                        <p className="font-black text-primary text-xl tracking-tight">₹{(item.price * item.quantity).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-gray-50 border-t border-gray-100 p-6 text-gray-900">
                            <div className="w-full max-w-xs ml-auto space-y-4 text-gray-900">

                                <div className="flex justify-between text-md font-bold  opacity-40">
                                    <span>Subtotal</span>
                                    <span>₹{formatCurrency(order.subtotal ?? order.total_amount)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold text-slate-500">
                                    <span>GST ({formatCurrency(order.gst_rate)}% before discount)</span>
                                    <span>+₹{formatCurrency(order.gst_amount)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold text-slate-500">
                                    <span>{getDiscountLabel(order)}</span>
                                    <span>-₹{formatCurrency(order.discount_amount)}</span>
                                </div>

                                <div className="pt-2 border-t border-white/10 flex justify-between items-end">
                                    <span className=" font-bold  opacity-40">
                                        Total Settlement
                                    </span>

                                    <span className="text-xl font-bold italic">
                                        ₹{formatCurrency(order.total_amount)}
                                    </span>
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* Payment */}
                    {/* <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-8 items-center group">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center text-3xl shrink-0 group-hover:scale-110 transition-transform">
                            <FiCreditCard />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Payment Channel</h3>
                            <p className="text-sm text-gray-400 font-bold mt-1">Processed via <span className="text-blue-600 font-black uppercase tracking-widest">{order.payment_method}</span> System</p>
                            {order.payment_id && (
                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-2">Ref ID: <span className="text-slate-600">{order.payment_id}</span></p>
                            )}
                        </div>
                        <div className={`px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.2em] border ${order.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                            {order.payment_status || 'Verified Payment'}
                        </div>
                    </div> */}

                    {/* Logistics Detail Card */}
                    {/* {(order.tracking_number || order.cancellation_reason) && (
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4 animate-in fade-in duration-500">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">
                                {order.status === 'Cancelled' ? 'Incidence Report' : 'Logistics Intelligence'}
                            </h3>
                            {order.tracking_number && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-2xl">
                                        <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1">Carrier Entity</p>
                                        <p className="text-sm font-black text-slate-800 uppercase">{order.courier_name || 'N/A'}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-2xl">
                                        <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1">Docket Ref</p>
                                        <p className="text-sm font-black text-blue-600 tracking-wider">{order.tracking_number}</p>
                                    </div>
                                    {order.shipped_at && (
                                        <div className="col-span-2 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/30 flex justify-between items-center">
                                            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">System Shipped At</p>
                                            <p className="text-xs font-black text-blue-600 italic">{new Date(order.shipped_at).toLocaleString()}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            {order.cancellation_reason && (
                                <div className="space-y-4">
                                    <div className="p-6 bg-red-50 rounded-2xl border border-red-100">
                                        <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-2">Primary Reason for Void</p>
                                        <p className="text-sm font-bold text-red-700 italic leading-relaxed">"{order.cancellation_reason}"</p>
                                    </div>
                                    {order.cancelled_at && (
                                        <div className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center">
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Termination Timestamp</p>
                                            <p className="text-xs font-black text-slate-600 italic">{new Date(order.cancelled_at).toLocaleString()}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )} */}
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                    {/* Customer */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px] italic">Manifest Destination</h3>
                        </div>
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-24 h-24 rounded-3xl bg-slate-900 border-4 border-white shadow-2xl flex items-center justify-center text-white text-3xl font-black">
                                {order.customer_name?.charAt(0)}
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-slate-800 tracking-tight">{order.customer_name}</h4>
                                <div className="flex flex-col items-center gap-1 mt-2 justify-center">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{order.user_id ? 'Registered' : 'Guest'} Customer</p>
                                    </div>
                                    {order.user_id && (
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">ID: {order.user_id}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6 pt-8 border-t border-gray-50">
                            <div className="flex items-center gap-4 group">
                                <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"><FiPhone size={18} /></div>
                                <div>
                                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">Contact Link</p>
                                    <p className="text-sm font-black text-slate-600">{order.customer_phone}</p>
                                </div>
                            </div>
                            {order.customer_email && (
                                <div className="flex items-center gap-4 group">
                                    <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"><FiMail size={18} /></div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">Email Feed</p>
                                        <p className="text-sm font-black text-slate-600 truncate">{order.customer_email}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-start gap-4 group">
                                <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"><FiMapPin size={18} /></div>
                                <div>
                                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">Shipping Vault</p>
                                    <div className="text-sm font-black text-slate-600 leading-relaxed italic">
                                        {order.street_address && <p>{order.street_address}</p>}
                                        {(order.city || order.district) && (
                                            <p>{[order.city, order.district].filter(Boolean).join(', ')}</p>
                                        )}
                                        {(order.state || order.zip_code) && (
                                            <p>{[order.state, order.zip_code].filter(Boolean).join(' - ')}</p>
                                        )}
                                        {order.country && <p>{order.country}</p>}
                                        {!order.street_address && order.address && <p>{order.address}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status Update Control */}
                    {/* <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl space-y-6 no-print">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black uppercase tracking-widest text-[10px] opacity-40">Pipeline Control</h3>
                            {order.status !== selectedStatus && (
                                <span className="text-[9px] font-black bg-blue-600 px-2 py-0.5 rounded-full animate-pulse">Pending Sync</span>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Update Order Progress</label>
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-black uppercase tracking-widest text-xs outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                                >
                                    {(() => {
                                        const flow = ["Order Placed", "Packing", "Shipping", "Out for Delivery", "Delivered"];
                                        const currentIndex = flow.indexOf(order.status);
                                        const options = currentIndex === -1 
                                            ? [...flow, "Cancelled", order.status] 
                                            : [...flow.slice(currentIndex), ...(currentIndex < 2 ? ["Cancelled"] : [])];
                                        
                                        // Since selectedStatus could be one of the future statuses the user is switching to,
                                        // we should also make sure it's included just in case
                                        const finalOptions = Array.from(new Set([...options, selectedStatus])).filter(Boolean);

                                        return finalOptions.map(status => (
                                            <option key={status} value={status} className="bg-slate-900">{status}</option>
                                        ));
                                    })()}
                                </select>
            </div>


            {selectedStatus === 'Shipping' && (
                <div className="space-y-4 pt-2 animate-in slide-in-from-top-4 duration-300">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-blue-400 ml-1">Docket Number / Tracking ID</label>
                        <input
                            type="text"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            placeholder="Enter AWB or Docket Number"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 font-bold text-sm outline-none focus:border-blue-500/50 transition-all text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-blue-400 ml-1">Courier Service Name</label>
                        <input
                            type="text"
                            value={courierName}
                            onChange={(e) => setCourierName(e.target.value)}
                            placeholder="e.g. BlueDart, DTDC, Delhivery"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 font-bold text-sm outline-none focus:border-blue-500/50 transition-all text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-blue-400 ml-1">Shipment Time</label>
                        <input
                            type="datetime-local"
                            value={shippedAt || new Date().toISOString().slice(0, 16)}
                            onChange={(e) => setShippedAt(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 font-bold text-sm outline-none focus:border-blue-500/50 transition-all text-white"
                        />
                    </div>
                </div>
            )}


            {selectedStatus === 'Cancelled' && (
                <div className="space-y-4 pt-2 animate-in slide-in-from-top-4 duration-300">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-red-400 ml-1">Cancellation Reason</label>
                        <textarea
                            value={cancellationReason}
                            onChange={(e) => setCancellationReason(e.target.value)}
                            placeholder="Reason for cancellation..."
                            rows="3"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 font-bold text-sm outline-none focus:border-red-500/50 transition-all resize-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-red-400 ml-1">Cancellation Time</label>
                        <input
                            type="datetime-local"
                            value={cancelledAt || new Date().toISOString().slice(0, 16)}
                            onChange={(e) => setCancelledAt(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 font-bold text-sm outline-none focus:border-red-500/50 transition-all text-white"
                        />
                    </div>
                </div>
            )}

            <button
                onClick={handleStatusUpdate}
                disabled={updating || order.status === selectedStatus && !(['Shipping', 'Cancelled'].includes(selectedStatus) && (trackingNumber !== order.tracking_number || courierName !== order.courier_name || cancellationReason !== order.cancellation_reason))}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 shadow-xl ${updating ? 'bg-white/10 text-white/30 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'}`}
            >
                {updating ? (
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-t-white rounded-full animate-spin"></div>
                        <span>Syncing...</span>
                    </div>
                ) : 'Execute Status Update'}
            </button>
        </div>
                    </div > */}
                </div >
            </div >
        </div >
    );
};

export default OrderDetail;
