import Hero from "./Hero";
import FeaturedProducts from "./FeaturedProducts";
import HomeCategories from "./HomeCategories";

const Home = () => (
  <main className="bg-[#fcfaf7]">
    <Hero />
    <HomeCategories />
    <FeaturedProducts />
  </main>
);

export default Home;
