import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Clock3,
  Headphones,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Phone,
  Ruler,
  Send,
  Shield,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { resolveMediaUrl } from "../../utils/media";
import PageContainer from "../CommenComponents/PageContainer";
import PageHeader from "../CommenComponents/PageHeader";

const heroImage = resolveMediaUrl("/uploads/banners/1a4fd15f-b369-42f2-9d40-47fcb5d305a2.png");
const storeImage = resolveMediaUrl("/uploads/banners/3050044b-1e64-433a-9d86-6a9524a16c6e.png");
const storeAddress = "No. 123, Anna Salai, Chennai - 600002, Tamil Nadu";
const supportEmail = "support@dhivafurniture.com";

/* ─── Contact cards data ─────────────────────────────────── */
const contactItems = [
  {
    icon: Phone,
    title: "Call Us",
    detail: "+91 98765 43210",
    note: "Mon – Sat, 9:00 AM – 7:00 PM",
    href: "tel:+919876543210",
  },
  {
    icon: Mail,
    title: "Email Us",
    detail: supportEmail,
    note: "We'll reply within 24 hours",
    href: `mailto:${supportEmail}`,
  },
  {
    icon: MapPin,
    title: "Visit Our Store",
    detail: storeAddress,
    note: "",
    href: "https://maps.google.com/?q=No.+123,+Anna+Salai,+Chennai+600002",
  },
  {
    icon: Headphones,
    title: "Customer Support",
    detail: "+91 98765 43210",
    note: "Quick assistance for your orders and queries.",
    href: "tel:+919876543210",
  },
];

/* ─── Support service cards ──────────────────────────────── */
const supportServices = [
  {
    icon: Truck,
    title: "Delivery & Order Support",
    desc: "Track your order, get delivery updates and resolve any order related queries quickly.",
  },
  {
    icon: Shield,
    title: "Furniture Care & Warranty",
    desc: "Know about product warranty, care tips and long-term maintenance support.",
  },
  {
    icon: Ruler,
    title: "Custom Furniture Requests",
    desc: "Need a different size, material or design? We can create furniture tailored for you.",
  },
];

/* ─── FAQ data ───────────────────────────────────────────── */
const faqs = [
  {
    icon: Package,
    question: "How long does delivery take?",
    answer:
      "Standard delivery typically takes 7–14 business days depending on your location and the product. Custom furniture orders may take 3–6 weeks. You will receive a tracking link once your order is dispatched.",
  },
  {
    icon: Ruler,
    question: "Can I get a custom size or design for my furniture?",
    answer:
      "Yes! We offer fully customised furniture solutions. You can choose the dimensions, material, finish and design. Use the 'Custom Furniture Requests' option above or contact us directly to discuss your requirements.",
  },
  {
    icon: Shield,
    question: "How do I take care of my furniture to make it last longer?",
    answer:
      "Keep wooden furniture away from direct sunlight and moisture. Wipe surfaces with a soft dry cloth regularly. Use coasters and placemats to avoid scratches. For fabric upholstery, vacuum regularly and treat stains immediately with a mild cleaner.",
  },
];

const mapUrl =
  "https://maps.google.com/maps?q=No.%20123%2C%20Anna%20Salai%2C%20Chennai%20600002&z=15&output=embed";
const directionsUrl =
  "https://maps.google.com/?q=No.+123,+Anna+Salai,+Chennai+600002";

/* ─── Form handler ───────────────────────────────────────── */
function handleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const subject = `Website enquiry: ${formData.get("subject")}`;
  const body = [
    `Name: ${formData.get("name")}`,
    `Email: ${formData.get("email")}`,
    `Phone: ${formData.get("phone") || "Not provided"}`,
    `Subject: ${formData.get("subject")}`,
    "",
    "Message:",
    formData.get("message"),
  ].join("\n");

  window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

/* ─── Sub-components ─────────────────────────────────────── */
function ContactCard({ icon: Icon, title, detail, note, href }) {
  return (
    <a
      href={href}
      target={href.startsWith("https:") ? "_blank" : undefined}
      rel={href.startsWith("https:") ? "noreferrer" : undefined}
      className="flex min-h-[76px] items-center gap-3 rounded-xl bg-[#fbf2e9] p-3 transition hover:bg-[#f8e9d8]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffead4] text-[#ed7010]">
        <Icon size={20} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-extrabold text-[#351d0e]">{title}</span>
        <span className="mt-0.5 block text-xs font-semibold leading-4 text-[#351d0e]">{detail}</span>
        {note && <span className="mt-0.5 block text-[10px] leading-4 text-[#806d5d]">{note}</span>}
      </span>
    </a>
  );
}

function SupportCard({ icon: Icon, title, desc }) {
  return (
    <div className="group flex flex-col gap-3 rounded-2xl border border-[#f2e6da] bg-white p-5 shadow-sm transition hover:shadow-md">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff3e3] text-[#ed7010]">
        <Icon size={22} />
      </span>
      <div>
        <h3 className="text-sm font-extrabold text-[#351d0e]">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-[#594333]">{desc}</p>
      </div>
      <span className="mt-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#fff3e3] text-[#ed7010] transition group-hover:bg-[#ed7010] group-hover:text-white">
        <ArrowRight size={14} />
      </span>
    </div>
  );
}

function FaqItem({ icon: Icon, question, answer, open, onToggle }) {
  return (
    <div className="rounded-xl border border-[#f2e6da] bg-white overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-[#fffaf5]"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff3e3] text-[#ed7010]">
          <Icon size={15} />
        </span>
        <span className="flex-1 text-sm font-bold text-[#351d0e]">{question}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-[#ed7010] transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-4 pt-0 text-xs leading-5 text-[#594333]">{answer}</p>
        </div>
      </div>
    </div>
  );
}

function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState(null);
  return (
    <div className="flex flex-col gap-3">
      {faqs.map((faq, i) => (
        <FaqItem
          key={faq.question}
          {...faq}
          open={openIndex === i}
          onToggle={() => setOpenIndex(openIndex === i ? null : i)}
        />
      ))}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function Contact() {
  return (
    <>
      <PageHeader title="Contact Us" />
      <main className="overflow-hidden bg-[#fffaf5] text-[#351d0e]">


        <PageContainer>

          {/* ── INTERIOR CONSULTATION ───────────────────────── */}
          <section
            className="relative my-8 overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(237,112,16,0.08),0_1px_4px_rgba(53,29,14,0.05)] lg:flex lg:min-h-[300px] lg:items-stretch"
            aria-label="Free interior design consultation"
          >
            {/* Left — full-bleed consultant photo */}
            <div className="relative h-52 w-full shrink-0 lg:h-auto lg:w-[42%]">
              <img
                src={storeImage}
                alt="Interior design consultant"
                className="h-full w-full object-cover object-top"
              />
              {/* slight right-edge fade to blend into light-orange content */}
              <div
                aria-hidden="true"
                className="absolute inset-y-0 right-0 hidden w-10 bg-gradient-to-r from-transparent to-[#fff8f2] lg:block"
              />
            </div>

            {/* Right — content */}
            <div className="relative flex flex-1 flex-col justify-center bg-[#fff8f2] px-6 py-8 sm:px-8 lg:px-10 lg:py-10">

              {/* Orange corner-bracket decoration (top-right) */}
              <span
                aria-hidden="true"
                className="absolute right-0 top-0 h-10 w-10 overflow-hidden"
              >
                <span className="absolute right-0 top-0 h-10 w-[3px] rounded-bl-sm bg-[#ed7010]" />
                <span className="absolute right-0 top-0 h-[3px] w-10 rounded-bl-sm bg-[#ed7010]" />
              </span>

              {/* Badge */}
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#fde8cc] px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#ed7010]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ed7010]" />
                Interior Consultation
              </span>

              {/* Heading */}
              <h2 className="mt-3 text-[1.6rem] font-extrabold leading-tight text-[#1a0f00] sm:text-3xl lg:text-[2rem]">
                Free Interior Design Consultation
              </h2>

              {/* Sub-text — now fills the full right width */}
              <p className="mt-3 text-[11px] leading-6 text-[#594333]">
                Get expert guidance to design a functional, stylish and comfortable space that truly suits your lifestyle and personality. Whether you're furnishing a new home, refreshing a single room, or planning a full makeover — our experienced design consultants are here to help you every step of the way, completely free of charge.
              </p>

              {/* 3-step row */}
              <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-0">

                {/* Step 1 */}
                <div className="flex flex-1 flex-col items-center text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#ed7010] shadow-sm">
                    {/* room/grid icon */}
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1"/>
                      <rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/>
                      <rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                  </span>
                  <p className="mt-2 text-[11px] font-extrabold text-[#1a0f00]">Choose a Room</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-[#9a8070]">Living, Bedroom,<br />Dining and more</p>
                </div>

                {/* Chevron separator */}
                <div className="hidden shrink-0 items-center justify-center pt-5 sm:flex sm:px-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ed7010" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>

                {/* Step 2 */}
                <div className="flex flex-1 flex-col items-center text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#ed7010] shadow-sm">
                    {/* style/palette icon */}
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.69 0 1.25-.56 1.25-1.25 0-.33-.12-.63-.33-.86a1.248 1.248 0 01-.32-.84c0-.69.56-1.25 1.25-1.25H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z"/>
                      <circle cx="6.5" cy="11.5" r="1.5" fill="currentColor" stroke="none"/>
                      <circle cx="9.5" cy="7.5" r="1.5" fill="currentColor" stroke="none"/>
                      <circle cx="14.5" cy="7.5" r="1.5" fill="currentColor" stroke="none"/>
                      <circle cx="17.5" cy="11.5" r="1.5" fill="currentColor" stroke="none"/>
                    </svg>
                  </span>
                  <p className="mt-2 text-[11px] font-extrabold text-[#1a0f00]">Share Your Style</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-[#9a8070]">Tell us your taste,<br />space &amp; budget</p>
                </div>

                {/* Chevron separator */}
                <div className="hidden shrink-0 items-center justify-center pt-5 sm:flex sm:px-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ed7010" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>

                {/* Step 3 */}
                <div className="flex flex-1 flex-col items-center text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#ed7010] shadow-sm">
                    {/* plan/document icon */}
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="8" y1="13" x2="16" y2="13"/>
                      <line x1="8" y1="17" x2="13" y2="17"/>
                    </svg>
                  </span>
                  <p className="mt-2 text-[11px] font-extrabold text-[#1a0f00]">Get Your Plan</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-[#9a8070]">Receive a personalized<br />design suggestion</p>
                </div>

              </div>{/* end 3-step row */}

            </div>{/* end right content */}
          </section>

          {/* ── CONTACT FORM + CONTACT CARDS ────────────────── */}
          <section id="contact-form" className="grid gap-5 py-2 lg:grid-cols-[0.8fr_2fr] lg:gap-6">
            <div>
              <h2 className="mb-3 text-xl font-extrabold">Get in Touch</h2>
              <span className="-mt-2 mb-3 block h-0.5 w-9 rounded-full bg-[#f07816]" />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {contactItems.map((item) => (
                  <ContactCard key={item.title} {...item} />
                ))}
              </div>
            </div>

            <section className="relative isolate overflow-hidden rounded-2xl border border-[#f2e6da] bg-white p-5 shadow-[0_8px_24px_rgba(53,29,14,0.07)] sm:p-6">
              <img
                src={storeImage}
                alt=""
                loading="lazy"
                className="absolute inset-y-0 right-0 -z-10 hidden h-full w-[34%] object-cover object-right lg:block"
                style={{ clipPath: "ellipse(78% 82% at 82% 50%)" }}
              />
              <div className="absolute inset-y-0 right-0 -z-10 hidden w-[38%] bg-gradient-to-r from-white via-white/10 to-transparent lg:block" />
              <div className="lg:w-[70%]">
                <h2 className="text-xl font-extrabold">
                  Send Us a <span className="text-[#ef7412]">Message</span>
                </h2>
                <p className="mt-1 max-w-lg text-xs leading-4 text-[#594333]">
                  Have a question, suggestion or need help? Fill out the form below and our team will get back to you soon.
                </p>
                <form onSubmit={handleSubmit} className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name" className="mb-1 block text-xs font-bold">
                      Your Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Enter your name"
                      required
                      className="h-10 w-full rounded-lg border border-[#e7d8c8] bg-white px-3 text-xs outline-none transition placeholder:text-[#9a8979] focus:border-[#f07816] focus:ring-2 focus:ring-[#f07816]/15"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="mb-1 block text-xs font-bold">
                      Email Address <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email"
                      required
                      className="h-10 w-full rounded-lg border border-[#e7d8c8] bg-white px-3 text-xs outline-none transition placeholder:text-[#9a8979] focus:border-[#f07816] focus:ring-2 focus:ring-[#f07816]/15"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-phone" className="mb-1 block text-xs font-bold">
                      Phone Number
                    </label>
                    <input
                      id="contact-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="Enter your phone number"
                      className="h-10 w-full rounded-lg border border-[#e7d8c8] bg-white px-3 text-xs outline-none transition placeholder:text-[#9a8979] focus:border-[#f07816] focus:ring-2 focus:ring-[#f07816]/15"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-subject" className="mb-1 block text-xs font-bold">
                      Subject <span className="text-red-600">*</span>
                    </label>
                    <select
                      id="contact-subject"
                      name="subject"
                      required
                      defaultValue=""
                      className="h-10 w-full rounded-lg border border-[#e7d8c8] bg-white px-3 text-xs text-[#594333] outline-none transition focus:border-[#f07816] focus:ring-2 focus:ring-[#f07816]/15"
                    >
                      <option value="" disabled>Select a subject</option>
                      <option>Custom furniture</option>
                      <option>Product enquiry</option>
                      <option>Order and delivery</option>
                      <option>Returns and refunds</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="contact-message" className="mb-1 block text-xs font-bold">
                      Your Message <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows="3"
                      placeholder="Type your message here..."
                      required
                      className="w-full resize-y rounded-lg border border-[#e7d8c8] bg-white px-3 py-2.5 text-xs outline-none transition placeholder:text-[#9a8979] focus:border-[#f07816] focus:ring-2 focus:ring-[#f07816]/15"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#f07816] to-[#df5d00] px-5 text-xs font-bold text-white shadow-md shadow-[#e87500]/20 transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e87500] sm:col-span-2"
                  >
                    <Send size={15} />
                    Send Message
                  </button>
                  <p className="text-[10px] text-[#806d5d] sm:col-span-2">
                    Sending opens your email app with your message addressed to {supportEmail}.
                  </p>
                </form>
              </div>
            </section>
          </section>

          {/* ── MORE WAYS TO SUPPORT YOU ─────────────────────── */}
          <section className="my-8" aria-label="More ways to support you">
            <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-widest text-[#ed7010]">
              — How We Can Help You —
            </p>
            <h2 className="text-center text-2xl font-extrabold text-[#351d0e] sm:text-3xl">
              More Ways to Support You
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {supportServices.map((s) => (
                <SupportCard key={s.title} {...s} />
              ))}
            </div>
          </section>

          {/* ── STORE LOCATION ───────────────────────────────── */}
          <section className="grid gap-5 pb-5 lg:grid-cols-[1fr_0.78fr_1fr] lg:items-stretch">
            <img
              src={heroImage}
              alt="Furniture display at the Dhiva Furniture experience center"
              loading="lazy"
              className="h-44 w-full rounded-2xl object-cover object-center shadow-sm sm:h-52 lg:h-full lg:min-h-[190px]"
            />
            <div className="flex flex-col justify-center px-1 py-2">
              <h2 className="text-xl font-extrabold">
                Our Store <span className="text-[#ef7412]">Location</span>
              </h2>
              <span className="mt-1 block h-0.5 w-9 rounded-full bg-[#f07816]" />
              <p className="mt-3 flex gap-2 text-xs leading-5 text-[#594333]">
                <MapPin size={16} className="mt-0.5 shrink-0 text-[#f07816]" />
                <span>{storeAddress}</span>
              </p>
              <p className="mt-2 flex gap-2 text-xs leading-5 text-[#594333]">
                <Clock3 size={16} className="mt-0.5 shrink-0 text-[#f07816]" />
                <span>
                  <strong>Mon – Sat:</strong> 9:00 AM – 7:00 PM
                  <br />
                  <strong>Sunday:</strong> 10:00 AM – 5:00 PM
                </span>
              </p>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex w-fit items-center gap-1 rounded-full border border-[#f07816] px-4 py-2 text-[11px] font-bold text-[#a34720] transition hover:bg-[#fff0df]"
              >
                Get Directions <Navigation size={13} />
              </a>
            </div>
            <div className="relative min-h-[190px] overflow-hidden rounded-2xl border border-[#efe5d9] bg-[#eee8df] shadow-sm">
              <iframe
                title="Map to Dhiva Furniture in Chennai"
                src={mapUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          </section>

          {/* ── FAQ ──────────────────────────────────────────── */}
          <section className="mb-4" aria-label="Frequently asked questions">

            {/* Heading row — full width */}
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#ed7010]">
              — Quick Answers —
            </p>
            <h2 className="text-2xl font-extrabold text-[#351d0e] sm:text-3xl">
              Frequently Asked Questions
            </h2>

            {/* Image + Accordion side-by-side, both starting from same level */}
            <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-start">
              <img
                src={storeImage}
                alt="Cozy furniture"
                loading="lazy"
                className="hidden h-56 w-full rounded-2xl object-cover object-center lg:block"
              />
              <FaqAccordion />
            </div>

          </section>

          {/* ── OTHER WAYS TO REACH US ───────────────────────── */}
          <section
            aria-label="Other ways to reach us"
            className="mb-0 grid gap-3 rounded-2xl bg-[#fbf2e9] p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-center"
          >
            <h2 className="text-base font-extrabold leading-5">
              Other Ways to
              <br />
              Reach Us
            </h2>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 border-[#e4d3c0] px-2 py-1 sm:border-l"
            >
              <MessageCircle size={25} className="shrink-0 text-green-600" />
              <span>
                <strong className="block text-xs">Chat on WhatsApp</strong>
                <span className="text-[10px]">+91 98765 43210</span>
              </span>
            </a>
            <a
              href={`mailto:${supportEmail}`}
              className="flex items-center gap-3 border-[#e4d3c0] px-2 py-1 sm:border-l"
            >
              <Mail size={24} className="shrink-0 text-[#f07816]" />
              <span>
                <strong className="block text-xs">Email Support</strong>
                <span className="text-[10px]">We'll reply within 24 hours</span>
              </span>
            </a>
            <a
              href="tel:+919876543210"
              className="flex items-center gap-3 border-[#e4d3c0] px-2 py-1 sm:border-l"
            >
              <CalendarDays size={24} className="shrink-0 text-[#f07816]" />
              <span>
                <strong className="block text-xs">Book a Consultation</strong>
                <span className="text-[10px]">Get expert guidance for your space</span>
              </span>
            </a>
          </section>
        </PageContainer>

        {/* ── PLANNING A HOME MAKEOVER CTA ─────────────────── */}
        <section
          className="relative overflow-hidden bg-[#2a1500] py-8 mt-6 text-white"
          aria-label="Planning a home makeover"
        >
          {/* Background image */}
          <img
            src={heroImage}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-25"
          />
          {/* Gradient overlay */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-[#2a1500]/90 via-[#2a1500]/70 to-transparent"
          />
          <PageContainer className="relative z-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">Planning a Home Makeover?</h2>
              <p className="mt-1 max-w-sm text-sm leading-5 text-white/75">
                Let our design experts help you choose the right furniture and layout for your space.
              </p>
            </div>
            <a
              href="#contact-form"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#ed7010] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#ed7010]/30 transition hover:bg-[#c95e00]"
            >
              Book a Consultation <ArrowRight size={15} />
            </a>
          </PageContainer>
        </section>
      </main>
    </>
  );
}
