import { ArrowUpRight, Sparkles } from "lucide-react";
import FeaturedProducts from "./FeaturedProducts";
import HomeCategories from "./HomeCategories";

const Home = () => (
  <main className="bg-[#fcfaf7]">
    <section className="relative overflow-hidden bg-[#f4eadc]">
      <div className="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full bg-[#e6c6a5]/40 blur-3xl" />
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:py-24">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d9c4aa] bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8b5a35]">
            <Sparkles size={14} /> Thoughtfully made for living
          </span>
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-[#351d0e] sm:text-5xl lg:text-6xl">
            Make room for a more beautiful home.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#725d4b] sm:text-lg">
            Discover timeless furniture, crafted for the way you live and made to feel at home.
          </p>
          <a
            href="#featured-products"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#351d0e] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#a34720]"
          >
            Explore our collection <ArrowUpRight size={17} />
          </a>
        </div>
        <div className="relative mx-auto flex aspect-[4/3] w-full max-w-xl items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#ddc2a3] via-[#f2e5d5] to-[#c6a487]">
          <div className="absolute inset-5 rounded-[1.5rem] border border-white/50" />
          <div className="relative max-w-xs px-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#79543a]">Q Living</p>
            <p className="mt-4 font-serif text-4xl leading-tight text-[#351d0e] sm:text-5xl">
              Comfort meets character.
            </p>
            <div className="mx-auto mt-6 h-px w-16 bg-[#a06e46]" />
            <p className="mt-4 text-sm text-[#725d4b]">Furniture that makes every moment feel at home.</p>
          </div>
        </div>
      </div>
    </section>

    <HomeCategories />
    <FeaturedProducts />
  </main>
);

export default Home;
