import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
  Home,
  Info,
  ShoppingBag,
  PhoneCall,
  ChevronRight,
} from "lucide-react";
import { FaFacebook, FaInstagram, FaWhatsapp } from "react-icons/fa";
import PageContainer from "./PageContainer";
import api from "../../api";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [categories, setCategories] = useState([]);

  const storePhone = import.meta.env.VITE_STORE_PHONE || "+91 98765 43210";
  const storeEmail = import.meta.env.VITE_STORE_EMAIL || "support@mystore.com";
  const storeAddress = import.meta.env.VITE_STORE_ADDRESS || "Chennai, India";
  const facebookUrl = import.meta.env.VITE_FACEBOOK_URL;
  const instagramUrl = import.meta.env.VITE_INSTAGRAM_URL;
  const whatsappNumber = (import.meta.env.VITE_WHATSAPP_NUMBER || "919876543210").replace(/\D/g, "");
  const mapEmbedUrl = import.meta.env.VITE_STORE_MAP_EMBED_URL
    || "https://www.google.com/maps?q=Chennai%2C%20India&output=embed";

  useEffect(() => {
    let isMounted = true;

    const fetchCategories = async () => {
      try {
        const response = await api.get("/categories");
        if (isMounted) setCategories(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error loading footer categories:", error);
      }
    };

    fetchCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  const quickLinks = [
    { label: "Home", to: "/", icon: Home },
    { label: "About Us", to: "/about", icon: Info },
    { label: "Shop Furniture", to: "/shop", icon: ShoppingBag },
    { label: "Contact Us", to: "/contactus", icon: PhoneCall },
  ];

  const handleSubscribe = (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="mt-20 bg-[#2b1a10] text-white">
      <div className="h-1.5 bg-gradient-to-r from-primary-dark via-primary to-amber-400" />
      <PageContainer>
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 py-12 sm:grid-cols-2 lg:grid-cols-12">
          <div className="sm:col-span-2 lg:col-span-3">
            <Link to="/" className="mb-5 inline-flex items-center rounded-xl bg-white px-4 py-2">
              <img
                src="/images/logo.png"
                alt="Q Furnitures"
                className="h-12 w-auto max-w-[150px] object-contain"
              />
            </Link>
            <p className="max-w-sm text-sm leading-7 text-white/70">
              Thoughtfully selected furniture for every room, designed to bring comfort,
              style, and lasting quality to your home.
            </p>
          </div>

          <div className="lg:col-span-2">
            <h2 className="mb-5 text-sm font-bold uppercase tracking-[0.16em] text-amber-300">Quick Links</h2>
            <ul className="space-y-3 text-sm">
              {quickLinks.map(({ label, to, icon: Icon }) => (
                <li key={to}>
                  <Link to={to} className="group flex items-center gap-2 text-white/75 transition hover:text-white">
                    <Icon size={15} className="text-primary-light" />
                    <span className="border-b border-transparent pb-0.5 group-hover:border-amber-300">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h2 className="mb-5 text-sm font-bold uppercase tracking-[0.16em] text-amber-300">Categories</h2>
            <ul className="space-y-3 text-sm">
              {categories.slice(0, 6).map((category) => {
                const name = category.name || category.category_name || category.categoryName;
                if (!name) return null;
                return (
                  <li key={category.catId || category.id || name}>
                    <Link
                      to={`/shop?category=${encodeURIComponent(name)}`}
                      className="group flex items-center justify-between gap-2 text-white/75 transition hover:text-white"
                    >
                      <span>{name}</span>
                      <ChevronRight size={14} className="shrink-0 text-primary-light transition group-hover:translate-x-1" />
                    </Link>
                  </li>
                );
              })}
              {categories.length === 0 && (
                <li>
                  <Link to="/shop" className="text-white/75 transition hover:text-white">View all furniture</Link>
                </li>
              )}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h2 className="mb-5 text-sm font-bold uppercase tracking-[0.16em] text-amber-300">Stay in Touch</h2>
            <div className="space-y-3 text-sm text-white/75">
              <a href={`tel:${storePhone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-3 transition hover:text-white">
                <Phone size={17} className="text-primary-light" />
                {storePhone}
              </a>
              <a href={`mailto:${storeEmail}`} className="flex items-center gap-3 transition hover:text-white">
                <Mail size={17} className="text-primary-light" />
                {storeEmail}
              </a>
              <p className="flex items-center gap-3">
                <MapPin size={17} className="shrink-0 text-primary-light" />
                {storeAddress}
              </p>
            </div>

            <div className="mt-5 flex items-center gap-2">
              {facebookUrl && (
                <a href={facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/75 transition hover:border-primary hover:bg-primary hover:text-white">
                  <FaFacebook size={16} />
                </a>
              )}
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/75 transition hover:border-primary hover:bg-primary hover:text-white">
                  <FaInstagram size={16} />
                </a>
              )}
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/75 transition hover:border-primary hover:bg-primary hover:text-white">
                <FaWhatsapp size={16} />
              </a>
              <a href={`mailto:${storeEmail}`} aria-label="Email" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/75 transition hover:border-primary hover:bg-primary hover:text-white">
                <Mail size={16} />
              </a>
            </div>

            <form onSubmit={handleSubscribe} className="mt-6 flex items-stretch">
              <label htmlFor="footer-subscription-email" className="sr-only">Email address</label>
              <input
                id="footer-subscription-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setSubscribed(false);
                }}
                placeholder="Enter your email"
                required
                className="min-w-0 flex-1 rounded-l-lg border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/50 focus:border-amber-300"
              />
              <button type="submit" className="rounded-r-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark">
                Join
              </button>
            </form>
            {subscribed && <p className="mt-2 text-xs text-amber-300">Thanks for subscribing!</p>}
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <h2 className="mb-5 text-sm font-bold uppercase tracking-[0.16em] text-amber-300">Our Location</h2>
            <div className="overflow-hidden rounded-xl border border-white/15 bg-white/5 p-1.5">
              <iframe
                src={mapEmbedUrl}
                title="Q Furnitures store location"
                className="h-52 w-full rounded-lg border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-2 border-t border-white/10 py-5 text-center text-xs text-white/55 sm:flex-row">
          <p>© {new Date().getFullYear()} Q Furnitures. All Rights Reserved.</p>
          <p>Furniture for every kind of home.</p>
        </div>
      </PageContainer>
    </footer>
  );
};

export default Footer;
