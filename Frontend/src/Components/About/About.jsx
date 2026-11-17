import {
  Armchair,
  ArrowRight,
  BadgeCheck,
  Eye,
  Headphones,
  HeartHandshake,
  PackageCheck,
  Ruler,
  Sparkles,
  Target,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { resolveMediaUrl } from "../../utils/media";
import PageContainer from "../CommenComponents/PageContainer";
import PageHeader from "../CommenComponents/PageHeader";

const livingRoomImage = resolveMediaUrl("/uploads/banners/1a4fd15f-b369-42f2-9d40-47fcb5d305a2.png");
const storyImage = resolveMediaUrl("/uploads/banners/3050044b-1e64-433a-9d86-6a9524a16c6e.png");

const benefits = [
  {
    icon: BadgeCheck,
    title: "Thoughtful quality",
    description: "Furniture selected for everyday comfort, lasting style, and dependable use.",
  },
  {
    icon: Ruler,
    title: "Made for your space",
    description: "Find practical pieces for the rooms and routines that make a home yours.",
  },
  {
    icon: Truck,
    title: "A smoother delivery",
    description: "Helpful delivery support keeps your furniture journey simple from start to finish.",
  },
  {
    icon: Headphones,
    title: "Here to help",
    description: "Our team is ready to help you choose pieces that feel right for your home.",
  },
];

const steps = [
  ["Explore", "Browse furniture for every room and routine.", Armchair],
  ["Choose", "Find the style, size, and finish that fit your space.", Sparkles],
  ["Order", "Place your order with a few simple steps.", PackageCheck],
  ["Receive", "We will help coordinate delivery to your home.", Truck],
  ["Settle in", "Make yourself comfortable and enjoy your space.", HeartHandshake],
];

const About = () => (
  <>
  <PageHeader title="About Us"  />
  <main className="overflow-hidden bg-[#fffaf4] text-[#351d0e]">
    <section className="py-7 sm:py-9">
      <PageContainer>
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-wide text-[#d9650b] sm:text-sm">About Dhiva Furniture</p>
            <h2 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
              Furniture for <span className="text-[#ef7412]">Better Living</span>
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#594333] sm:text-base">
              Stylish, functional, and comfortable furniture to help every space feel like home.
            </p>
          </div>
          <a
            href="#our-story"
            className="inline-flex items-center gap-2 rounded-full bg-[#ef7412] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#ef7412]/20 transition hover:-translate-y-0.5 hover:bg-[#d9650b]"
          >
            Our Story <ArrowRight size={16} />
          </a>
        </div>
      </PageContainer>
    </section>

    <section id="our-story" className="relative py-14 sm:py-18 lg:py-20">
      <PageContainer>
        <div className="grid items-center gap-9 lg:grid-cols-[1fr_0.95fr] lg:gap-16">
          <div className="relative">
            <div className="absolute -left-7 -top-5 h-24 w-24 rounded-full bg-[#ffe5c7]" />
            <div className="relative h-[260px] overflow-hidden rounded-[36px] rounded-br-[80px] border-[7px] border-white shadow-[0_18px_50px_rgba(74,42,19,0.14)] sm:h-[340px]">
              <img src={storyImage} alt="A warm, thoughtfully furnished living room" loading="lazy" className="h-full w-full object-cover object-center" />
              <div className="absolute bottom-4 left-4 rounded-xl bg-white/90 px-4 py-3 shadow-md backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b735e]">Feel at home</p>
                <p className="mt-0.5 text-sm font-bold text-[#351d0e]">Comfort, made personal</p>
              </div>
            </div>
            <div className="absolute -bottom-5 -right-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#f07816] text-white shadow-lg sm:-right-5 sm:h-20 sm:w-20">
              <Armchair size={34} strokeWidth={1.5} />
            </div>
          </div>

          <div className="lg:py-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a06e46]">A little about us</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#351d0e] sm:text-4xl">
              Our <span className="text-[#ef7412]">Story</span>
            </h2>
            <span className="mt-3 block h-1 w-12 rounded-full bg-[#f07816]" />
            <p className="mt-5 text-sm leading-7 text-[#58483a] sm:text-base">
              We believe a home should feel comfortable, useful, and unmistakably yours. That is why we bring together furniture for living, working, resting, and gathering.
            </p>
            <p className="mt-3 text-sm leading-7 text-[#58483a] sm:text-base">
              From a favourite reading chair to the dining table where everyone meets, our aim is to make it easier to find pieces that belong in your everyday life.
            </p>
            <Link to="/shop" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#d9650b] transition hover:gap-3">
              Explore our collection <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </PageContainer>
    </section>

    <section className="relative isolate overflow-hidden bg-[#462512] py-10 text-white sm:py-12">
      <div className="absolute -right-20 -top-28 -z-10 h-72 w-72 rounded-full border border-white/10" />
      <div className="absolute -bottom-44 left-1/3 -z-10 h-72 w-72 rounded-full border border-white/10" />
      <PageContainer>
        <div className="grid gap-8 md:grid-cols-2 md:divide-x md:divide-white/20">
          <article className="flex gap-4 md:pr-10">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f07816]/15 text-[#ff881c]">
              <Target size={26} />
            </span>
            <div>
              <h2 className="text-lg font-bold">Our Mission</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/75">
                To make thoughtfully designed, comfortable furniture easier to bring into every home.
              </p>
            </div>
          </article>
          <article className="flex gap-4 md:pl-10">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f07816]/15 text-[#ff881c]">
              <Eye size={26} />
            </span>
            <div>
              <h2 className="text-lg font-bold">Our Vision</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/75">
                To be a trusted place to find furniture that feels considered, useful, and right for you.
              </p>
            </div>
          </article>
        </div>
      </PageContainer>
    </section>

    <section className="py-14 sm:py-18 lg:py-20">
      <PageContainer>
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.6fr] lg:items-center lg:gap-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a06e46]">The Dhiva difference</p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-[#351d0e] sm:text-4xl">
              Why Choose <span className="text-[#ef7412]">Dhiva Furniture?</span>
            </h2>
            <span className="mt-3 block h-1 w-12 rounded-full bg-[#f07816]" />
            <p className="mt-4 max-w-sm text-sm leading-7 text-[#725d4b]">
              A thoughtful mix of comfort, practical design, and helpful service for the spaces you live in.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {benefits.map(({ icon: Icon, title, description }) => (
              <article key={title} className="group rounded-2xl border border-[#f0e5d9] bg-white p-5 shadow-[0_8px_24px_rgba(53,29,14,0.04)] transition hover:-translate-y-1 hover:border-[#f5c99f] hover:shadow-[0_14px_30px_rgba(53,29,14,0.08)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0df] text-[#e87500] transition group-hover:bg-[#e87500] group-hover:text-white">
                  <Icon size={22} />
                </span>
                <h3 className="mt-4 text-sm font-bold text-[#351d0e]">{title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-[#806d5d]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </PageContainer>
    </section>

    <section className="pb-14 sm:pb-18 lg:pb-20">
      <PageContainer>
        <div className="grid gap-8 lg:grid-cols-[0.65fr_1.6fr] lg:items-center lg:gap-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a06e46]">From browsing to belonging</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#351d0e] sm:text-4xl">
              Our <span className="text-[#ef7412]">Process</span>
            </h2>
            <ol className="relative mt-6 space-y-4 before:absolute before:bottom-5 before:left-[15px] before:top-5 before:w-px before:bg-[#f4b77f]">
              {steps.map(([title, description, Icon], index) => (
                <li key={title} className="relative flex gap-3">
                  <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#f07816] bg-[#fffaf4] text-[#e87500]">
                    <Icon size={15} />
                  </span>
                  <div className="pt-0.5">
                    <p className="text-sm font-bold text-[#351d0e]">{String(index + 1).padStart(2, "0")} · {title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-[#806d5d]">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="relative min-h-[280px] overflow-hidden rounded-[28px] bg-[#351d0e] sm:min-h-[350px]">
            <img src={storyImage} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-center opacity-55" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#351d0e]/10 via-[#351d0e]/55 to-[#351d0e]/95" />
            <div className="relative flex min-h-[280px] items-end p-6 sm:min-h-[350px] sm:items-center sm:justify-end sm:p-10">
              <div className="max-w-sm text-white">
                <span className="mb-3 block h-1 w-10 rounded-full bg-[#f07816]" />
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Spaces with a little more heart</p>
                <h3 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">
                  Comfort that fits <span className="text-[#ff8a24]">your life.</span>
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/80">
                  Find the pieces that make your home feel more like you.
                </p>
                <Link to="/shop" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#f07816] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#d9650b]">
                  Shop furniture <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>

    <section className="pb-12">
      <PageContainer>
        <div className="relative isolate overflow-hidden rounded-[26px] bg-[#351d0e]">
          <img src={livingRoomImage} alt="" loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#351d0e]/85 via-[#351d0e]/70 to-[#351d0e]/10" />
          <div className="flex min-h-[190px] items-center px-6 py-8 sm:px-10 lg:px-14">
            <div className="max-w-xl text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffc28a]">Make room for what matters</p>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                Let’s create your <span className="text-[#ff8a24]">dream space.</span>
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/80">
                Explore furniture for the moments and people that make a house feel like home.
              </p>
              <Link to="/shop" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#f07816] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#d9650b]">
                Shop now <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  </main>
  </>
);

export default About;
