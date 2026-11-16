import Hero from "./Hero";
import FeaturedProducts from "./FeaturedProducts";
import HomeCategories from "./HomeCategories";
import OfferBanners from "./OfferBanners";

const Home = () => (
  <main className="bg-[#fcfaf7]">
    <Hero />
    <HomeCategories />
    <OfferBanners />
    <FeaturedProducts />
  </main>
);

export default Home;
