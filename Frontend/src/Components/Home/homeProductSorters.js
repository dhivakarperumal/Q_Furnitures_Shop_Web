const getDiscountPercent = (product) => {
  const mrp = Number(product.mrp) || 0;
  const price = Number(product.offer_price ?? product.selling_price ?? product.mrp) || 0;
  return mrp > price ? ((mrp - price) / mrp) * 100 : 0;
};

export const sortByRating = (products) => [...products].sort((first, second) =>
  (Number(second.rating) || 0) - (Number(first.rating) || 0) ||
  getDiscountPercent(second) - getDiscountPercent(first),
);

export const sortByDiscount = (products) => products
  .filter((product) => getDiscountPercent(product) > 0)
  .sort((first, second) =>
    getDiscountPercent(second) - getDiscountPercent(first) ||
    (Number(second.rating) || 0) - (Number(first.rating) || 0),
  );
