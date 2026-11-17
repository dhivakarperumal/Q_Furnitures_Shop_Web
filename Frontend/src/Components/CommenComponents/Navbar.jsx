import React, { useContext, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../PrivateRouter/AuthContext";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import {
  Menu,
  X,
  User,
  LogOut,
  Heart,
  ShoppingCart,
  Search,
} from "lucide-react";
import PageContainer from "./PageContainer";
import api from "../../api";
import { FiHome, FiShoppingBag, FiGrid, FiFileText, FiPhone, FiChevronDown, FiMoon, FiCoffee, FiMonitor, FiUser, FiLogOut } from "react-icons/fi";
import { FiChevronRight, FiTag } from "react-icons/fi";
import CartDrawer from "./CartDrawer";
import WishlistDrawer from "./WishlistDrawer";
import { resolveMediaUrl } from "../../utils/media";

const roomLinks = [
  { name: "Living Room", slug: "living-room", icon: FiHome, description: "Relax and unwind" },
  { name: "Bedroom", slug: "bedroom", icon: FiMoon, description: "Restful essentials" },
  { name: "Dining Room", slug: "dining-room", icon: FiCoffee, description: "Gather around" },
  { name: "Home Office", slug: "home-office", icon: FiMonitor, description: "Work comfortably" },
];

function getCategoryImage(images) {
  if (Array.isArray(images)) return resolveMediaUrl(images[0] || "");
  if (typeof images !== "string" || !images) return "";

  try {
    const parsedImages = JSON.parse(images);
    return resolveMediaUrl(Array.isArray(parsedImages) ? parsedImages[0] : "");
  } catch {
    return resolveMediaUrl(images);
  }
}

const Navbar = () => {

  const { user, logout, profileName } = useContext(AuthContext);
  const { cart, wishlist } = useContext(StoreContext);
  const [mobilePages, setMobilePages] = useState(false);
  const navigate = useNavigate();

  const [mobileMenu, setMobileMenu] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [roomsMenu, setRoomsMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoryMenu, setCategoryMenu] = useState(false);
  const [mobileCategory, setMobileCategory] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [orderCount, setOrderCount] = useState(0);

  const profileInitial = String(profileName || "U").trim().charAt(0).toUpperCase() || "U";
  const profileImage = user?.profile_image ? resolveMediaUrl(user.profile_image) : "";

  const menuRef = useRef();
  const categoryRef = useRef();
  const roomsRef = useRef();
  const cartTriggerRef = useRef(null);
  const wishlistTriggerRef = useRef(null);

  const confirmLogout = () => {
    logout();
    setLogoutConfirm(false);
    setUserMenu(false);
    navigate("/login", { replace: true });
  };

  const closeMobileMenu = () => {
    setMobileMenu(false);
    setMobileCategory(false);
    setMobilePages(false);
  };

  const openCart = (event) => {
    cartTriggerRef.current = event.currentTarget;
    setCartOpen(true);
  };

  const closeCart = () => {
    setCartOpen(false);
    if (cartTriggerRef.current?.isConnected && cartTriggerRef.current.getClientRects().length) {
      cartTriggerRef.current.focus();
    } else if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const openWishlist = (event) => {
    wishlistTriggerRef.current = event.currentTarget;
    setWishlistOpen(true);
  };

  const closeWishlist = () => {
    setWishlistOpen(false);
    if (wishlistTriggerRef.current?.isConnected && wishlistTriggerRef.current.getClientRects().length) {
      wishlistTriggerRef.current.focus();
    } else if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {

    const handler = (e) => {

      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenu(false);
      }

      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setCategoryMenu(false);
      }

      if (roomsRef.current && !roomsRef.current.contains(e.target)) {
        setRoomsMenu(false);
      }

    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);

  }, []);

  // Fetch categories
  useEffect(() => {

    const fetchCategories = async () => {
      try {
        const res = await api.get("/categories");
        setCategories(res.data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchCategories();

  }, []);

  // Fetch user orders count
  useEffect(() => {
    const fetchOrderCount = async () => {
      if (!user) {
        setOrderCount(0);
        return;
      }
      try {
        const response = await api.get("/orders/mine");
        const orders = Array.isArray(response.data) ? response.data : [];
        setOrderCount(orders.filter((order) => order.status !== "Delivered").length);
      } catch (error) {
        console.error("Error fetching order count:", error);
      }
    };

    fetchOrderCount();
    // Refresh order count every 30 seconds
    const interval = setInterval(fetchOrderCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const navClass = ({ isActive }) =>
    `inline-flex items-center whitespace-nowrap rounded-full px-3 py-2.5 text-[13px] font-semibold transition-colors ${
      isActive
        ? "bg-[#ed720a] text-white shadow-sm hover:bg-[#d65e00]"
        : "text-[#351d0e] hover:text-[#e87500]"
    }`;
  const mobileNavClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition ${
      isActive
        ? "bg-[#ed720a] text-white shadow-sm"
        : "text-gray-800 hover:text-orange-700"
    }`;

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    navigate(`/shop?search=${encodeURIComponent(query)}`);
    setSearchOpen(false);
    closeMobileMenu();
  };

  return (

    <nav className="sticky top-0 z-50 border-b border-[#f0dfc9] bg-[#fffaf5]/95 shadow-[0_8px_24px_rgba(74,42,19,0.13)] backdrop-blur-md">
      <PageContainer>
        <div className="flex min-h-[76px] items-center justify-between gap-2 sm:min-h-[84px] sm:gap-3">
          <Link
            to="/"
            className="flex shrink-0 items-center"
            aria-label="Q Living Furniture home"
          >
            <img
              src="/images/logo.png"
              alt="Q Living Furniture"
              className="h-auto max-h-11 w-32 object-contain sm:max-h-12 sm:w-40 xl:w-44"
            />
          </Link>

          <span aria-hidden="true" className="hidden h-10 w-px shrink-0 bg-[#dfcbb5] xl:block" />

          <div className="hidden flex-1 items-center justify-center gap-1.5 lg:flex xl:gap-3">
            <NavLink to="/" end className={navClass}>Home</NavLink>
            <NavLink to="/shop" className={({ isActive }) => `${navClass({ isActive })} inline-flex items-center gap-1`}>
              Shop 
            </NavLink>

            <div className="relative" ref={categoryRef}>
              <button
                type="button"
                onClick={() => {
                  setCategoryMenu(!categoryMenu);
                  setRoomsMenu(false);
                }}
                className="inline-flex items-center gap-1 whitespace-nowrap px-1.5 py-2 text-[13px] font-semibold text-[#351d0e] transition-colors hover:text-[#e87500]"
                aria-expanded={categoryMenu}
              >
                Collections
                <FiChevronDown className={`transition-transform ${categoryMenu ? "rotate-180" : ""}`} />
              </button>
              {categoryMenu && (
                <div className="absolute left-1/2 top-full z-[70] mt-3 w-[min(90vw,540px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-[#f1dfca] bg-white">
                  <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-[#fff5e9] to-white px-4 py-3.5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c66a22]">Explore</p>
                      <h3 className="mt-0.5 text-sm font-bold text-[#351d0e]">Shop by category</h3>
                    </div>
                    <Link
                      to="/shop"
                      onClick={() => setCategoryMenu(false)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-[#9b4e17] transition hover:bg-orange-50"
                    >
                      View all <FiChevronRight size={15} />
                    </Link>
                  </div>
                  {categories.length > 0 ? (
                    <div className="grid max-h-[60vh] grid-cols-1 gap-1 overflow-y-auto p-2 sm:grid-cols-2">
                      {categories.map((cat) => {
                        const image = getCategoryImage(cat.images);
                        return (
                          <NavLink
                            key={cat.catId || cat.id || cat.name}
                            to={`/shop?category=${encodeURIComponent(cat.name)}`}
                            onClick={() => setCategoryMenu(false)}
                            className={({ isActive }) =>
                              `group flex min-w-0 items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e87500] ${
                                isActive
                                  ? "bg-orange-50 text-[#c96518]"
                                  : "text-[#351d0e] hover:border-orange-100 hover:bg-[#fffaf5]"
                              }`
                            }
                          >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f7eee3] text-[#a38365] ring-1 ring-[#ead9c5]">
                              {image ? (
                                <img src={image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                              ) : (
                                <FiTag size={18} />
                              )}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{cat.name}</span>
                            <FiChevronRight size={15} className="shrink-0 text-[#b49a80] transition-transform group-hover:translate-x-0.5 group-hover:text-[#e87500]" />
                          </NavLink>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-6 py-8 text-center">
                      <p className="text-sm font-semibold text-[#351d0e]">Browse our furniture collection</p>
                      <p className="mt-1 text-xs text-[#8b735e]">Explore pieces made for every room.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative" ref={roomsRef}>
              <button
                type="button"
                onClick={() => {
                  setRoomsMenu(!roomsMenu);
                  setCategoryMenu(false);
                }}
                className="inline-flex items-center gap-1 whitespace-nowrap px-1.5 py-2 text-[13px] font-semibold text-[#351d0e] transition-colors hover:text-[#e87500]"
                aria-expanded={roomsMenu}
              >
                Rooms
                <FiChevronDown className={`transition-transform ${roomsMenu ? "rotate-180" : ""}`} />
              </button>
              {roomsMenu && (
                <div className="absolute left-1/2 top-full z-[70] mt-3 w-[min(88vw,390px)] -translate-x-1/2 overflow-hidden rounded-3xl border border-[#f1dfca] bg-white">
                  <div className="bg-gradient-to-r from-[#fff5e9] to-[#fff0df] px-5 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c66a22]">Made for every space</p>
                    <h3 className="mt-1 text-base font-bold text-[#351d0e]">Shop by room</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 p-4">
                    {roomLinks.map(({ name, slug, icon: RoomIcon, description }) => (
                      <Link
                        key={slug}
                        to={`/shop?room=${encodeURIComponent(slug)}`}
                        onClick={() => setRoomsMenu(false)}
                        className="group flex min-h-24 items-center gap-3 rounded-2xl border border-[#f3e7d9] bg-[#fffdfa] p-3 transition hover:border-orange-200 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e87500]"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-[#c96518] transition group-hover:bg-[#f07816] group-hover:text-white">
                          <RoomIcon size={19} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-[#351d0e]">{name}</span>
                          <span className="mt-1 block text-[10px] leading-4 text-[#8b735e]">{description}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <NavLink to="/combo" className={({ isActive }) => `${navClass({ isActive })} relative`}>
              Combos
              <span className="absolute -right-3 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-extrabold uppercase leading-none text-white">
                Hot
              </span>
            </NavLink>
            <Link to="/about" className={navClass({ isActive: false })}>Interior Ideas</Link>
            <NavLink to="/about" className={navClass}>About Us</NavLink>
            <NavLink
              to="/contactus"
              className={navClass}
            >
              Contact Us
            </NavLink>
          </div>

          <div className="flex shrink-0 items-center gap-1 text-[#351d0e] sm:gap-2 lg:border-l lg:border-[#dfcbb5] lg:pl-3 xl:gap-3 xl:pl-5">
            <div className="hidden items-center gap-1 sm:flex xl:gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setSearchOpen(!searchOpen)}
                aria-label="Search furniture"
                aria-expanded={searchOpen}
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[#fff0df] hover:text-[#e87500]"
              >
                <Search size={21} />
              </button>
              {searchOpen && (
                <form onSubmit={handleSearch} className="absolute right-0 top-full z-50 mt-3 flex w-[min(85vw,320px)] gap-2 rounded-xl border border-orange-100 bg-white p-3 shadow-xl">
                  <input
                    autoFocus
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search furniture"
                    aria-label="Search furniture"
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                  />
                  <button type="submit" className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700">
                    Search
                  </button>
                </form>
              )}
            </div>

            <button
              type="button"
              onClick={openWishlist}
              aria-label="Open wishlist"
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[#fff0df] hover:text-[#e87500]"
            >
              <Heart size={21} />
              {wishlist.length > 0 && (
                <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[9px] font-bold text-white">
                  {wishlist.length > 9 ? "9+" : wishlist.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={openCart}
              aria-label="Open cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[#fff0df] hover:text-[#e87500]"
            >
              <ShoppingCart size={21} />
              {cart.length > 0 && (
                <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[9px] font-bold text-white">
                  {cart.length > 9 ? "9+" : cart.length}
                </span>
              )}
            </button>

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenu(!userMenu)}
                  aria-label={`Open account menu for ${profileName}`}
                  aria-expanded={userMenu}
                  aria-haspopup="menu"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f7e4ca] text-sm font-bold text-[#351d0e] transition hover:bg-[#f1d3ac]"
                >
                  {profileInitial}
                </button>
                {userMenu && (
                  <div className="absolute right-0 top-full z-[70] mt-3 w-[min(88vw,330px)] overflow-hidden rounded-3xl border border-[#f1dfca] bg-white">
                    <div className="bg-gradient-to-br from-[#fff0df] via-[#fff8ef] to-white p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#f07816] to-[#d9650b] text-lg font-bold text-white ring-4 ring-white">
                          {profileImage ? (
                            <img src={profileImage} alt="" className="h-full w-full object-cover" />
                          ) : (
                            profileInitial
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#c66a22]">Welcome back</p>
                          <p className="mt-1 truncate text-base font-bold text-[#351d0e]">{profileName}</p>
                          <p className="truncate text-xs text-[#8b735e]">{user.email || "Your Q Living account"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1 p-2.5">
                      <Link
                        to="/account"
                        onClick={() => setUserMenu(false)}
                        className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-orange-50"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-[#c96518] group-hover:bg-white">
                          <FiUser size={17} />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-[#351d0e]">My Account</span>
                          <span className="block text-[11px] text-[#8b735e]">Profile and saved addresses</span>
                        </span>
                      </Link>
                      <Link
                        to="/ordersmain"
                        onClick={() => setUserMenu(false)}
                        className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-orange-50"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-[#c96518] group-hover:bg-white">
                          <FiShoppingBag size={17} />
                        </span>
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                          <span>
                            <span className="block text-sm font-semibold text-[#351d0e]">My Orders</span>
                            <span className="block text-[11px] text-[#8b735e]">Track your purchases</span>
                          </span>
                          {orderCount > 0 && (
                            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#f07816] px-2 text-xs font-bold text-white">
                              {orderCount}
                            </span>
                          )}
                        </span>
                      </Link>
                    {user.role === "admin" && (
                      <Link
                        to="/admin"
                        onClick={() => setUserMenu(false)}
                        className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-orange-50"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-[#c96518] group-hover:bg-white">
                          <FiGrid size={17} />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-[#351d0e]">Admin Panel</span>
                          <span className="block text-[11px] text-[#8b735e]">Manage your store</span>
                        </span>
                      </Link>
                    )}
                    </div>
                    <div className="border-t border-[#f3e7d9] p-2.5">
                    <button
                      type="button"
                      onClick={() => setLogoutConfirm(true)}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-orange-50"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-[#c96518]">
                        <FiLogOut size={17} />
                      </span>
                      <span className="text-sm font-semibold text-[#9b4e17]">Log out</span>
                    </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" aria-label="Sign in" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f7e4ca] transition hover:bg-[#f1d3ac] hover:text-[#e87500]">
                <User size={21} />
              </Link>
            )}
            </div>

            {user && (
              <Link
                to="/account"
                aria-label="My account"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f7e4ca] text-sm font-bold text-[#351d0e] transition hover:bg-[#f1d3ac] sm:hidden"
              >
                {profileInitial}
              </Link>
            )}

            <button
              type="button"
              onClick={() => mobileMenu ? closeMobileMenu() : setMobileMenu(true)}
              aria-label={mobileMenu ? "Close menu" : "Open menu"}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#351d0e] transition hover:bg-[#fff0df] hover:text-[#e87500] lg:hidden"
            >
              {mobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </PageContainer>

      {logoutConfirm && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#261208]/55 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            className="w-full max-w-sm overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-2xl shadow-[#351d0e]/30"
          >
            <div className="h-2 bg-gradient-to-r from-[#f07816] via-[#ffb36b] to-[#d9650b]" />
            <div className="px-7 pb-7 pt-8 text-center sm:px-9">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-[#d9650b] ring-8 ring-orange-50">
                <LogOut size={27} strokeWidth={2.2} />
              </div>
              <h2 id="logout-dialog-title" className="text-xl font-bold tracking-tight text-[#351d0e]">
                Confirm logout
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#8b735e]">
                Are you sure you want to log out of your account?
              </p>
              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => setLogoutConfirm(false)}
                  className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-semibold text-[#7b4a25] transition hover:border-orange-300 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2"
                >
                  Stay signed in
                </button>
                <button
                  type="button"
                  onClick={confirmLogout}
                  className="rounded-xl bg-gradient-to-r from-[#f07816] to-[#d9650b] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:from-[#e36d0d] hover:to-[#c85a08] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {mobileMenu && (
        <div className="fixed inset-x-0 bottom-0 top-[76px] z-50 sm:top-[84px] lg:hidden">

          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeMobileMenu}
          />

          {/* Drawer */}
          <div className="absolute inset-0 h-full w-full overflow-y-auto bg-white">

            {/* MENU SCREEN */}
            {!mobileCategory && !mobilePages && (
              <>
                {/* Links */}
                <div className="flex flex-col p-5 space-y-3">
                  <form onSubmit={handleSearch} className="mb-1 flex gap-2">
                    <label htmlFor="mobile-furniture-search" className="sr-only">Search furniture</label>
                    <input
                      id="mobile-furniture-search"
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search furniture"
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400"
                    />
                    <button type="submit" aria-label="Search" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-white">
                      <Search size={18} />
                    </button>
                  </form>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        closeMobileMenu();
                        openWishlist(event);
                      }}
                      className="flex items-center justify-center gap-2 rounded-lg border border-orange-100 px-3 py-3 text-sm font-semibold text-slate-700"
                    >
                      <Heart size={17} />
                      Wishlist{wishlist.length > 0 ? ` (${wishlist.length})` : ""}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        closeMobileMenu();
                        openCart(event);
                      }}
                      className="flex items-center justify-center gap-2 rounded-lg border border-orange-100 px-3 py-3 text-sm font-semibold text-slate-700"
                    >
                      <ShoppingCart size={17} />
                      Cart{cart.length > 0 ? ` (${cart.length})` : ""}
                    </button>
                  </div>

                  <NavLink
                    to="/"
                    onClick={closeMobileMenu}
                    className={mobileNavClass}
                  >
                    <FiHome size={16} />
                    Home
                  </NavLink>

                  <NavLink
                    to="/shop"
                    onClick={closeMobileMenu}
                    className={mobileNavClass}
                  >
                    <FiShoppingBag size={16} />
                    Shop
                  </NavLink>

                  <button
                    onClick={() => setMobileCategory(true)}
                    className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-gray-800 transition hover:text-orange-700"
                  >
                    <div className="flex items-center gap-3">
                      <FiGrid size={16} />
                      Categories
                    </div>

                    <FiChevronRight size={16} />
                  </button>

                  <button
                    onClick={() => setMobilePages(true)}
                    className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-gray-800 transition hover:text-orange-700"
                  >
                    <div className="flex items-center gap-3">
                      <FiFileText size={16} />
                      Pages
                    </div>

                    <FiChevronRight size={16} />
                  </button>

                  <Link
                    to={user ? "/account" : "/login"}
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-800 transition hover:text-orange-700"
                  >
                    {user ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                        {profileInitial}
                      </span>
                    ) : (
                      <User size={16} />
                    )}
                    {user ? "My Account" : "Sign In"}
                  </Link>

                </div>
              </>
            )}

            {/* CATEGORY SCREEN */}
            {mobileCategory && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-orange-600 text-white">

                  {/* Back button */}
                  <button
                    onClick={() => setMobileCategory(false)}
                    className="text-xl"
                  >
                    ←
                  </button>

                  <h2 className="text-sm font-semibold">Categories</h2>

                  <X
                    size={24}
                    className="cursor-pointer"
                    onClick={closeMobileMenu}
                  />

                </div>

                {/* Category List */}
                <div className="flex flex-col p-5 space-y-3">

                  {categories.map((cat) => {
                    const image = getCategoryImage(cat.images);
                    return (
                      <NavLink
                        key={cat.catId || cat.id || cat.name}
                        to={`/shop?category=${encodeURIComponent(cat.name)}`}
                        onClick={closeMobileMenu}
                        className={({ isActive }) =>
                          `group flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                            isActive
                              ? "border-[#ed720a] bg-[#ed720a] text-white shadow-sm"
                              : "border-orange-100 bg-white text-[#351d0e] hover:border-orange-200 hover:bg-orange-50"
                          }`
                        }
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f7eee3] text-[#a38365]">
                            {image ? (
                              <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
                            ) : (
                              <FiTag size={18} />
                            )}
                          </span>
                          <span className="truncate">{cat.name}</span>
                        </div>
                        <FiChevronRight size={16} className="shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5" />
                      </NavLink>
                    );
                  })}

                </div>
              </>
            )}
            {/* PAGES SCREEN */}
            {mobilePages && (
              <>
                <div className="flex items-center justify-between px-6 py-4 bg-orange-600 text-white">

                  <button
                    onClick={() => setMobilePages(false)}
                    className="text-xl"
                  >
                    ←
                  </button>

                  <h2 className="text-lg font-semibold">Pages</h2>

                  <X
                    size={24}
                    className="cursor-pointer"
                    onClick={closeMobileMenu}
                  />

                </div>

                <div className="flex flex-col p-5 space-y-3">

                  <NavLink
                    to="/about"
                    onClick={closeMobileMenu}
                    className={mobileNavClass}
                  >
                    <FiFileText size={16} />
                    About Us
                  </NavLink>

                    <NavLink
                    to="/termsandconditions"
                    onClick={closeMobileMenu}
                    className={mobileNavClass}
                  >
                    <FiFileText size={16} />
                    Terms And Conditions
                  </NavLink>

                    
                  <NavLink
                    to="/contactus"
                    onClick={closeMobileMenu}
                    className={mobileNavClass}
                  >
                    <FiPhone size={16} />
                    Contact Us
                  </NavLink>

                </div>
              </>
            )}
          </div>
        </div>
      )}
      <CartDrawer isOpen={cartOpen} onClose={closeCart} />
      <WishlistDrawer isOpen={wishlistOpen} onClose={closeWishlist} />
    </nav>

  );
};

export default Navbar;