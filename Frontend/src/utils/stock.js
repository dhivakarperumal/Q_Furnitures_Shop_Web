export const getProductStock = (product, variant = null, size = null) => {
  const totalStock = Number(product?.total_stock ?? 0);
  if (totalStock <= 0) return 0;
  if (variant && size && Object.prototype.hasOwnProperty.call(variant.sizesStock || {}, size)) {
    return Math.min(totalStock, Number(variant.sizesStock[size]) || 0);
  }
  if (variant?.stock != null) return Math.min(totalStock, Number(variant.stock) || 0);
  return totalStock;
};
