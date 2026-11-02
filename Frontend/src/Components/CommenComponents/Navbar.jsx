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
  Package
} from "lucide-react";
import PageContainer from "./PageContainer";
import api from "../../api";
import { FiHome, FiShoppingBag, FiGrid, FiFileText, FiPhone, FiChevronDown } from "react-icons/fi";
import { FiChevronRight, FiTag } from "react-icons/fi";
import CartDrawer from "./CartDrawer";
import WishlistDrawer from "./WishlistDrawer";

const Navbar = () => {

  const { user, logout } = useContext(AuthContext);
  const { cart, wishlist } = useContext(StoreContext);
  const [mobilePages, setMobilePages] = useState(false);
  const navigate = useNavigate();

  const [mobileMenu, setMobileMenu] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoryMenu, setCategoryMenu] = useState(false);
  const [pagesMenu, setPagesMenu] = useState(false);
  const [mobileCategory, setMobileCategory] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [orderCount, setOrderCount] = useState(0);

  const menuRef = useRef();
  const categoryRef = useRef();
  const pagesRef = useRef();

  const confirmLogout = () => {
    logout();
    setLogoutConfirm(false);
    setUserMenu(false);
    navigate("/login", { replace: true });
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

      if (pagesRef.current && !pagesRef.current.contains(e.target)) {
        setPagesMenu(false);
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
  `px-4 py-1.5 rounded-lg text-sm font-medium transition
  ${
    isActive
      ? "bg-gradient-to-r from-primary-light to-secondary text-white shadow"
      : "text-gray-600 hover:bg-primary-light/10 hover:text-primary"
  }`;

  return (

    <nav className="sticky top-0 z-50 bg-white shadow-md py-1 md:py-0">

      <PageContainer>

        <div className="flex items-center justify-between">

          {/* Logo */}
          <Link
            to="/"
            className="flex shrink-0 items-center"
            aria-label="Style Hub home"
          >
            <img
              src="/images/logo.png"
              alt="Style Hub - Shoes, Bags, Belts and Leather Goods"
              className="h-12 w-auto max-w-[180px] object-contain md:h-16 md:max-w-[240px]"
            />
          </Link>

          {/* Desktop Links */}

          <div className="hidden md:flex flex-1 justify-center">

            <div className="flex items-center gap-2 text-base">

              <NavLink to="/" className={navClass}>
                Home
              </NavLink>

              <NavLink to="/shop" className={navClass}>
                Shop
              </NavLink>

              {/* Categories */}

              <div className="relative" ref={categoryRef}>

                <button
                  onClick={() => {
                    setCategoryMenu(!categoryMenu);
                    setPagesMenu(false);
                  }}
                  className="flex cursor-pointer items-center gap-1 text-gray-600 hover:text-primary transition"
                >
                  Categories
                  <FiChevronDown
                    className={`transition-transform ${categoryMenu ? "rotate-180" : ""}`}
                  />
                </button>

                {categoryMenu && (

                  <div className="absolute  top-10 left-0 w-48 bg-white border border-primary rounded-xl shadow-xl overflow-hidden animate-dropdown">

                    {categories.map((cat) => (

                      <NavLink
                        key={cat.id}
                        to={`/category/${cat.slug || cat.name}`}
                        onClick={() => setCategoryMenu(false)}
                        className={({ isActive }) =>
                          `block px-4 py-3 text-sm transition
    ${isActive
                            ? "bg-gradient-to-r from-primary-light via-secondary to-secondary-light text-white"
                            : "text-gray-700 hover:bg-gradient-to-r from-primary-light via-secondary to-secondary-light hover:text-white"
                          }`
                        }
                      >
                        {cat.name}
                      </NavLink>

                    ))}

                  </div>

                )}

              </div>

              {/* Pages */}

              <div className="relative" ref={pagesRef}>

                <button
                  onClick={() => {
                    setPagesMenu(!pagesMenu);
                    setCategoryMenu(false);
                  }}
                  className="flex items-center cursor-pointer gap-1 text-gray-600 hover:text-primary transition"
                >
                  Pages
                  <FiChevronDown
                    className={`transition-transform ${pagesMenu ? "rotate-180" : ""}`}
                  />
                </button>

                {pagesMenu && (

                  <div className="absolute top-10 left-0 w-44 bg-white border border-primary rounded-xl shadow-xl overflow-hidden animate-dropdown">

                    <NavLink
                      to="/about"
                      onClick={() => setPagesMenu(false)}
                      className={({ isActive }) =>
                        `block px-4 py-3 text-sm transition
    ${isActive
                          ? "bg-gradient-to-r from-primary-light via-secondary to-secondary-light text-white"
                          : "text-gray-700 hover:bg-gradient-to-r from-primary-light via-secondary to-secondary-light hover:text-white"
                        }`
                      }
                    >
                      About
                    </NavLink>
                    <NavLink
                      to="/termsandconditions"
                      onClick={() => setPagesMenu(false)}
                      className={({ isActive }) =>
                        `block px-4 py-3 text-sm transition
    ${isActive
                          ? "bg-gradient-to-r from-primary-light via-secondary to-secondary-light text-white"
                          : "text-gray-700 hover:bg-gradient-to-r from-primary-light via-secondary to-secondary-light hover:text-white"
                        }`
                      }
                    >
                      Terms And Conditions
                    </NavLink>

                    <NavLink
                      to="/contactus"
                      onClick={() => setPagesMenu(false)}
                      className={({ isActive }) =>
                        `block px-4 py-3 text-sm transition
    ${isActive
                          ? "bg-gradient-to-r from-primary-light via-secondary to-secondary-light text-white"
                          : "text-gray-700 hover:bg-gradient-to-r from-primary-light via-secondary to-secondary-light hover:text-white"
                        }`
                      }
                    >
                      Contact Us
                    </NavLink>

                  </div>

                )}

              </div>

            </div>

          </div>

          {/* Right Icons */}

          <div className="flex items-center gap-4">

            <button
              type="button"
              onClick={() => setWishlistOpen(true)}
              aria-label="Open favorites"
              className="relative text-primary hover:text-primary-light hover:scale-110 transition duration-200"
            >
              <Heart size={22} />
              {wishlist.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlist.length > 9 ? '9+' : wishlist.length}
                </span>
              )}
            </button>

            <Link
              to="/ordersmain"
              className="relative text-primary hover:text-primary-light hover:scale-110 transition"
            >
              <Package size={22} />
              {orderCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {orderCount > 9 ? '9+' : orderCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label="Open cart"
              className="relative text-primary hover:text-primary-light hover:scale-110 transition"
            >
              <ShoppingCart size={22} />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {cart.length > 9 ? '9+' : cart.length}
                </span>
              )}
            </button>

            {/* User Dropdown */}

            {user ? (

              <div className="relative" ref={menuRef}>

                <button
                  onClick={() => setUserMenu(!userMenu)}
                  className="w-9 h-9 cursor-pointer rounded-full bg-gradient-to-r from-primary to-primary-light text-white flex items-center justify-center font-semibold shadow-md hover:scale-110 transition"
                >
                  {user.username?.charAt(0).toUpperCase()}
                </button>

                {userMenu && (

                  <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-dropdown">

                    <Link
                      to="/account"
                      className="block px-4 py-3 text-sm hover:bg-gray-100"
                      onClick={() => setUserMenu(false)}
                    >
                      My Account
                    </Link>

                    {user.role === "admin" && (
                      <Link
                        to="admin"
                        className="block px-4 py-3 text-sm hover:bg-gray-100"
                        onClick={() => setUserMenu(false)}
                      >
                        Admin Panel
                      </Link>
                    )}

                    <button
                      onClick={() => setLogoutConfirm(true)}
                      className="w-full cursor-pointer text-left px-4 py-3 text-sm hover:bg-gray-100 text-red-500"
                    >
                      Logout
                    </button>

                  </div>

                )}

              </div>

            ) : (

              <Link to="/login">
                <User className="text-primary hover:text-primary-light transition" />
              </Link>

            )}

            {/* Mobile Menu Button */}

            <button
              onClick={() => setMobileMenu(!mobileMenu)}
              className="md:hidden text-primary"
            >
              {mobileMenu ? <X size={26} /> : <Menu size={26} />}
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
        <div className="fixed inset-0 z-50 md:hidden">

          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenu(false)}
          />

          {/* Drawer */}
          <div className="absolute top-0 left-0 h-full w-[85%] max-w-[340px] bg-white shadow-xl overflow-hidden">

            {/* MENU SCREEN */}
            {!mobileCategory && !mobilePages && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-primary text-white">
                  <h2 className="text-lg font-semibold tracking-wide">Menu</h2>
                  <X
                    size={24}
                    className="cursor-pointer"
                    onClick={() => setMobileMenu(false)}
                  />
                </div>

                {/* Links */}
                <div className="flex flex-col p-5 space-y-3">

                  <NavLink
                    to="/"
                    onClick={() => setMobileMenu(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition
      ${isActive
                        ? "bg-primary text-white shadow"
                        : "bg-gray-100 text-gray-700 hover:bg-primary-light hover:text-white"
                      }`
                    }
                  >
                    <FiHome size={16} />
                    Home
                  </NavLink>

                  <NavLink
                    to="/shop"
                    onClick={() => setMobileMenu(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition
      ${isActive
                        ? "bg-primary text-white shadow"
                        : "bg-gray-100 text-gray-700 hover:bg-primary-light hover:text-white"
                      }`
                    }
                  >
                    <FiShoppingBag size={16} />
                    Shop
                  </NavLink>

                  <button
                    onClick={() => setMobileCategory(true)}
                    className="flex items-center justify-between px-4 py-3 rounded-lg text-sm bg-gray-100 hover:bg-primary-light hover:text-white transition"
                  >
                    <div className="flex items-center gap-3">
                      <FiGrid size={16} />
                      Categories
                    </div>

                    <FiChevronRight size={16} />
                  </button>

                  <button
                    onClick={() => setMobilePages(true)}
                    className="flex items-center justify-between px-4 py-3 rounded-lg text-sm bg-gray-100 hover:bg-primary-light hover:text-white transition"
                  >
                    <div className="flex items-center gap-3">
                      <FiFileText size={16} />
                      Pages
                    </div>

                    <FiChevronRight size={16} />
                  </button>

                </div>
              </>
            )}

            {/* CATEGORY SCREEN */}
            {mobileCategory && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-primary text-white">

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
                    onClick={() => setMobileMenu(false)}
                  />

                </div>

                {/* Category List */}
                <div className="flex flex-col p-5 space-y-3">

                  {categories.map((cat) => (

                    <NavLink
                      key={cat.id}
                      to={`/category/${cat.slug || cat.name}`}
                      onClick={() => setMobileMenu(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-4 py-3 rounded-lg text-sm transition
        ${isActive
                          ? "bg-primary text-white shadow"
                          : "bg-gray-100 text-gray-700 hover:bg-primary-light hover:text-white"
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
                <div className="flex items-center justify-between px-6 py-4 bg-primary text-white">

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
                    onClick={() => setMobileMenu(false)}
                  />

                </div>

                <div className="flex flex-col p-5 space-y-3">

                  <NavLink
                    to="/about"
                    onClick={() => setMobileMenu(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition
      ${isActive
                        ? "bg-primary text-white shadow"
                        : "bg-gray-100 text-gray-700 hover:bg-primary-light hover:text-white"
                      }`
                    }
                  >
                    <FiFileText size={16} />
                    About
                  </NavLink>

                    <NavLink
                    to="/termsandconditions"
                    onClick={() => setMobileMenu(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition
      ${isActive
                        ? "bg-primary text-white shadow"
                        : "bg-gray-100 text-gray-700 hover:bg-primary-light hover:text-white"
                      }`
                    }
                  >
                    <FiFileText size={16} />
                    Terms And Conditions
                  </NavLink>

                    
                  <NavLink
                    to="/contactus"
                    onClick={() => setMobileMenu(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition
      ${isActive
                        ? "bg-primary text-white shadow"
                        : "bg-gray-100 text-gray-700 hover:bg-primary-light hover:text-white"
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