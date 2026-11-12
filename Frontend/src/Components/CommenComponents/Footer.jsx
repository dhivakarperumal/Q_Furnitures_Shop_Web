import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Phone,
  MapPin,
  Home,
  Info,
  ShoppingBag,
  PhoneCall,
  Sofa,
  BedDouble,
  Table,
  Lamp
} from "lucide-react";
import { FaFacebook, FaInstagram, FaWhatsapp } from "react-icons/fa";
import PageContainer from "./PageContainer";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="mt-20 bg-secondary text-white">
      <PageContainer>
        <div className="grid grid-cols-1 gap-10 py-12 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <Link to="/" className="mb-4 flex items-center gap-3">
              <img
                src="/images/logo.png"
                alt="Q Furnitures"
                className="h-12 w-auto max-w-[150px] object-contain"
              />
            </Link>
            <p className="text-sm leading-relaxed opacity-90">
              Furnish every room with thoughtfully designed sofas, beds, dining
              furniture, and home accents from Q Furnitures.
            </p>
          </div>

          <div>
            <h2 className="relative mb-4 inline-block border-b border-white/30 pb-2 text-xl font-semibold after:absolute after:-bottom-px after:left-0 after:h-0.5 after:w-1/2 after:bg-yellow-400">Quick Links</h2>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/" className="flex items-center gap-2 transition hover:translate-x-1">
                  <Home size={16} />
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="flex items-center gap-2 transition hover:translate-x-1">
                  <Info size={16} />
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/shop" className="flex items-center gap-2 transition hover:translate-x-1">
                  <ShoppingBag size={16} />
                  Shop Furniture
                </Link>
              </li>
              <li>
                <Link to="/contactus" className="flex items-center gap-2 transition hover:translate-x-1">
                  <PhoneCall size={16} />
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="relative mb-4 inline-block border-b border-white/30 pb-2 text-xl font-semibold after:absolute after:-bottom-px after:left-0 after:h-0.5 after:w-1/2 after:bg-yellow-400">Categories</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 transition hover:translate-x-1">
                <Sofa size={16} />
                Sofas &amp; Living Room
              </li>
              <li className="flex items-center gap-2 transition hover:translate-x-1">
                <BedDouble size={16} />
                Beds &amp; Bedroom
              </li>
              <li className="flex items-center gap-2 transition hover:translate-x-1">
                <Table size={16} />
                Dining Tables &amp; Chairs
              </li>
              <li className="flex items-center gap-2 transition hover:translate-x-1">
                <Lamp size={16} />
                Lighting &amp; Home Decor
              </li>
            </ul>
          </div>

          <div>
            <h2 className="relative mb-4 inline-block border-b border-white/30 pb-2 text-xl font-semibold after:absolute after:-bottom-px after:left-0 after:h-0.5 after:w-1/2 after:bg-yellow-400">Contact Us</h2>
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2">
                <Phone size={16} />
                +91 98765 43210
              </p>
              <p className="flex items-center gap-2">
                <Mail size={16} />
                support@mystore.com
              </p>
              <p className="flex items-center gap-2">
                <MapPin size={16} />
                Chennai, India
              </p>
            </div>
            <div className="mt-5 flex gap-4">
              <FaFacebook className="h-5 w-5 shrink-0 cursor-pointer transition duration-300 hover:scale-110" />
              <FaInstagram className="h-5 w-5 shrink-0 cursor-pointer transition duration-300 hover:scale-110" />
              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noreferrer"
                aria-label="Chat with us on WhatsApp"
                title="WhatsApp"
                className="h-5 w-5 shrink-0 transition duration-300 hover:scale-110"
              >
                <FaWhatsapp className="h-5 w-5" />
              </a>
              <Mail className="h-5 w-5 shrink-0 cursor-pointer transition duration-300 hover:scale-110" />
            </div>
          </div>

          <div>
            <h2 className="relative mb-4 inline-block border-b border-white/30 pb-2 text-xl font-semibold after:absolute after:-bottom-px after:left-0 after:h-0.5 after:w-1/2 after:bg-yellow-400">Stay Connected</h2>
            <p className="mb-4 text-sm leading-relaxed opacity-90">
              Subscribe for new furniture arrivals, home styling ideas, and exclusive offers.
            </p>
            <form onSubmit={handleSubscribe} className="flex items-stretch gap-2">
              <label htmlFor="footer-subscription-email" className="sr-only">Email address</label>
              <input
                id="footer-subscription-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setSubscribed(false);
                }}
                placeholder="Your email address"
                required
                className="min-w-0 flex-1 rounded-lg border border-white/30 bg-white/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/60 focus:border-white"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-primary transition hover:bg-yellow-100"
              >
                Subscribe
              </button>
            </form>
            {subscribed && <p className="mt-2 text-xs text-yellow-200">Thanks for subscribing!</p>}
          </div>
        </div>

        <div className="border-t border-white/30 py-4 text-center text-sm">
          © {new Date().getFullYear()} Q Furnitures. All Rights Reserved.
        </div>
      </PageContainer>
    </footer>
  );
};

export default Footer;
