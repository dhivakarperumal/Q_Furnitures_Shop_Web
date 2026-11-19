import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
  Home,
  Info,
  ShoppingBag,
  PhoneCall,
  ChevronRight,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { FaFacebook, FaInstagram, FaPinterestP, FaWhatsapp, FaYoutube } from "react-icons/fa";
import PageContainer from "./PageContainer";
import api from "../../api";
import { categoryHasProducts } from "../../utils/categories";

const Footer = () => {
  const [categories, setCategories] = useState([]);
  const { pathname } = useLocation();
  const noTopMargin = pathname === "/contactus";

  const storePhone = import.meta.env.VITE_STORE_PHONE || "+91 98765 43210";
  const storeEmail = import.meta.env.VITE_STORE_EMAIL || "support@mystore.com";
  const storeAddress = import.meta.env.VITE_STORE_ADDRESS
    || "No. 123, Anna Salai, Chennai - 600002, Tamil Nadu, India";
  const facebookUrl = import.meta.env.VITE_FACEBOOK_URL;
  const instagramUrl = import.meta.env.VITE_INSTAGRAM_URL || "https://www.instagram.com/";
  const youtubeUrl = import.meta.env.VITE_YOUTUBE_URL || "https://www.youtube.com/";
  const pinterestUrl = import.meta.env.VITE_PINTEREST_URL;
  const whatsappNumber = (import.meta.env.VITE_WHATSAPP_NUMBER || "919876543210").replace(/\D/g, "");
  const mapEmbedUrl = import.meta.env.VITE_STORE_MAP_EMBED_URL
    || "https://www.google.com/maps?q=Chennai%2C%20India&output=embed";

  useEffect(() => {
    let isMounted = true;

    const fetchCategories = async () => {
      try {
        const response = await api.get("/categories");
        if (isMounted) {
          setCategories(
            Array.isArray(response.data) ? response.data.filter(categoryHasProducts) : [],
          );
        }
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
    { label: "Combos", to: "/combo", icon: Tag },
    { label: "Contact Us", to: "/contactus", icon: PhoneCall },
    { label: "Privacy Policy", to: "/privacy-policy", icon: ShieldCheck },
  ];

  return (
    <footer className={`${noTopMargin ? "" : "mt-20"} bg-[#2b1a10] text-white`}>
      <div className="h-1.5 bg-gradient-to-r from-primary-dark via-primary to-amber-400" />
      <PageContainer>
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 py-12 sm:grid-cols-2 lg:grid-cols-12">
          <div className="sm:col-span-2 lg:col-span-3">
            <Link to="/" className="mb-5 inline-flex items-center rounded-xl bg-white px-4 py-2">
              <img
                src="/images/logo.png"
                alt="Q Furnitures"
                className="h-9 w-auto max-w-[150px] object-contain"
              />
            </Link>
            <p className="max-w-sm text-justify text-sm leading-7 text-white/70">
              At Q Furnitures, find thoughtfully selected pieces for living, dining, and
              bedroom spaces. Our collection balances everyday comfort, practical function,
              and timeless design to help make your home feel welcoming and distinctly yours.
            </p>
          </div>

          <div className="lg:col-span-2">
            <h2 className="mb-5 text-sm font-bold uppercase tracking-[0.16em] text-amber-300">Quick Links</h2>
            <ul className="space-y-4 text-sm">
              {quickLinks.map(({ label, to, icon: Icon }) => (
                <li key={to}>
                  <Link to={to} className="group flex items-center gap-2 text-white/75 transition hover:text-white">
                    <Icon size={15} className="text-primary-light" />
                    <span className="border-b border-transparent group-hover:border-amber-300">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h2 className="mb-5 text-sm font-bold uppercase tracking-[0.16em] text-amber-300">Categories</h2>
            <ul className="space-y-4 text-sm">
              {categories.slice(0, 6).map((category) => {
                const name = category.name || category.category_name || category.categoryName;
                if (!name) return null;
                return (
                  <li key={category.catId || category.id || name}>
                    <Link
                      to={`/shop?category=${encodeURIComponent(name)}`}
                      onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
                      className="group flex items-center gap-2 text-white/75 transition hover:text-white"
                    >
                      <ChevronRight size={14} className="shrink-0 text-primary-light" />
                      <span>{name}</span>
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
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(storeAddress)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 transition hover:text-white"
              >
                <MapPin size={17} className="shrink-0 text-primary-light" />
                <span>{storeAddress}</span>
              </a>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {facebookUrl && (
                <a href={facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook" className="grid h-9 w-9 place-items-center rounded-full bg-[#1877F2] text-white shadow-sm transition hover:scale-105">
                  <FaFacebook size={20} />
                </a>
              )}
              <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram" className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-tr from-[#FEDA75] via-[#D62976] to-[#4F5BD5] text-white shadow-sm transition hover:scale-105">
                <FaInstagram size={20} />
              </a>
              <a href={youtubeUrl} target="_blank" rel="noreferrer" aria-label="YouTube" className="grid h-9 w-9 place-items-center rounded-full bg-[#FF0000] text-white shadow-sm transition hover:scale-105">
                <FaYoutube size={20} />
              </a>
              {pinterestUrl && (
                <a href={pinterestUrl} target="_blank" rel="noreferrer" aria-label="Pinterest" className="grid h-9 w-9 place-items-center rounded-full bg-[#E60023] text-white shadow-sm transition hover:scale-105">
                  <FaPinterestP size={20} />
                </a>
              )}
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="grid h-9 w-9 place-items-center rounded-full bg-[#25D366] text-white shadow-sm transition hover:scale-105">
                <FaWhatsapp size={20} />
              </a>
              <a href={`mailto:${storeEmail}`} aria-label="Email" className="grid h-9 w-9 place-items-center rounded-full bg-[#EA4335] text-white shadow-sm transition hover:scale-105">
                <Mail size={20} />
              </a>
            </div>
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

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-white/10 py-4 text-center text-xs text-white/55">
          <p className="whitespace-nowrap">© {new Date().getFullYear()} Q Furnitures. All Rights Reserved.</p>
          {/* <p className="whitespace-nowrap">Furniture for every kind of home.</p> */}
          <p className="whitespace-nowrap">Designed by <span className="font-semibold text-white/75">Q-Techx Solutions</span></p>
        </div>
      </PageContainer>
    </footer>
  );
};

export default Footer;
