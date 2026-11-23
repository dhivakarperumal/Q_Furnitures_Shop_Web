export const BUY_NOW_STORAGE_KEY = "qf_buy_now_item";

export function openBuyNowCheckout(navigate, item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;

  const quantity = Number(item.quantity);
  if (!Number.isSafeInteger(quantity) || quantity < 1) return false;

  const buyNowItem = {
    ...item,
    quantity,
  };

  sessionStorage.setItem(BUY_NOW_STORAGE_KEY, JSON.stringify(buyNowItem));
  navigate("/checkout", { state: { buyNowItem } });
  return true;
}
