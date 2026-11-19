import { useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Cookie,
  CreditCard,
  Database,
  Globe,
  LockKeyhole,
  Mail,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  UserRoundCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import PageContainer from "./CommenComponents/PageContainer";
import PageHeader from "./CommenComponents/PageHeader";

const policySections = [
  {
    title: "Information We Collect",
    icon: Database,
    points: [
      "Information you provide when creating an account, placing an order, or contacting our team, such as your name, email, phone number, and delivery address.",
      "Order details and preferences needed to manage your purchases and provide support.",
    ],
  },
  {
    title: "How We Use Your Information",
    icon: UserRound,
    points: [
      "To process purchases, coordinate delivery, and provide order updates or customer support.",
      "To maintain and improve our website, products, and services, and to help protect customers and our business.",
    ],
  },
  {
    title: "Product and Browsing Information",
    icon: ShoppingBag,
    points: [
      "We may use basic browsing and interaction data to understand how visitors use the store and improve the shopping experience.",
      "Product details, images, and availability are provided to help you make informed choices before ordering.",
    ],
  },
  {
    title: "Cookies and Similar Technologies",
    icon: Cookie,
    points: [
      "Our website may use cookies or similar technologies to support essential features, remember preferences, and understand site usage.",
      "You can manage cookies through your browser settings. Disabling them may affect some website features.",
    ],
  },
  {
    title: "Payments",
    icon: CreditCard,
    points: [
      "Payment information is used to complete and verify your transaction.",
      "Where payment processing is provided by a third party, that provider handles payment details under its own privacy and security terms.",
    ],
  },
  {
    title: "Orders and Delivery",
    icon: PackageCheck,
    points: [
      "We use your contact and delivery details to confirm orders, arrange delivery, and resolve order-related questions.",
      "Necessary details may be shared with delivery partners for the purpose of fulfilling your order.",
    ],
  },
  {
    title: "When Information May Be Shared",
    icon: Globe,
    points: [
      "We may share relevant information with service providers who help operate the website, process payments, or deliver orders.",
      "Information may also be disclosed when required by law or when needed to protect the rights, safety, and security of customers or our business.",
    ],
  },
  {
    title: "Data Retention",
    icon: RefreshCw,
    points: [
      "We retain information for as long as it is needed to provide our services, manage orders, meet legal obligations, and resolve disputes.",
      "Retention periods may vary depending on the type of information and the reason it was collected.",
    ],
  },
  {
    title: "Keeping Information Secure",
    icon: LockKeyhole,
    points: [
      "We use reasonable safeguards designed to protect personal information from unauthorized access, alteration, or disclosure.",
      "Please keep your account credentials private and contact us if you believe your account may have been accessed without permission.",
    ],
  },
  {
    title: "Your Privacy Choices",
    icon: UserRoundCheck,
    points: [
      "You may contact us to request access to or correction of personal information associated with your account, subject to applicable requirements.",
      "You can opt out of promotional emails using the unsubscribe link in those messages. Service-related communications may still be sent.",
    ],
  },
  {
    title: "Children's Privacy",
    icon: ShieldCheck,
    points: [
      "Our store is intended for a general audience and is not designed to collect personal information from children.",
      "If you believe a child has provided personal information to us, please contact our team so we can review the request.",
    ],
  },
  {
    title: "Updates to This Policy",
    icon: Bell,
    points: [
      "We may update this policy as our services or privacy practices change.",
      "The latest version will be posted on this page with its updated date.",
    ],
  },
  {
    title: "Contact Us",
    icon: Mail,
    points: [
      "For questions or requests about this Privacy Policy or your personal information, please get in touch with our team.",
    ],
    contact: true,
  },
];

export default function PrivacyPolicy() {
  const [activeSection, setActiveSection] = useState(0);

  return (
    <>
      <PageHeader title="Privacy Policy" />
      <main className="min-h-[70vh] bg-[#fffaf4] py-7 text-[#351d0e] sm:py-9">
        <PageContainer>
        <div className="grid items-start gap-4 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-[#f0dfce] bg-white p-3 shadow-[0_8px_24px_rgba(74,42,19,0.06)] lg:sticky lg:top-28">
            <div className="mb-2 flex items-center gap-3 rounded-xl bg-[#fff3e5] px-3 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffe5c7] text-[#d9650b]">
                <ShieldCheck size={19} />
              </span>
              <div>
                <h2 className="text-sm font-extrabold">Quick Navigation</h2>
                <p className="text-[11px] text-[#8b735e]">Browse privacy topics</p>
              </div>
            </div>
            <nav aria-label="Privacy policy sections" className="max-h-[70vh] space-y-0.5 overflow-y-auto">
              {policySections.map((section, index) => (
                <a
                  key={section.title}
                  href={`#privacy-section-${index + 1}`}
                  onClick={() => setActiveSection(index)}
                  className={`group flex min-h-9 items-center justify-between gap-2 border-b border-[#f3ece5] px-2 py-2 text-[11px] transition ${
                    activeSection === index
                      ? "bg-[#fff0df] font-bold text-[#a8470b]"
                      : "text-[#594b40] hover:bg-[#fff8f0] hover:text-[#a8470b]"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 text-[9px] font-bold text-[#c66a22]">{String(index + 1).padStart(2, "0")}</span>
                    <span className="truncate">{section.title}</span>
                  </span>
                  <ChevronRight size={13} className="shrink-0 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </a>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 space-y-2.5">
            <section className="flex flex-col gap-4 rounded-2xl border border-[#f0dfce] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(74,42,19,0.05)] sm:flex-row sm:items-center sm:px-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fff0df] text-[#d9650b]">
                <ShieldCheck size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-extrabold leading-tight sm:text-xl">Your Privacy at Q Furnitures</h1>
                <p className="mt-1 text-xs leading-5 text-[#725d4b] sm:text-[13px]">
                  We respect your privacy. This policy explains what information we collect, how we use it, and the choices available to you when you browse or shop with us.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 border-t border-[#f1e7dc] pt-3 text-[11px] text-[#725d4b] sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                <CalendarDays size={17} className="text-[#d9650b]" />
                <div>
                  <p className="font-bold text-[#351d0e]">Last Updated</p>
                  <p>18 Nov 2026</p>
                </div>
              </div>
            </section>

            {policySections.map(({ title, icon: Icon, points, contact }, index) => (
              <section
                id={`privacy-section-${index + 1}`}
                key={title}
                onMouseEnter={() => setActiveSection(index)}
                className="scroll-mt-28 rounded-2xl border border-[#f0dfce] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(74,42,19,0.04)] transition hover:border-[#edc9a5] sm:px-5"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    <span className="min-w-9 rounded-lg bg-[#ef7412] px-2 py-1 text-center text-[10px] font-extrabold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0df] text-[#d9650b]">
                      <Icon size={18} />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 border-l border-[#f1d8bd] pl-3 sm:pl-4">
                    <h2 className="text-sm font-extrabold sm:text-base">{title}</h2>
                    <ul className="mt-2 space-y-1.5">
                      {points.map((point) => (
                        <li key={point} className="flex gap-2 text-xs leading-5 text-[#594b40] sm:text-[13px]">
                          <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#ef7412]" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                    {contact && (
                      <Link to="/contactus" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#c65a0a] transition hover:gap-2">
                        Contact our team <ChevronRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              </section>
            ))}

            <p className="flex items-center gap-2 px-1 pt-1 text-[11px] text-[#8b735e]">
              <Globe size={14} className="text-[#d9650b]" />
              This policy applies to Q Furnitures website and shopping services.
            </p>
          </div>
        </div>
        </PageContainer>
      </main>
    </>
  );
}
