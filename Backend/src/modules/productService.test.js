const test = require("node:test");
const assert = require("node:assert/strict");
const { createProductService } = require("./productService");

function createMockPool() {
  const queries = [];
  return {
    queries,
    pool: {
      async execute(sql, parameters = []) {
        queries.push({ sql, parameters });
        if (sql.includes("COUNT(*) AS total FROM products p")) {
          return [[{ total: 0 }]];
        }
        if (sql.includes("SELECT COUNT(*) AS total,")) {
          return [[{ total: 0, active: 0, outOfStock: 0, lowStock: 0 }]];
        }
        return [[]];
      },
    },
  };
}

test("filters inventory results by low and out-of-stock levels", async () => {
  for (const [status, expectedClause] of [
    [
      "Low Stock",
      "COALESCE(ps.available_stock, p.total_stock) > 0 AND COALESCE(ps.available_stock, p.total_stock) <= COALESCE(ps.minimum_stock, 5)",
    ],
    ["Out of Stock", "COALESCE(ps.available_stock, p.total_stock) <= 0"],
  ]) {
    const { pool, queries } = createMockPool();
    await createProductService(pool).list({
      page: 1,
      limit: 10,
      status,
      excludeComboProducts: true,
    });

    assert.ok(queries[0].sql.includes(expectedClause));
    assert.match(queries[0].sql, /product_data, '\$\.product_type'/);
  }
});

test("filters inventory results by product status", async () => {
  const { pool, queries } = createMockPool();
  await createProductService(pool).list({
    page: 1,
    limit: 10,
    status: "Inactive",
  });

  assert.match(queries[0].sql, /p\.status = \?/);
  assert.equal(queries[0].parameters[0], "Inactive");
});
