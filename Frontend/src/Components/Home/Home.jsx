import Hero from "./Hero";
import FeaturedProducts from "./FeaturedProducts";
import HomeCategories from "./HomeCategories";
import OfferBanners from "./OfferBanners";
import HomeReviews from "./HomeReviews";

const Home = () => (
  <main className="bg-[#fcfaf7]">
    <Hero />
    <HomeCategories />
    <OfferBanners />
    <FeaturedProducts />
    <HomeReviews />
  </main>
);

export default Home;
