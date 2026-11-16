const assert = require("node:assert/strict");
const test = require("node:test");
const { createProductService } = require("./productService");

test("lists products using shop filters and an allowlisted price sort", async () => {
  const calls = [];
  const pool = {
    async execute(sql, parameters = []) {
      calls.push({ sql, parameters });
      if (calls.length === 1) return [[], []];
      if (calls.length === 2) return [[{ total: 0 }], []];
      return [[{ total: 0, active: 0, outOfStock: 0, lowStock: 0 }], []];
    },
  };
  const service = createProductService(pool);

  await service.list({
    page: 2,
    limit: 8,
    search: "",
    status: "All",
    category: "Bedroom Furniture",
    material: "Solid Wood",
    color: "Natural Teak",
    minPrice: 10000,
    maxPrice: 60000,
    minRating: 4,
    onSale: true,
    availability: "in-stock",
    sort: "price-low",
  });

  assert.match(calls[0].sql, /p\.category = \?/);
  assert.match(calls[0].sql, /JSON_EXTRACT\(p\.product_data, '\$\.material_type'\)/);
  assert.match(calls[0].sql, /JSON_EXTRACT\(p\.product_data, '\$\.colour'\)/);
  assert.match(calls[0].sql, /COALESCE\(p\.offer_price, p\.selling_price, p\.mrp\) >= \?/);
  assert.match(calls[0].sql, /COALESCE\(p\.offer_price, p\.selling_price, p\.mrp\) <= \?/);
  assert.match(calls[0].sql, /p\.rating >= \?/);
  assert.match(calls[0].sql, /p\.offer > 0/);
  assert.match(calls[0].sql, /COALESCE\(ps\.available_stock, p\.total_stock\) > 0/);
  assert.match(calls[0].sql, /ORDER BY COALESCE\(p\.offer_price, p\.selling_price, p\.mrp\) ASC/);
  assert.deepEqual(calls[0].parameters, [
    "Bedroom Furniture",
    "Solid Wood",
    "Natural Teak",
    10000,
    60000,
    4,
    8,
    8,
  ]);
  assert.deepEqual(calls[1].parameters, calls[0].parameters.slice(0, 6));
});
