const test = require("node:test");
const assert = require("node:assert/strict");
const { createFavoriteService } = require("./favoriteService");

test("lists product and combo favorites as distinct entries", async () => {
  const pool = {
    async execute(sql) {
      if (sql.includes("FROM `wishlist`")) {
        return [[{
          product_id: 7,
          product_name: "Oak Chair",
          offer_price: 120,
          created_at: new Date("2026-11-16T10:00:00Z"),
        }]];
      }
      if (sql.includes("FROM combo_favorites")) {
        return [[{
          combo_id: 7,
          combo_code: "QFC-00007",
          name: "Dining Set",
          category: "Dining",
          subcategory: "",
          mrp: 500,
          offer_price: 450,
          selling_price: 450,
          rating: 5,
          status: "Active",
          combo_data: JSON.stringify({ images: ["/uploads/dining-set.jpg"], combo_items: [] }),
          created_at: new Date("2026-11-17T10:00:00Z"),
        }]];
      }
      throw new Error(`Unexpected favorite query: ${sql}`);
    },
  };

  const favorites = await createFavoriteService(pool).listByUser("customer-1");

  assert.equal(favorites.length, 2);
  assert.equal(favorites[0].item_type, "combo");
  assert.equal(favorites[0].id, "combo-7");
  assert.equal(favorites[0].combo_id, 7);
  assert.equal(favorites[0].image, "/uploads/dining-set.jpg");
  assert.equal(favorites[1].item_type, "product");
  assert.equal(favorites[1].product_id, 7);
});

test("adds only active combos and removes the user's combo favorite", async () => {
  const statements = [];
  const pool = {
    async execute(sql, params) {
      statements.push({ sql, params });
      if (sql.startsWith("SELECT id FROM combos")) return [[{ id: 12 }]];
      if (sql.startsWith("DELETE FROM combo_favorites")) return [{ affectedRows: 1 }];
      return [{}];
    },
  };
  const favorites = createFavoriteService(pool);

  assert.equal(await favorites.addCombo("customer-1", 12), true);
  assert.equal(await favorites.removeCombo("customer-1", 12), true);
  assert.match(statements[1].sql, /INSERT INTO combo_favorites/);
  assert.deepEqual(statements[1].params, ["customer-1", 12]);
  assert.deepEqual(statements[2].params, ["customer-1", 12]);
});

test("does not save a missing or inactive combo", async () => {
  let inserted = false;
  const pool = {
    async execute(sql) {
      if (sql.startsWith("SELECT id FROM combos")) return [[]];
      inserted = true;
      return [{}];
    },
  };

  assert.equal(await createFavoriteService(pool).addCombo("customer-1", 404), false);
  assert.equal(inserted, false);
});
