import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import PageContainer from "../CommenComponents/PageContainer";

const contactOptions = [
  {
    icon: Phone,
    title: "Call us",
    detail: "+91 98765 43210",
    href: "tel:+919876543210",
  },
  {
    icon: Mail,
    title: "Email us",
    detail: "support@mystore.com",
    href: "mailto:support@mystore.com",
  },
  {
    icon: MapPin,
    title: "Visit us",
    detail: "Chennai, India",
  },
];

export default function Contact() {
  return (
    <main className="bg-[#fffaf4] py-14 text-[#351d0e] sm:py-20">
      <PageContainer>
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a06e46]">We’re here to help</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Contact <span className="text-[#ef7412]">Us</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#725d4b] sm:text-base">
            Have a question about choosing furniture or placing an order? Get in touch with our team.
          </p>
        </section>

        <section aria-label="Contact information" className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
          {contactOptions.map(({ icon: Icon, title, detail, href }) => {
            const content = (
              <>
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0df] text-[#e87500]">
                  <Icon size={22} />
                </span>
                <h2 className="mt-4 font-bold">{title}</h2>
                <p className="mt-1 text-sm text-[#725d4b]">{detail}</p>
              </>
            );

            return (
              <article key={title} className="rounded-2xl border border-[#f0e5d9] bg-white p-6 text-center shadow-[0_8px_24px_rgba(53,29,14,0.04)]">
                {href ? (
                  <a href={href} className="block rounded-lg outline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ef7412]">
                    {content}
                  </a>
                ) : content}
              </article>
            );
          })}
        </section>

        <section className="mx-auto mt-10 flex max-w-5xl flex-col items-center justify-between gap-5 rounded-2xl bg-[#351d0e] p-6 text-center text-white sm:flex-row sm:p-8 sm:text-left">
          <div>
            <h2 className="text-xl font-bold">Prefer messaging?</h2>
            <p className="mt-1 text-sm text-white/75">Chat with us on WhatsApp and we’ll be happy to help.</p>
          </div>
          <a
            href="https://wa.me/919876543210"
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#f07816] px-5 py-3 text-sm font-bold transition hover:bg-[#d9650b]"
          >
            <MessageCircle size={17} />
            Message us
          </a>
        </section>

        <div className="mt-8 text-center">
          <Link to="/shop" className="text-sm font-bold text-[#d9650b] hover:underline">
            Browse our furniture
          </Link>
        </div>
      </PageContainer>
    </main>
  );
}
