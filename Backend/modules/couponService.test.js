const test = require("node:test");
const assert = require("node:assert/strict");
const { createCouponService } = require("./couponService");

test("stores selected product and category IDs as JSON", async () => {
  const coupon = {
    id: 5,
    code: "SPRING-10",
    name: "Spring offer",
    description: "",
    discount_type: "percentage",
    discount_value: 10,
    min_order_value: 0,
    start_date: "2026-03-01 09:00:00",
    expiry_date: "2026-04-01 23:59:00",
    usage_limit_global: null,
    usage_limit_per_customer: 1,
    status: "active",
    coupon_scope: "specific_products",
    applicable_product_ids: [2],
    applicable_category_ids: [4],
    applicable_subcategory_ids: [],
  };
  let insertParameters;
  const service = createCouponService({
    async execute(sql, parameters) {
      if (sql.startsWith("INSERT INTO coupons")) {
        insertParameters = parameters;
        return [{ insertId: coupon.id }];
      }
      return [[coupon]];
    },
  });

  assert.deepEqual(await service.create(coupon), coupon);
  assert.deepEqual(JSON.parse(insertParameters[12]), coupon.applicable_product_ids);
  assert.deepEqual(JSON.parse(insertParameters[13]), coupon.applicable_category_ids);
});
