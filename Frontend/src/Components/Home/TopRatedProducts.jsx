import HomeProductRail from "./HomeProductRail";
import { sortByRating } from "./homeProductSorters";

export default function TopRatedProducts() {
  return (
    <HomeProductRail
      id="top-rated-products"
      eyebrow="Customer favourites"
      title="Top rated products"
      description="Explore our highest-rated furniture picks."
      emptyMessage="New customer favourites will appear here soon."
      sortProducts={sortByRating}
    />
  );
}
