import React, { useContext, useState, useRef, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../PrivateRouter/AuthContext";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import {
  Menu,
  X,
  User,
  Heart,
  ShoppingCart,
  Search,
} from "lucide-react";
import PageContainer from "./PageContainer";
import api from "../../api";
import { FiHome, FiShoppingBag, FiGrid, FiFileText, FiPhone, FiChevronDown } from "react-icons/fi";
import { FiChevronRight, FiTag } from "react-icons/fi";
import CartDrawer from "./CartDrawer";
import WishlistDrawer from "./WishlistDrawer";

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

  const menuRef = useRef();
  const categoryRef = useRef();
  const roomsRef = useRef();

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
      if (user) {
        try {
          const response = await api.get("/orders");
          // API returns a plain array when no pagination params are passed
          const orders = Array.isArray(response.data) ? response.data : (response.data.data || []);
          // Filter by user_id
          const userOrders = orders.filter(o => (o.user_id === user.user_id || o.user_id === user.id) && o.status !== "Delivered");
          setOrderCount(userOrders.length);
        } catch (error) {
          console.error("Error fetching order count:", error);
        }
      }
    };

    fetchOrderCount();
    // Refresh order count every 30 seconds
    const interval = setInterval(fetchOrderCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const navClass = ({ isActive }) =>
    `whitespace-nowrap px-1.5 py-2 text-[13px] font-semibold transition-colors ${
      isActive
        ? "relative text-orange-600 after:absolute after:bottom-0 after:left-1.5 after:right-1.5 after:h-0.5 after:rounded after:bg-orange-600"
        : "text-slate-700 hover:text-orange-600"
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

    <nav className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 shadow-sm">
      <PageContainer>
        <div className="flex min-h-[72px] items-center justify-between gap-3">
          <Link
            to="/"
            className="flex shrink-0 items-center"
            aria-label="Q Living Furniture home"
          >
            <img
              src="/images/logo2.png"
              alt="Q Living Furniture"
              className="h-14 w-[110px] rounded-md bg-black object-contain"
            />
          </Link>

          <div className="hidden flex-1 items-center justify-center gap-3 lg:flex xl:gap-5">
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
                className="inline-flex items-center gap-1 whitespace-nowrap px-1.5 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:text-orange-600"
                aria-expanded={categoryMenu}
              >
                Collections
                <FiChevronDown className={`transition-transform ${categoryMenu ? "rotate-180" : ""}`} />
              </button>
              {categoryMenu && (
                <div className="absolute left-0 top-full z-50 mt-2 max-h-80 w-56 overflow-y-auto rounded-xl border border-orange-100 bg-white py-2 shadow-xl">
                  {categories.map((cat) => (
                    <NavLink
                      key={cat.id}
                      to={`/category/${cat.slug || cat.name}`}
                      onClick={() => setCategoryMenu(false)}
                      className={({ isActive }) =>
                        `block px-4 py-2.5 text-sm transition-colors ${
                          isActive ? "bg-orange-50 font-semibold text-orange-700" : "text-slate-700 hover:bg-orange-50 hover:text-orange-700"
                        }`
                      }
                    >
                      {cat.name}
                    </NavLink>
                  ))}
                  {categories.length === 0 && (
                    <span className="block px-4 py-2.5 text-sm text-slate-500">Browse all furniture</span>
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
                className="inline-flex items-center gap-1 whitespace-nowrap px-1.5 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:text-orange-600"
                aria-expanded={roomsMenu}
              >
                Rooms
                <FiChevronDown className={`transition-transform ${roomsMenu ? "rotate-180" : ""}`} />
              </button>
              {roomsMenu && (
                <div className="absolute left-0 top-full z-50 mt-2 w-48 rounded-xl border border-orange-100 bg-white py-2 shadow-xl">
                  {["Living Room", "Bedroom", "Dining Room", "Home Office"].map((room) => (
                    <Link
                      key={room}
                      to={`/shop?room=${encodeURIComponent(room.toLowerCase().replace(/ /g, "-"))}`}
                      onClick={() => setRoomsMenu(false)}
                      className="block px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-orange-50 hover:text-orange-700"
                    >
                      {room}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <NavLink to="/combo" className={({ isActive }) => `${navClass({ isActive })} relative`}>
              Offers
              <span className="absolute -right-3 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-extrabold uppercase leading-none text-white">
                Hot
              </span>
            </NavLink>
            <NavLink to="/about" className={navClass}>Interior Ideas</NavLink>
            <NavLink to="/about" className={navClass}>About Us</NavLink>
            <NavLink to="/contactus" className={navClass}>Contact Us</NavLink>
          </div>

          <div className="flex shrink-0 items-center gap-3 text-slate-800 sm:gap-4">
            <div className="hidden items-center gap-3 sm:flex">
            <div className="relative">
              <button
                type="button"
                onClick={() => setSearchOpen(!searchOpen)}
                aria-label="Search furniture"
                aria-expanded={searchOpen}
                className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-orange-50 hover:text-orange-600"
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
              onClick={() => setWishlistOpen(true)}
              aria-label="Open wishlist"
              className="relative flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-orange-50 hover:text-orange-600"
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
              onClick={() => setCartOpen(true)}
              aria-label="Open cart"
              className="relative flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-orange-50 hover:text-orange-600"
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
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700 transition hover:bg-orange-200"
                >
                  {profileInitial}
                </button>
                {userMenu && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-orange-100 bg-white py-1 shadow-xl">
                    <Link to="/account" className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-orange-50" onClick={() => setUserMenu(false)}>My Account</Link>
                    <Link to="/ordersmain" className="flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-orange-50" onClick={() => setUserMenu(false)}>
                      My Orders
                      {orderCount > 0 && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">{orderCount}</span>}
                    </Link>
                    {user.role === "admin" && (
                      <Link to="/admin" className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-orange-50" onClick={() => setUserMenu(false)}>Admin Panel</Link>
                    )}
                    <button
                      type="button"
                      onClick={() => setLogoutConfirm(true)}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" aria-label="Sign in" className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-orange-50 hover:text-orange-600">
                <User size={21} />
              </Link>
            )}
            </div>

            {user && (
              <Link
                to="/account"
                aria-label="My account"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700 transition hover:bg-orange-200 sm:hidden"
              >
                {profileInitial}
              </Link>
            )}

            <button
              type="button"
              onClick={() => mobileMenu ? closeMobileMenu() : setMobileMenu(true)}
              aria-label={mobileMenu ? "Close menu" : "Open menu"}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-800 transition hover:bg-orange-50 hover:text-orange-600 lg:hidden"
            >
              {mobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </PageContainer>

      {/* Logout Modal */}

      {logoutConfirm && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white rounded-xl shadow-xl w-[320px] p-6 text-center">

            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Confirm Logout
            </h2>

            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to logout?
            </p>

            <div className="flex justify-center gap-4">

              <button
                onClick={() => setLogoutConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                onClick={confirmLogout}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600"
              >
                Logout
              </button>

            </div>

          </div>

        </div>

      )}
      {mobileMenu && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-50 lg:hidden">

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
                      onClick={() => {
                        closeMobileMenu();
                        setWishlistOpen(true);
                      }}
                      className="flex items-center justify-center gap-2 rounded-lg border border-orange-100 px-3 py-3 text-sm font-semibold text-slate-700"
                    >
                      <Heart size={17} />
                      Wishlist{wishlist.length > 0 ? ` (${wishlist.length})` : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        closeMobileMenu();
                        setCartOpen(true);
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
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                        isActive ? "font-semibold text-orange-600" : "text-gray-800 hover:text-orange-700"
                      }`
                    }
                  >
                    <FiHome size={16} />
                    Home
                  </NavLink>

                  <NavLink
                    to="/shop"
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                        isActive ? "font-semibold text-orange-600" : "text-gray-800 hover:text-orange-700"
                      }`
                    }
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

                  {categories.map((cat) => (

                    <NavLink
                      key={cat.id}
                      to={`/category/${cat.slug || cat.name}`}
                      onClick={closeMobileMenu}
                      className={({ isActive }) =>
                        `flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition ${
                          isActive ? "font-semibold text-orange-600" : "text-gray-800 hover:text-orange-700"
                        }`
                      }
                    >

                      <div className="flex items-center gap-3">
                        <FiTag size={16} />
                        {cat.name}
                      </div>

                      <FiChevronRight size={16} />

                    </NavLink>

                  ))}

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
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                        isActive ? "font-semibold text-orange-600" : "text-gray-800 hover:text-orange-700"
                      }`
                    }
                  >
                    <FiFileText size={16} />
                    About Us
                  </NavLink>

                    <NavLink
                    to="/termsandconditions"
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                        isActive ? "font-semibold text-orange-600" : "text-gray-800 hover:text-orange-700"
                      }`
                    }
                  >
                    <FiFileText size={16} />
                    Terms And Conditions
                  </NavLink>

                    
                  <NavLink
                    to="/contactus"
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                        isActive ? "font-semibold text-orange-600" : "text-gray-800 hover:text-orange-700"
                      }`
                    }
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
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <WishlistDrawer isOpen={wishlistOpen} onClose={() => setWishlistOpen(false)} />
    </nav>

  );
};

export default Navbar;