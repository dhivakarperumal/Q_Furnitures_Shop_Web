import HomeProductRail from "./HomeProductRail";
import { sortByDiscount } from "./homeProductSorters";

export default function OfferProducts() {
  return (
    <HomeProductRail
      id="offer-products"
      eyebrow="Limited-time deals"
      title="Best offers"
      description="Shop the biggest discounts, with the highest offers shown first."
      emptyMessage="New furniture offers will appear here soon."
      sortProducts={sortByDiscount}
    />
  );
}
