import {
  Database,
  LockKeyhole,
  Mail,
  Share2,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import PageContainer from "./CommenComponents/PageContainer";
import PageHeader from "./CommenComponents/PageHeader";

const policySections = [
  {
    icon: UserRound,
    title: "Information We Collect",
    text: "We collect details you provide when creating an account, placing an order, contacting support, or subscribing to updates. This may include your name, email address, phone number, delivery address, and order information.",
  },
  {
    icon: ShoppingBag,
    title: "How We Use Your Information",
    text: "Your information helps us process orders, arrange delivery, provide customer support, improve our furniture catalogue, prevent fraud, and communicate updates or offers you have requested.",
  },
  {
    icon: Database,
    title: "Order and Payment Details",
    text: "We use order and payment information only to complete purchases and related support requests. Sensitive payment data is handled through secure third-party payment providers; we do not store card details on this website.",
  },
  {
    icon: Share2,
    title: "Sharing Your Information",
    text: "We may share limited information with delivery partners, payment providers, and service providers that support our operations. We do not sell your personal information or share it for unrelated marketing.",
  },
  {
    icon: LockKeyhole,
    title: "Data Security",
    text: "We use reasonable technical and organizational safeguards to protect personal information. No internet service can guarantee complete security, so please use a strong password and keep account details private.",
  },
  {
    icon: ShieldCheck,
    title: "Your Privacy Choices",
    text: "You may ask to access, update, or remove eligible personal information by contacting us. You can also unsubscribe from promotional emails using the unsubscribe option included in each message.",
  },
];

export default function PrivacyPolicy() {
  return (
    <>
      <PageHeader title="Privacy Policy" />
      <main className="bg-[#fffaf4] py-12 text-[#351d0e] sm:py-16">
        <PageContainer>
          <div className="mx-auto max-w-5xl">
            <section className="overflow-hidden rounded-3xl border border-[#efdfcf] bg-white shadow-[0_18px_50px_rgba(74,42,19,0.08)]">
              <div className="flex flex-col gap-5 bg-gradient-to-r from-[#fff1de] to-[#fffaf4] px-6 py-8 sm:flex-row sm:items-center sm:px-10">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#ef7412] text-white shadow-lg shadow-orange-200">
                  <ShieldCheck size={32} />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c66a22]">Your information matters</p>
                  <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Privacy Policy</h1>
                  <p className="mt-2 text-sm leading-6 text-[#725d4b]">Last updated: 18 November 2026</p>
                </div>
              </div>

              <div className="px-6 py-8 sm:px-10">
                <p className="max-w-3xl text-sm leading-7 text-[#58483a] sm:text-base">
                  Q Furnitures respects your privacy and is committed to protecting personal information collected through our website and services. This policy explains what we collect, why we collect it, and how we keep it safe.
                </p>

                <div className="mt-8 grid gap-5 md:grid-cols-2">
                  {policySections.map(({ icon: Icon, title, text }) => (
                    <article key={title} className="rounded-2xl border border-[#f0e3d5] bg-[#fffcf8] p-5 transition hover:border-orange-200 hover:shadow-md">
                      <div className="flex items-start gap-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff0df] text-[#df6811]">
                          <Icon size={21} />
                        </span>
                        <div>
                          <h2 className="text-base font-bold">{title}</h2>
                          <p className="mt-2 text-sm leading-6 text-[#725d4b]">{text}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-[#462512] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-bold">Questions about privacy?</h2>
                    <p className="mt-1 text-sm text-white/70">Contact us if you need help with your personal information.</p>
                  </div>
                  <a href="mailto:support@mystore.com" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ef7412] px-5 py-3 text-sm font-bold transition hover:bg-[#d9650b]">
                    <Mail size={16} />
                    Contact Us
                  </a>
                </div>
              </div>
            </section>
          </div>
        </PageContainer>
      </main>
    </>
  );
}
