import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import api from "../api";
import {
  Menu,
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  ChevronDown,
  ShoppingBag,
  Package,
  X,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";

import { useAuth } from "../PrivateRouter/AuthContext";
import { resolveMediaUrl } from "../utils/media";

const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");

const getHeaderProductImage = (product) => {
  const getFirstImage = (value) => {
    if (!value) return "";
    if (Array.isArray(value)) return value[0] || "";
    if (typeof value !== "string") return "";

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed[0] || "" : parsed || "";
    } catch {
      return value;
    }
  };

  let variants = product.variants;
  if (typeof variants === "string") {
    try {
      variants = JSON.parse(variants);
    } catch {
      variants = [];
    }
  }
  const image = getFirstImage(variants?.[0]?.images) || getFirstImage(product.images);
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name || "Product")}&background=EDE9FE&color=7C3AED`;

  if (!image || /^(https?:|data:|blob:)/i.test(image)) return image || fallback;
  return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
};

const pageTitles = {
  "/admin": "Dashboard",
  "/admin/products/all": "All Products",
  "/admin/products/add": "Add Product",
  "/admin/products/edit": "Edit Product",
  "/admin/products/category": "Categories",
  "/admin/products/stock": "Stock Details",
  "/admin/products/stock/add": "Add Stock",
  "/admin/products": "Inventory",
  "/admin/orders/billing": "Billing",
  "/admin/orders/shop-create": "Create Billing",
  "/admin/orders/new": "New Orders",
  "/admin/orders/all": "All Orders",
  "/admin/orders/delivery": "Delivery Orders",
  "/admin/orders/cancelled": "Cancelled Orders",
  "/admin/orders": "Orders",
  "/admin/users/all": "Customers",
  "/admin/users/new": "New Users",
  
  "/admin/banners": "Banners",
  "/admin/videos": "Reals Videos",
  "/admin/dealers": "Dealers",
  "/admin/dealers/add": "Add Dealer",
  "/admin/invoices/add": "Add Invoice",
  "/admin/reviews": "Reviews",
  "/admin/reports": "Reports",
  "/admin/settings": "Settings",
  "/admin/profile": "Profile",
  "/admin/settings/profile": "Profile",
};

const Header = ({ onMenuClick }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [notifications, setNotifications] = useState({ today: [], earlier: [] });
  const [unreadCount, setUnreadCount] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [allOrders, setAllOrders] = useState([]);
  const searchWrapperRef = useRef(null);

  // Low stock state
  const [lowStockItems, setLowStockItems] = useState([]);
  const [showLowStock, setShowLowStock] = useState(false);
  const lowStockRef = useRef(null);

  const searchInputRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // ✅ CORRECT AUTH VALUES
  const { user, profileName, role, email, logout } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 350); // wait for animation
    }
  }, [showSearch]);

  const getPageTitle = () => {
    if (pageTitles[location.pathname]) return pageTitles[location.pathname];
    for (const [path, title] of Object.entries(pageTitles)) {
      if (location.pathname.startsWith(path + "/")) return title;
    }
    return "Dashboard";
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get("/orders");
      const data = response.data || [];

      // Filter for all pending/new orders
      const pendingOrders = Array.isArray(data)
        ? data.filter(o => o.status?.trim() === "Order Placed")
        : [];

      // Get today's date parts in local time (handles M/D/YYYY and ISO formats)
      const nowLocal = new Date();
      const todayY = nowLocal.getFullYear();
      const todayM = nowLocal.getMonth();   // 0-indexed
      const todayD = nowLocal.getDate();

      const isSameDay = (dateValue) => {
        if (!dateValue) return false;
        // Handle string formats like "3/11/2026" or ISO "2026-03-11T..."
        const d = new Date(dateValue);
        if (isNaN(d.getTime())) return false;
        return (
          d.getFullYear() === todayY &&
          d.getMonth() === todayM &&
          d.getDate() === todayD
        );
      };

      const categorized = pendingOrders.reduce((acc, order) => {
        const dateVal = order.created_at || order.order_date || order.date || null;
        if (isSameDay(dateVal)) {
          acc.today.push(order);
        } else {
          acc.earlier.push(order);
        }
        return acc;
      }, { today: [], earlier: [] });

      setNotifications(categorized);
      setUnreadCount(pendingOrders.length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  // Pre-fetch orders for search on mount
  useEffect(() => {
    const loadAllOrders = async () => {
      try {
        const res = await api.get("/orders");
        setAllOrders(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error("Failed to preload orders for search", e);
      }
    };
    loadAllOrders();
  }, []);

  // Live search filter
  const handleSearchInput = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    setSearchLoading(true);
    const lower = q.toLowerCase().trim();
    const matched = allOrders.filter(o => {
      const orderId = `ORD-0${o.id}`;
      const name = (o.customer_name || "").toLowerCase();
      const phone = (o.customer_phone || "").toLowerCase();
      return (
        orderId.toLowerCase().includes(lower) ||
        String(o.id).includes(lower) ||
        name.includes(lower) ||
        phone.includes(lower)
      );
    }).slice(0, 6);
    setSearchResults(matched);
    setShowSearchResults(true);
    setSearchLoading(false);
  };

  const handleSearchResultClick = (orderId) => {
    navigate(`/admin/orders/${orderId}`);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    setShowSearch(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Close all dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Search
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setShowSearchResults(false);
        // If search is open but empty, close the search bar too
        if (showSearch && !searchQuery.trim()) {
          setShowSearch(false);
        }
      }
      
      // Low Stock
      if (lowStockRef.current && !lowStockRef.current.contains(e.target)) {
        setShowLowStock(false);
      }
      
      // Notifications
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      
      // Profile Dropdown
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSearch, searchQuery]); // Dependencies to check search state

  // Fetch low stock products
  const fetchLowStockProducts = async () => {
    try {
      const res = await api.get("/products");
      const products = Array.isArray(res.data) ? res.data : [];
      const alerts = products.filter(p => {
        const stock = parseInt(p.total_stock ?? p.stock ?? 0);
        return stock <= 10; // low stock threshold
      }).sort((a, b) => {
        const sa = parseInt(a.total_stock ?? a.stock ?? 0);
        const sb = parseInt(b.total_stock ?? b.stock ?? 0);
        return sa - sb; // worst first
      });
      setLowStockItems(alerts);
    } catch (e) {
      console.error("Failed to fetch low stock", e);
    }
  };

  useEffect(() => {
    fetchLowStockProducts();
    const interval = setInterval(fetchLowStockProducts, 60000); // refresh every 1 min
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = (orderId) => {
    navigate(`/admin/orders/${orderId}`);
    setShowNotifications(false);
  };

  // ✅ Safe values
  const userName = profileName || "Admin";

  const userRole =
    role
      ? role.charAt(0).toUpperCase() + role.slice(1)
      : "Administrator";

  return (
    <header className="sticky top-0 z-30 
      bg-[#FFF8F0]/75 backdrop-blur-sm
      border-b border-orange-200/60
      shadow-[0_4px_30px_rgba(80,35,10,0.08)]">

      <div className="flex items-center justify-between px-4 py-3 sm:px-6">

        {/* LEFT */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl 
            bg-orange-50 hover:bg-orange-100
            text-primary-dark border border-orange-200 shadow-sm transition-all active:scale-95"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="hidden sm:flex flex-col">
            <h1 className="text-xl sm:text-2xl font-black 
              text-slate-800 tracking-tight truncate leading-none">
              {getPageTitle()}
            </h1>
            <p className="hidden sm:block text-[10px] text-orange-700 font-bold uppercase tracking-[0.2em] mt-1 opacity-80">
              Hi Welcome, {userName} ({userRole})
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">

          {/* SEARCH */}
          <div className="relative flex items-center" ref={searchWrapperRef}>
            <div className={`flex items-center transition-all duration-300 overflow-visible ${showSearch ? 'w-56 sm:w-72 opacity-100 mr-2' : 'w-0 opacity-0 pointer-events-none'}`}>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-600" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInput}
                  onFocus={() => searchQuery && setShowSearchResults(true)}
                  placeholder="Order ID, name, phone..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-3 text-sm focus:outline-none focus:ring-3 focus:ring-gray-500/10 focus:border-gray-300 text-slate-700 transition-all"
                />
                {searchQuery && (
                  <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Search Results Dropdown */}
                {showSearchResults && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[200] overflow-hidden">
                    {searchLoading ? (
                      <div className="px-4 py-3 text-xs text-slate-400 font-bold">Searching...</div>
                    ) : searchResults.length > 0 ? (
                      <div className="divide-y divide-slate-50 max-h-[320px] overflow-y-auto">
                        <div className="px-4 py-2 bg-slate-50">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{searchResults.length} Result{searchResults.length > 1 ? 's' : ''} found</p>
                        </div>
                        {searchResults.map(order => (
                          <button
                            key={order.id}
                            onClick={() => handleSearchResultClick(order.id)}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50/50 transition-all text-left group"
                          >
                            {/* Avatar */}
                            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white text-xs font-black shrink-0 shadow">
                              {(order.customer_name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-black text-slate-800 truncate">{order.customer_name || "Unknown"}</p>
                                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">ORD-0{order.id}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-400 font-bold truncate">{order.customer_phone || "No phone"}</span>
                                <span className="text-[9px] text-slate-300">•</span>
                                <span className="text-[10px] font-black text-emerald-600">₹{Number(order.total_amount).toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                            <div>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${order.status === 'Order Placed' ? 'bg-blue-100 text-blue-700' :
                                order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                                  order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                    'bg-amber-100 text-amber-700'
                                }`}>{order.status}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-6 text-center">
                        <Search className="w-6 h-6 text-slate-200 mx-auto mb-2" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No orders found</p>
                        <p className="text-[9px] text-slate-300 mt-1">Try name, phone or order ID</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => { setShowSearch(p => !p); if (showSearch) clearSearch(); }}
              className={`p-2.5 rounded-xl transition-all active:scale-95
              ${showSearch
                ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-orange-700/30'
                : 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-md shadow-orange-700/20 hover:shadow-lg hover:scale-105'}`}
            >
              <Search className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* LOW STOCK ALERT */}
          <div className="relative" ref={lowStockRef}>
            <button
              onClick={() => { setShowLowStock(p => !p); setShowNotifications(false); }}
              className={`relative p-2.5 rounded-xl transition-all active:scale-95
              ${showLowStock
                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30'
                : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:scale-105'}`}
              title="Low Stock Alerts"
            >
              <AlertTriangle className="w-[18px] h-[18px]" />
              {lowStockItems.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-black text-orange-500 ring-2 ring-orange-400">
                  {lowStockItems.length > 9 ? '9+' : lowStockItems.length}
                </span>
              )}
            </button>

            {showLowStock && (
              <div className="absolute right-0 mt-4 w-80 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden">

                  {/* Header */}
                  <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-amber-50">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Low Stock</h3>
                    </div>
                    <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg uppercase">
                      {lowStockItems.length} Alert{lowStockItems.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
                    {lowStockItems.length > 0 ? lowStockItems.map(product => {
                      const stock = parseInt(product.total_stock ?? product.stock ?? 0);
                      const isOut = stock <= 0;
                      const img = getHeaderProductImage(product);
                      return (
                        <button
                          key={product.id}
                          onClick={() => { navigate('/admin/products/stock'); setShowLowStock(false); }}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-amber-50/40 transition-all text-left group"
                        >
                          {/* Product image */}
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 border border-gray-100 shrink-0">
                            <img
                              src={img}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name || "Product")}&background=EDE9FE&color=7C3AED`;
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-800 truncate">{product.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate mt-0.5">{product.category || product.product_code || '—'}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-black ${isOut ? 'text-red-600' : 'text-amber-600'}`}>
                              {stock}
                            </p>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${isOut ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                              }`}>
                              {isOut ? 'Out' : 'Low'}
                            </span>
                          </div>
                        </button>
                      );
                    }) : (
                      <div className="px-6 py-10 text-center">
                        <Package className="mx-auto w-10 h-10 opacity-10 mb-3" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">All stock healthy</p>
                      </div>
                    )}
                  </div>

                  <Link
                    to="/admin/products/stock"
                    onClick={() => setShowLowStock(false)}
                    className="block w-full py-3.5 text-center text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] bg-amber-50/60 hover:bg-amber-50 transition-colors border-t border-slate-50"
                  >
                    View Full Stock Report →
                  </Link>
                </div>
            )}
          </div>

          {/* NOTIFICATION */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(p => !p)}
              className={`relative p-2.5 rounded-xl transition-all active:scale-95
              ${showNotifications
                ? 'bg-gradient-to-br from-secondary-light to-secondary-dark text-white shadow-lg shadow-secondary/30'
                : 'bg-gradient-to-br from-secondary-light to-secondary-dark text-white shadow-md shadow-secondary/20 hover:shadow-lg hover:scale-105'}`}
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-black text-secondary ring-2 ring-secondary-light">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-4 w-80 
              bg-white 
              border border-slate-100
              rounded-2xl shadow-2xl z-50 overflow-hidden">

                  <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                      New Orders
                    </h3>
                    <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg uppercase">
                      {(notifications.today?.length || 0) + (notifications.earlier?.length || 0)} Pending
                    </span>
                  </div>

                  <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                    {notifications.today?.length > 0 || notifications.earlier?.length > 0 ? (
                      <div className="divide-y divide-slate-50">
                        {/* Today Section */}
                        {notifications.today?.length > 0 && (
                          <>
                            <div className="px-5 py-2 bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
                              <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em]">Today's Orders</p>
                            </div>
                            {notifications.today.map((order) => (
                              <button
                                key={order.id}
                                onClick={() => handleNotificationClick(order.id)}
                                className="w-full px-5 py-4 flex items-start gap-4 hover:bg-blue-50/30 transition-all text-left group  "
                              >
                                <div className="w-10 h-10 rounded-xl bg-blue-100/50 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                                  <ShoppingBag className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <p className="text-sm font-black text-slate-800 tracking-tight">ORD-0{order.id}</p>
                                    <p className="text-[12px] text-blue-600 font-black">₹{Number(order.total_amount).toLocaleString('en-IN')}</p>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <p className="text-[10px] text-slate-500 font-bold truncate">
                                      {order.customer_name || "New Customer"}
                                    </p>
                                    <span className="text-[9px] bg-blue-50 text-green-600 font-black px-1.5 py-0.5 rounded uppercase">
                                      {order.status}
                                    </span>
                                  </div>

                                </div>

                              </button>
                            ))}
                          </>
                        )}

                        {/* Earlier Section */}
                        {notifications.earlier?.length > 0 && (
                          <>
                            <div className="px-5 py-2 bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Earlier Pending</p>
                            </div>
                            {notifications.earlier.map((order) => (
                              <button
                                key={order.id}
                                onClick={() => handleNotificationClick(order.id)}
                                className="w-full px-5 py-4 flex items-start gap-4 hover:bg-slate-50 transition-all text-left group opacity-80 hover:opacity-100"
                              >
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 group-hover:scale-110 transition-transform">
                                  <ShoppingBag className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <p className="text-sm font-black text-slate-800 tracking-tight">#ORD-0{order.id}</p>
                                    <p className="text-[12px] text-slate-600 font-black">₹{Number(order.total_amount).toLocaleString('en-IN')}</p>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <p className="text-[10px] text-slate-400 font-bold truncate">
                                      {order.customer_name || "New Customer"}
                                    </p>
                                    <span className="text-[9px] bg-slate-100 text-slate-500 font-black px-1.5 py-0.5 rounded uppercase">
                                      {order.status}
                                    </span>
                                  </div>
                                  <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest mt-2 flex items-center justify-between">
                                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                    <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </p>
                                </div>

                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="px-6 py-12 text-center text-slate-400">
                        <Package className="mx-auto w-12 h-12 opacity-10 mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
                          All orders processed
                        </p>
                      </div>
                    )}
                  </div>

                  {(notifications.today?.length > 0 || notifications.earlier?.length > 0) && (
                    <Link
                      to="/admin/orders/new"
                      onClick={() => setShowNotifications(false)}
                      className="block w-full py-4 text-center text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50/50 hover:bg-blue-50 transition-colors border-t border-slate-50"
                    >
                      View All Manifests
                    </Link>
                  )}
                </div>
            )}
          </div>

          {/* PROFILE */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowDropdown(p => !p)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-2xl transition-all active:scale-95
              ${showDropdown
                ? 'bg-orange-50 border border-orange-200 shadow-md'
                : 'bg-white/60 border border-orange-200/70 hover:bg-orange-50 hover:border-orange-300'}`}
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-xs font-black shadow-md shadow-orange-700/30 overflow-hidden">
                {user?.profile_image ? (
                  <img src={resolveMediaUrl(user.profile_image)} alt="" className="w-full h-full object-cover" />
                ) : (
                  userName.charAt(0).toUpperCase()
                )}
              </div>

              <div className="hidden md:block text-left leading-tight">
                <p className="text-xs font-black text-slate-800">
                  {userName}
                </p>
                <p className="text-[9px] text-orange-700 font-bold uppercase tracking-widest opacity-80">
                  {userRole}
                </p>
              </div>

              <ChevronDown
                className={`hidden sm:block w-3.5 h-3.5 text-orange-700/70 transition-transform duration-300
                ${showDropdown ? "rotate-180" : ""}`}
              />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-4 w-52
                  bg-white 
                  border border-slate-100
                  rounded-2xl shadow-2xl z-50 p-2 overflow-hidden">

                  <div className="px-3 py-2 border-b border-slate-50 mb-1">
                    <p className="text-sm font-semibold text-black">
                      {userName}
                    </p>
                    <p className="text-xs text-black/60">
                      {email}
                    </p>
                  </div>

                  <Link
                    to="/admin/profile"
                    className="flex items-center gap-3 px-3 py-2.5 
                    rounded-xl hover:bg-orange-50 hover:text-orange-700
                    text-sm text-slate-600 transition font-bold"
                  >
                    <User className="w-4 h-4 opacity-50" /> Profile
                  </Link>

                  {/* <Link
                    to="/admin/settings"
                    className="flex items-center gap-3 px-3 py-2.5 
                    rounded-xl hover:bg-orange-50 hover:text-orange-700
                    text-sm text-slate-600 transition font-bold"
                  >
                    <Settings className="w-4 h-4 opacity-50" /> Settings
                  </Link> */}

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2 
                    rounded-xl hover:bg-red-500/20 
                    text-sm text-red-400 w-full transition"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
