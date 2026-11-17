import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Headphones,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Send,
} from "lucide-react";
import { Link } from "react-router-dom";
import { resolveMediaUrl } from "../../utils/media";
import PageContainer from "../CommenComponents/PageContainer";

const heroImage = resolveMediaUrl("/uploads/banners/1a4fd15f-b369-42f2-9d40-47fcb5d305a2.png");
const storeImage = resolveMediaUrl("/uploads/banners/3050044b-1e64-433a-9d86-6a9524a16c6e.png");
const storeAddress = "No. 123, Anna Salai, Chennai - 600002, Tamil Nadu";
const supportEmail = "support@dhivafurniture.com";

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
    note: "We’ll reply within 24 hours",
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

const mapUrl = "https://maps.google.com/maps?q=No.%20123%2C%20Anna%20Salai%2C%20Chennai%20600002&z=15&output=embed";
const directionsUrl = "https://maps.google.com/?q=No.+123,+Anna+Salai,+Chennai+600002";

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

  window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

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

export default function Contact() {
  return (
    <main className="overflow-hidden bg-[#fffaf5] text-[#351d0e]">
      <section className="relative isolate min-h-[190px] overflow-hidden bg-[#f3e5d7] sm:min-h-[220px]">
        <img src={heroImage} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#fff8f0] via-[#fff8f0]/95 to-[#fff8f0]/10" />
        <PageContainer>
          <div className="flex min-h-[190px] items-center py-7 sm:min-h-[220px]">
            <div className="max-w-md">
              <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-2 text-xs text-[#725d4b]">
                <Link to="/" className="hover:text-[#e87500]">Home</Link>
                <ChevronRight size={13} />
                <span aria-current="page">Contact Us</span>
              </nav>
              <span className="mb-2 block h-0.5 w-9 rounded-full bg-[#f07816]" />
              <h1 className="text-4xl font-extrabold leading-none tracking-tight sm:text-5xl">
                Contact <span className="text-[#ef7412]">Us</span>
              </h1>
              <p className="mt-2 max-w-xs text-sm font-medium leading-5 text-[#351d0e]">
                We’re here to help you with your furniture needs.
              </p>
            </div>
          </div>
        </PageContainer>
      </section>

      <PageContainer>
        <section className="grid gap-5 py-5 lg:grid-cols-[0.8fr_2fr] lg:gap-6">
          <div>
            <h2 className="mb-3 text-xl font-extrabold">Get in Touch</h2>
            <span className="-mt-2 mb-3 block h-0.5 w-9 rounded-full bg-[#f07816]" />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {contactItems.map((item) => <ContactCard key={item.title} {...item} />)}
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
                  <label htmlFor="contact-name" className="mb-1 block text-xs font-bold">Your Name <span className="text-red-600">*</span></label>
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
                  <label htmlFor="contact-email" className="mb-1 block text-xs font-bold">Email Address <span className="text-red-600">*</span></label>
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
                  <label htmlFor="contact-phone" className="mb-1 block text-xs font-bold">Phone Number</label>
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
                  <label htmlFor="contact-subject" className="mb-1 block text-xs font-bold">Subject <span className="text-red-600">*</span></label>
                  <select
                    id="contact-subject"
                    name="subject"
                    required
                    defaultValue=""
                    className="h-10 w-full rounded-lg border border-[#e7d8c8] bg-white px-3 text-xs text-[#594333] outline-none transition focus:border-[#f07816] focus:ring-2 focus:ring-[#f07816]/15"
                  >
                    <option value="" disabled>Select a subject</option>
                    <option>Product enquiry</option>
                    <option>Order and delivery</option>
                    <option>Returns and refunds</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="contact-message" className="mb-1 block text-xs font-bold">Your Message <span className="text-red-600">*</span></label>
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

        <section className="grid gap-5 pb-5 lg:grid-cols-[1fr_0.78fr_1fr] lg:items-stretch">
          <img
            src={heroImage}
            alt="Furniture display at the Dhiva Furniture experience center"
            loading="lazy"
            className="h-44 w-full rounded-2xl object-cover object-center shadow-sm sm:h-52 lg:h-full lg:min-h-[190px]"
          />
          <div className="flex flex-col justify-center px-1 py-2">
            <h2 className="text-xl font-extrabold">Our Store <span className="text-[#ef7412]">Location</span></h2>
            <span className="mt-1 block h-0.5 w-9 rounded-full bg-[#f07816]" />
            <p className="mt-3 flex gap-2 text-xs leading-5 text-[#594333]">
              <MapPin size={16} className="mt-0.5 shrink-0 text-[#f07816]" />
              <span>{storeAddress}</span>
            </p>
            <p className="mt-2 flex gap-2 text-xs leading-5 text-[#594333]">
              <Clock3 size={16} className="mt-0.5 shrink-0 text-[#f07816]" />
              <span><strong>Mon – Sat:</strong> 9:00 AM – 7:00 PM<br /><strong>Sunday:</strong> 10:00 AM – 5:00 PM</span>
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

        <section aria-label="Other ways to reach us" className="mb-5 grid gap-3 rounded-2xl bg-[#fbf2e9] p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-center">
          <h2 className="text-base font-extrabold leading-5">Other Ways to<br />Reach Us</h2>
          <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" className="flex items-center gap-3 border-[#e4d3c0] px-2 py-1 sm:border-l">
            <MessageCircle size={25} className="shrink-0 text-green-600" />
            <span><strong className="block text-xs">Chat on WhatsApp</strong><span className="text-[10px]">+91 98765 43210</span></span>
          </a>
          <a href={`mailto:${supportEmail}`} className="flex items-center gap-3 border-[#e4d3c0] px-2 py-1 sm:border-l">
            <Mail size={24} className="shrink-0 text-[#f07816]" />
            <span><strong className="block text-xs">Email Support</strong><span className="text-[10px]">We’ll reply within 24 hours</span></span>
          </a>
          <a href="tel:+919876543210" className="flex items-center gap-3 border-[#e4d3c0] px-2 py-1 sm:border-l">
            <CalendarDays size={24} className="shrink-0 text-[#f07816]" />
            <span><strong className="block text-xs">Book a Consultation</strong><span className="text-[10px]">Get expert guidance for your space</span></span>
          </a>
        </section>
      </PageContainer>
    </main>
  );
}
