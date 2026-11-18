import React, { useContext, useState, useRef, useEffect, useLayoutEffect } from "react";
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
  const [mobileMenuTop, setMobileMenuTop] = useState(0);
  const [userMenu, setUserMenu] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [roomsMenu, setRoomsMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoryMenu, setCategoryMenu] = useState(false);
  const [pagesMenu, setPagesMenu] = useState(false);
  const [mobileCategory, setMobileCategory] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [orderCount, setOrderCount] = useState(0);

  const profileInitial = String(profileName || "U").trim().charAt(0).toUpperCase() || "U";
  const profileImage = user?.profile_image ? resolveMediaUrl(user.profile_image) : "";

  const menuRef = useRef();
  const navbarRef = useRef(null);
  const categoryRef = useRef();
  const roomsRef = useRef();
  const pagesRef = useRef();
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

      if (pagesRef.current && !pagesRef.current.contains(e.target)) {
        setPagesMenu(false);
      }

    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);

  }, []);

  useLayoutEffect(() => {
    if (!mobileMenu) return undefined;

    const updateMenuPosition = () => {
      setMobileMenuTop(navbarRef.current?.getBoundingClientRect().bottom || 0);
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    return () => window.removeEventListener("resize", updateMenuPosition);
  }, [mobileMenu]);

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
    `inline-flex items-center whitespace-nowrap rounded-md px-2.5 py-2 text-xs font-semibold transition-colors xl:px-3 xl:text-[13px] ${
      isActive
        ? "bg-[#ed720a] text-white shadow-sm"
        : "text-[#351d0e] hover:text-[#e87500]"
    }`;
  const mobileNavClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
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

    <nav ref={navbarRef} className="sticky top-0 z-50 bg-[#fffaf5]/95 py-2 backdrop-blur-md">
      <PageContainer>
        <div className="flex min-h-[68px] flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#f07816]/40 bg-white/95 px-3 shadow-[0_10px_30px_rgba(74,42,19,0.12)] sm:min-h-[76px] sm:gap-3 sm:px-4 lg:rounded-full lg:px-4 xl:flex-nowrap">
          <button
            type="button"
            onClick={() => mobileMenu ? closeMobileMenu() : setMobileMenu(true)}
            aria-label={mobileMenu ? "Close menu" : "Open menu"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition hover:bg-primary-dark lg:hidden"
          >
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>

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

          <span aria-hidden="true" className="hidden h-10 w-px shrink-0 bg-[#dfcbb5] lg:block" />

          <div className="hidden flex-1 items-center justify-center gap-0 lg:flex lg:gap-1">
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
                className="inline-flex items-center gap-1 whitespace-nowrap px-2 py-2 text-xs font-semibold text-[#351d0e] transition-colors hover:text-[#e87500] xl:text-[13px]"
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
                className="inline-flex items-center gap-1 whitespace-nowrap px-2 py-2 text-xs font-semibold text-[#351d0e] transition-colors hover:text-[#e87500] xl:text-[13px]"
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

            <NavLink
              to="/combo"
              className={({ isActive }) =>
                `relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-3 py-2 text-xs font-bold text-white transition hover:bg-primary-dark xl:text-[13px] ${
                  isActive ? "ring-2 ring-primary/25" : ""
                }`
              }
            >
              <FiTag size={15} />
              Combos
              <span className="absolute -right-1.5 -top-1 rounded-full bg-[#351d0e] px-1.5 py-0.5 text-[8px] font-extrabold uppercase leading-none text-white">
                Hot
              </span>
            </NavLink>
            <Link to="/about" className={navClass({ isActive: false })}>Interior Ideas</Link>
            <div className="relative" ref={pagesRef}>
              <button
                type="button"
                onClick={() => setPagesMenu((current) => !current)}
                className="inline-flex items-center gap-1 whitespace-nowrap px-2 py-2 text-xs font-semibold text-[#351d0e] transition-colors hover:text-[#e87500] xl:text-[13px]"
                aria-expanded={pagesMenu}
              >
                Pages
                <FiChevronDown className={`transition-transform ${pagesMenu ? "rotate-180" : ""}`} />
              </button>
              {pagesMenu && (
                <div className="absolute left-1/2 top-full z-[70] mt-3 w-56 -translate-x-1/2 overflow-hidden rounded-2xl border border-[#f1dfca] bg-white py-2 shadow-[0_16px_35px_rgba(74,42,19,0.16)]">
                  {[
                    { label: "About Us", to: "/about", icon: FiFileText },
                    { label: "Contact Us", to: "/contactus", icon: FiPhone },
                    { label: "Privacy Policy", to: "/privacy-policy", icon: FiFileText },
                  ].map(({ label, to, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setPagesMenu(false)}
                      className={({ isActive }) =>
                        `mx-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                          isActive ? "bg-primary text-white" : "text-[#351d0e] hover:bg-orange-50 hover:text-[#d9650b]"
                        }`
                      }
                    >
                      <Icon size={16} />
                      {label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 text-[#351d0e] sm:gap-2 lg:gap-3 lg:border-l lg:border-[#dfcbb5] lg:pl-3">
            <div className="hidden items-center gap-1 sm:flex xl:gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setSearchOpen(!searchOpen)}
                aria-label="Search furniture"
                aria-expanded={searchOpen}
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[#fff0df] hover:text-[#e87500] lg:rounded-xl lg:border lg:border-[#e87500]/45 lg:bg-white"
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
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[#fff0df] hover:text-[#e87500] lg:rounded-xl lg:border lg:border-[#e87500]/45 lg:bg-white"
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
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[#fff0df] hover:text-[#e87500] lg:rounded-xl lg:border lg:border-[#e87500]/45 lg:bg-white"
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
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f7e4ca] text-sm font-bold text-[#351d0e] transition hover:bg-[#f1d3ac] lg:rounded-xl lg:border lg:border-[#e87500]/45 lg:bg-white"
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
              <Link to="/login" aria-label="Sign in" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f7e4ca] transition hover:bg-[#f1d3ac] hover:text-[#e87500] lg:rounded-xl lg:border lg:border-[#e87500]/45 lg:bg-white">
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
        <div className="fixed inset-x-0 bottom-0 z-50" style={{ top: `${mobileMenuTop}px` }}>

          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeMobileMenu}
          />

          {/* Drawer */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="absolute bottom-0 right-0 top-0 flex h-full w-[min(94vw,380px)] flex-col border-l border-[#f0dfce] bg-[#fffaf5] shadow-2xl"
          >
            <div className="absolute inset-0 min-h-0 overflow-y-auto px-3 py-4">

            {/* MENU SCREEN */}
            {!mobileCategory && !mobilePages && (
              <>
                <div className="flex flex-col gap-2.5">
                  <form onSubmit={handleSearch} className="relative mb-1">
                    <label htmlFor="mobile-furniture-search" className="sr-only">Search furniture</label>
                    <input
                      id="mobile-furniture-search"
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search furniture"
                      className="h-14 w-full rounded-2xl border border-[#f0e5da] bg-white pl-12 pr-4 text-sm font-medium text-[#351d0e] outline-none transition placeholder:text-[#8b735e] focus:border-primary"
                    />
                    <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                  </form>

                  <NavLink
                    to="/"
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `flex min-h-[60px] items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        isActive ? "border-primary/20 bg-[#fff0df] text-[#c2560b]" : "border-[#f0e5da] bg-white text-[#351d0e] hover:border-primary/40"
                      }`
                    }
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0df] text-primary"><FiHome size={18} /></span>
                    Home
                  </NavLink>

                  <NavLink
                    to="/shop"
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `flex min-h-[60px] items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        isActive ? "border-primary/20 bg-[#fff0df] text-[#c2560b]" : "border-[#f0e5da] bg-white text-[#351d0e] hover:border-primary/40"
                      }`
                    }
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0df] text-primary"><FiShoppingBag size={18} /></span>
                    Shop
                  </NavLink>

                  <button
                    onClick={() => setMobileCategory(true)}
                    className="flex min-h-[60px] items-center justify-between gap-3 rounded-2xl border border-[#f0e5da] bg-white px-4 py-3 text-sm font-semibold text-[#351d0e] transition hover:border-primary/40"
                  >
                    <span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0df] text-primary"><FiGrid size={18} /></span>Categories</span>
                    <FiChevronRight size={17} className="text-primary" />
                  </button>

                  <NavLink
                    to="/combo"
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `flex min-h-[60px] items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        isActive ? "border-primary/20 bg-[#fff0df] text-[#c2560b]" : "border-[#f0e5da] bg-white text-[#351d0e] hover:border-primary/40"
                      }`
                    }
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0df] text-primary"><FiTag size={18} /></span>
                    Combo Offers
                  </NavLink>

                  <Link
                    to="/about"
                    onClick={closeMobileMenu}
                    className="flex min-h-[60px] items-center gap-3 rounded-2xl border border-[#f0e5da] bg-white px-4 py-3 text-sm font-semibold text-[#351d0e] transition hover:border-primary/40"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0df] text-primary"><FiFileText size={18} /></span>
                    Interior Ideas
                  </Link>

                  <button
                    onClick={() => setMobilePages(true)}
                    className="flex min-h-[60px] items-center justify-between gap-3 rounded-2xl border border-[#f0e5da] bg-white px-4 py-3 text-sm font-semibold text-[#351d0e] transition hover:border-primary/40"
                  >
                    <span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0df] text-primary"><FiFileText size={18} /></span>Pages</span>
                    <FiChevronRight size={17} className="text-primary" />
                  </button>

                  <div className="pt-2">
                    <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.16em] text-[#8b735e]">Shop by room</h2>
                    <div className="grid grid-cols-2 gap-2">
                      {roomLinks.map(({ name, slug, icon: RoomIcon }) => (
                        <NavLink
                          key={slug}
                          to={`/shop?room=${encodeURIComponent(slug)}`}
                          onClick={closeMobileMenu}
                          className={({ isActive }) =>
                            `flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                              isActive ? "border-primary/20 bg-[#fff0df] text-[#c2560b]" : "border-[#f0e5da] bg-white text-[#351d0e] hover:border-primary/40"
                            }`
                          }
                        >
                          <RoomIcon size={16} className="shrink-0 text-primary" />
                          <span className="truncate">{name}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>

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
                    to="/privacy-policy"
                    onClick={closeMobileMenu}
                    className={mobileNavClass}
                  >
                    <FiFileText size={16} />
                    Privacy Policy
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
        </div>
      )}
      <CartDrawer isOpen={cartOpen} onClose={closeCart} />
      <WishlistDrawer isOpen={wishlistOpen} onClose={closeWishlist} />
    </nav>

  );
};

export default Navbar;