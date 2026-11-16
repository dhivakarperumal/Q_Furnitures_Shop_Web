const test = require("node:test");
const assert = require("node:assert/strict");
const createCouponRouter = require("./couponRouter");
const { normalizeCoupon } = createCouponRouter;

const validCoupon = {
  code: " spring-10 ",
  name: "Spring offer",
  description: "Seasonal discount",
  discount_type: "percentage",
  discount_value: "10",
  min_order_value: "500",
  start_date: "2026-03-01T09:00",
  expiry_date: "2026-04-01T23:59",
  usage_limit_global: "",
  usage_limit_per_customer: "1",
  status: "active",
  coupon_scope: "specific_products",
  applicable_product_ids: [2, 2, "3"],
  applicable_category_ids: [],
  applicable_subcategory_ids: [],
};

test("creates the coupon router with CRUD routes", () => {
  assert.doesNotThrow(() => createCouponRouter({}));
});

test("normalizes coupon values and unique product IDs", () => {
  assert.deepEqual(normalizeCoupon(validCoupon), {
    code: "SPRING-10",
    name: "Spring offer",
    description: "Seasonal discount",
    discount_type: "percentage",
    discount_value: 10,
    min_order_value: 500,
    start_date: "2026-03-01 09:00:00",
    expiry_date: "2026-04-01 23:59:00",
    usage_limit_global: null,
    usage_limit_per_customer: 1,
    usage_count: 0,
    status: "active",
    coupon_scope: "specific_products",
    applicable_product_ids: [2, 3],
    applicable_category_ids: [],
    applicable_subcategory_ids: [],
  });
});

test("rejects invalid discount, date, and selection values", () => {
  assert.throws(() => normalizeCoupon({ ...validCoupon, discount_value: 101 }), { status: 400 });
  assert.throws(() => normalizeCoupon({ ...validCoupon, expiry_date: "2026-02-01T09:00" }), { status: 400 });
  assert.throws(() => normalizeCoupon({ ...validCoupon, start_date: "2026-02-30T09:00" }), { status: 400 });
  assert.throws(() => normalizeCoupon({ ...validCoupon, applicable_product_ids: [] }), { status: 400 });
  assert.throws(() => normalizeCoupon({ ...validCoupon, code: "BAD CODE" }), { status: 400 });
});
