import Hero from "./Hero";
import FeaturedProducts from "./FeaturedProducts";
import FeaturedCombos from "./FeaturedCombos";
import HomeCategories from "./HomeCategories";
import CustomFurnitureBanner from "./CustomFurnitureBanner";
import OfferProducts from "./OfferProducts";
import OfferBanners from "./OfferBanners";
import HomeReviews from "./HomeReviews";
import TopRatedProducts from "./TopRatedProducts";

const Home = () => (
  <main className="bg-[#fcfaf7]">
    <Hero />
    {/* <StoreBenefits /> */}
    <HomeCategories />
    <FeaturedProducts />
    <CustomFurnitureBanner />
    <OfferBanners />
    <FeaturedCombos />
    <TopRatedProducts />
    <OfferProducts />
    <HomeReviews />
  </main>
);

export default Home;
