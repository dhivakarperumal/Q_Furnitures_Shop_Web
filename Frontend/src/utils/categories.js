export function categoryHasProducts(category) {
  return Number(category?.productCount ?? category?.product_count) > 0;
}
