import Hero from "./Hero";
import FeaturedProducts from "./FeaturedProducts";
import FeaturedCombos from "./FeaturedCombos";
import HomeCategories from "./HomeCategories";
import CustomFurnitureBanner from "./CustomFurnitureBanner";
import FestiveSaleBanner from "./FestiveSaleBanner";
import ShopByRoom from "./ShopByRoom";
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
    <OfferBanners />
    <ShopByRoom />
    <FeaturedCombos />
    <CustomFurnitureBanner />
    <TopRatedProducts />
    <OfferProducts />
    <FestiveSaleBanner />
    <HomeReviews />
  </main>
);

export default Home;
