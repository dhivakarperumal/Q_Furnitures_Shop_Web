import React from "react";
import {
  Phone,
  Mail,
  Truck,
  Tag,
  ShoppingBag
} from "lucide-react";
import { FaFacebook, FaInstagram } from "react-icons/fa";
import PageContainer from "./PageContainer";

const Header = () => {
  return (
    <div className="hidden bg-gradient-to-r from-primary via-secondary to-primary-dark text-sm text-white md:block">

      <PageContainer>

        <div className="flex items-center justify-between py-1">

          {/* Left - Contact */}
          <div className="flex items-center gap-4 font-medium">
            <a href="tel:+919876543210" className="flex items-center gap-2 whitespace-nowrap">
              <Phone size={18} />
              <span>+91 98765 43210</span>
            </a>
            <a href="mailto:support@mystore.com" className="flex items-center gap-2 whitespace-nowrap">
              <Mail size={16} />
              <span>support@mystore.com</span>
            </a>
          </div>

          {/* Center - Marquee Offers */}
          <div className="flex-1 overflow-hidden px-10 text-center">
            <marquee className="w-full">
              <div className="flex items-center justify-center gap-12 font-medium">
                <span className="flex items-center gap-2">
                  <Tag size={16} />
                  Make your home feel like yours with Q Furnitures
                </span>
                <span className="flex items-center gap-2">
                  <Truck size={16} />
                  Furniture for every room and every routine
                </span>
                <span className="flex items-center gap-2">
                  <ShoppingBag size={16} />
                  Explore home and office furniture
                </span>
              </div>
            </marquee>
          </div>

          {/* Right - Social Icons */}
          <div className="flex items-center gap-4">

            <FaFacebook
              className="h-5 w-5 shrink-0 cursor-pointer transition hover:scale-110"
            />

            <FaInstagram
              className="h-5 w-5 shrink-0 cursor-pointer transition hover:scale-110"
            />

            <Mail
              className="h-5 w-5 shrink-0 cursor-pointer transition hover:scale-110"
            />

            {/* WhatsApp */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 shrink-0 cursor-pointer transition hover:scale-110"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M20.52 3.48A11.78 11.78 0 0012.02 0C5.38 0 .02 5.36.02 12c0 2.11.55 4.18 1.59 6L0 24l6.18-1.61A11.93 11.93 0 0012.02 24c6.64 0 12-5.36 12-12 0-3.2-1.25-6.21-3.5-8.52zM12.02 21.82c-1.8 0-3.55-.48-5.08-1.39l-.36-.21-3.67.96.98-3.58-.23-.37a9.77 9.77 0 01-1.5-5.23c0-5.42 4.41-9.84 9.86-9.84 2.63 0 5.1 1.03 6.96 2.88a9.78 9.78 0 012.89 6.96c0 5.43-4.41 9.84-9.85 9.84zm5.4-7.38c-.29-.15-1.71-.84-1.97-.94-.26-.1-.45-.15-.64.15-.19.29-.73.94-.9 1.13-.16.19-.33.21-.62.07-.29-.15-1.24-.46-2.37-1.46-.88-.79-1.47-1.76-1.64-2.06-.17-.29-.02-.45.13-.6.13-.13.29-.33.43-.5.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.15-.64-1.54-.88-2.11-.23-.56-.46-.49-.64-.5-.17-.01-.36-.01-.55-.01-.19 0-.5.07-.76.36-.26.29-1 1-.99 2.43 0 1.43 1.03 2.8 1.17 3 .15.19 2.02 3.09 4.89 4.33.68.29 1.2.46 1.61.59.68.22 1.3.19 1.79.12.55-.08 1.71-.7 1.95-1.38.24-.68.24-1.26.17-1.38-.07-.12-.26-.19-.55-.34z" />
            </svg>

          </div>

        </div>

      </PageContainer>

    </div>
  );
};

export default Header;