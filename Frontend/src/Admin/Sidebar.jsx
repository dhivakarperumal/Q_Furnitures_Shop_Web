import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  MessageSquare,
  BarChart3,
  X,
  ChevronDown,
  ChevronLeft,
  Home,
  Tag,
  PlusCircle,
  List,
  Layers,
  Truck,
  XCircle,
  Archive,
  Handshake,
  Video,
  Image
} from "lucide-react";

import { useAuth } from "../PrivateRouter/AuthContext";
import api from "../api";

/* ================= NAV ITEMS ================= */
const navItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },


   {
    label: "Orders",
    icon: ShoppingCart,
    children: [

      { path: "/admin/orders/new", label: "New Orders", icon: List },
      { path: "/admin/orders/all", label: "All Orders", icon: Archive },
      { path: "/admin/orders/delivery", label: "Delivery Orders", icon: Truck },
      { path: "/admin/orders/cancelled", label: "Cancelled Orders", icon: XCircle },

    ],
  },

  {
    label: "Inventory",
    icon: Package,
    children: [
      { path: "/admin/products/all", label: "All Products", icon: List },
      { path: "/admin/products/add", label: "Add Product", icon: PlusCircle },
      { path: "/admin/products/category", label: "Categories", icon: Layers },
      { path: "/admin/products/stock", label: "Stock Details", icon: Archive },
    ],
  },

 

  { path: "/admin/orders/billing", label: "Billing", icon: PlusCircle },
  { path: "/admin/users/all", label: "Customers", icon: Users },
  {
    label: "Dealers",
    icon: Handshake,
    children: [
      { path: "/admin/dealers", label: "Dealers List", icon: List },
      { path: "/admin/invoices/add", label: "New Invoice", icon: PlusCircle },
    ],
  },
  { path: "/admin/banners", label: "Promotion Banners", icon: Image },
  { path: "/admin/videos", label: "Showcase Videos", icon: Video },
  { path: "/admin/reviews", label: "Customer Reviews", icon: MessageSquare },
  // { path: "/admin/reports", label: "Reports", icon: BarChart3 },
  { path: "/", label: "Back Home", icon: Home },
];

/* ================= SIDEBAR ================= */
const Sidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
  const { profileName } = useAuth();
  const location = useLocation();
  const [orderCounts, setOrderCounts] = useState({
    all: 0,
    new: 0,
    delivery: 0,
    cancelled: 0,
  });

  /* ================= FETCH ORDER COUNTS ================= */
  useEffect(() => {
    const fetchOrderCounts = async () => {
      try {
        const response = await api.get("/orders");
        const orders = response.data.data || [];

        const counts = {
          all: orders.length,
          new: orders.filter(o => o.status === "New Order" || o.status === "Order Placed").length,
          delivery: orders.filter(o => o.status === "Delivery" || o.status === "Shipped").length,
          cancelled: orders.filter(o => o.status === "Cancelled").length,
        };

        setOrderCounts(counts);
      } catch (error) {
        console.error("Error fetching order counts:", error);
      }
    };

    fetchOrderCounts();
    // Refresh counts every 30 seconds
    const interval = setInterval(fetchOrderCounts, 30000);
    return () => clearInterval(interval);
  }, []);
  /* ================= ACTIVE ROUTE MAP ================= */
  const activeRouteMap = {
    "/admin/products": ["/admin/products/all", "/admin/products/add", "/admin/products/category"],
    "/admin/orders": ["/admin/orders/all", "/admin/orders/new", "/admin/orders/billing", "/admin/orders/delivery", "/admin/orders/cancelled"],
    "/admin/users": ["/admin/users/all"],
  };

  /* ================= HELPERS & LOGIC ================= */
  const isActiveRoute = (item) => {
    const currentPath = location.pathname;

    // 1. Strict exact match for root routes to prevent Dashboard/BackHome overlap
    if (item.path === "/" || item.path === "/admin" || item.exact) {
      return currentPath === item.path;
    }

    // 2. Dropdown parent check: check if any child is perfectly active or a sub-path
    if (item.children) {
      return item.children.some(child =>
        currentPath === child.path || currentPath.startsWith(child.path + "/")
      );
    }

    // 3. Normal item check: match exact or match as a parent path (with boundary)
    if (item.path) {
      return currentPath === item.path || currentPath.startsWith(item.path + "/");
    }

    return false;
  };

  const [openMenu, setOpenMenu] = useState(() => {
    const activeItem = navItems.find(item => item.children && isActiveRoute(item));
    return activeItem ? activeItem.label : null;
  });

  /* Dropdown logic - only one open at a time */
  const toggleMenu = (label) => {
    setOpenMenu(prev => prev === label ? null : label);
  };

  return (
    <>
      {/* ========== MOBILE OVERLAY ========== */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden
        transition-opacity ${isOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}
      />

      {/* ========== SIDEBAR ========== */}
      <aside
        className={`
        fixed top-0 left-0 z-50 h-full
        bg-gradient-to-r from-primary via-secondary to-primary-dark border-r border-white/5
        font-sans
        
        flex flex-col transition-all duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
        ${collapsed ? "lg:w-20 w-full" : "w-full lg:w-72"}
      `}
      >
        {/* ========== LOGO ========== */}
       <div className="relative overflow-hidden px-4 pt-5 pb-5 border-b border-white/10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-emerald-500/15 via-transparent to-cyan-500/5" />
          <div className="relative flex items-center gap-3">
            <div className="w-11 h-11 rounded-3xl bg-white border border-emerald-300/10 flex items-center justify-center shadow-2xl shadow-emerald-500/10 overflow-hidden">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-8 h-8 object-contain"
                onError={(e) => { e.target.src = "https://ui-avatars.com/api/?name=VR&background=1B4D22&color=fff"; }}
              />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#D4AF37] mb-1">
                  Q Furnitures
                </p>
                <p className="text-sm font-semibold tracking-wide text-white">
                  Furniture Store Admin
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="ml-auto p-2 rounded-xl text-white/40 hover:bg-white/5 lg:hidden border border-transparent hover:border-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========== NAVIGATION ========== */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto hide-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;

            /* ===== DROPDOWN ITEM ===== */
            if (item.children) {
              const isMenuOpen = openMenu === item.label;
              const isAnyChildActive = isActiveRoute(item);

              return (
                <div key={item.label} className="space-y-1">
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                      ${isMenuOpen || isAnyChildActive
                        ? "bg-[#FCD34D]/20 text-white"
                        : "text-white/50 hover:bg-white/5 hover:text-white"
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isMenuOpen || isAnyChildActive ? "text-[#FCD34D]" : ""}`} />

                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left text-sm font-semibold tracking-wide">
                          {item.label}
                          {item.label === "Orders" && orderCounts.all > 0 && (
                            <span className="ml-2 inline-block bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              {orderCounts.all}
                            </span>
                          )}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${isMenuOpen ? "rotate-180" : ""
                            }`}
                        />
                      </>
                    )}
                  </button>

                  {/* ===== SUB MENU ===== */}
                  {!collapsed && (
                    <div
                      className={`ml-4 pl-4  border-white/5 space-y-1 overflow-y-auto hide-scrollbar transition-all duration-300
                      ${isMenuOpen ? "max-h-60 opacity-100 py-1" : "max-h-0 opacity-0"}`}
                    >
                      {item.children.map((sub) => {
                        const SubIcon = sub.icon;
                        const isActive = location.pathname === sub.path;

                        // Get count badge for this item
                        let badgeCount = 0;
                        if (sub.label === "New Orders") badgeCount = orderCounts.new;
                        else if (sub.label === "All Orders") badgeCount = orderCounts.all;
                        else if (sub.label === "Delivery Orders") badgeCount = orderCounts.delivery;
                        else if (sub.label === "Cancelled Orders") badgeCount = orderCounts.cancelled;

                        return (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            onClick={() => isOpen && onClose()}
                            className={`
                              flex items-center gap-3 px-4 py-2.5 rounded-md text-xs font-medium tracking-wide transition-all
                              ${(location.pathname === sub.path || (sub.path !== "/admin" && location.pathname.startsWith(sub.path)))
                                ? "bg-gradient-to-r from-[#D4AF37] to-[#FBBF24] text-white shadow-lg shadow-[#D4AF37]/20"
                                : "text-white/40 hover:text-white hover:bg-white/5"
                              }
                            `}
                          >
                            <SubIcon className={`w-5 h-6 shrink-0 ${(location.pathname === sub.path || (sub.path !== "/admin" && location.pathname.startsWith(sub.path))) ? "text-white" : ""}`} />
                            <span className="flex-1">{sub.label}</span>
                            {badgeCount > 0 && (
                              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-fit">
                                {badgeCount}
                              </span>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            /* ===== NORMAL ITEM ===== */
            const isActive = isActiveRoute(item);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                onClick={() => {
                  setOpenMenu(null);
                  if (isOpen) onClose();
                }}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-md transition-all
                  ${isActive
                    ? "bg-gradient-to-r from-[#D4AF37] to-[#FBBF24] text-white shadow-xl shadow-[#D4AF37]/20"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                  }
                `}
              >
                <Icon className={`w-5 h-6 shrink-0 ${isActive ? "text-white" : ""}`} />
                {!collapsed && <span className="text-sm font-semibold tracking-wide">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* ========== FOOTER / PROFILE ========== */}
        {!collapsed && (
          <div className="p-4 mx-3 mb-6 bg-[#21094E]/50 rounded-2xl border border-white/10 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                <p className="font-bold text-black text-lg">{(profileName || "Admin User").charAt(0).toUpperCase()}</p>
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-semibold text-white truncate">{(profileName || "Admin User")}</p>
                <p className="text-[10px] text-gray-400 font-medium truncate">Super Admin</p>
              </div>
              <ChevronDown className="w-4 h-4 text-white/50" />
            </div>
          </div>
        )}

        {/* ========== COLLAPSE BUTTON ========== */}
        <button
          onClick={onToggleCollapse}
          className="
            hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2
            w-6 h-6 rounded-full
            bg-white border border-slate-200
            shadow-[0_4px_10px_rgba(0,0,0,0.1)]
            items-center justify-center
            text-slate-500 hover:text-blue-600 hover:scale-110 transition-all z-50
          "
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""
              }`}
          />
        </button>
      </aside>
    </>
  );
};

export default Sidebar;
