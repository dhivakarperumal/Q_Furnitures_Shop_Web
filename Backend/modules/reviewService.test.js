const test = require("node:test");
const assert = require("node:assert/strict");
const { createReviewService } = require("./reviewService");

test("lists filtered reviews with unfiltered summary statistics", async () => {
  const review = { id: 3, user_name: "Sana", product_name: "Desk" };
  const stats = { total_reviews: 5, average_rating: 4.2, pending_count: 2 };
  const calls = [];
  const pool = {
    async execute(sql, parameters = []) {
      calls.push({ sql, parameters });
      return sql.includes("COUNT(*) AS total_reviews")
        ? [[stats]]
        : [[review]];
    },
  };
  const service = createReviewService(pool);

  assert.deepEqual(await service.list({
    status: "Pending",
    rating: 5,
    search: "Sana",
  }), { reviews: [review], stats });
  assert.deepEqual(calls[0].parameters, ["Pending", 5, "%Sana%", "%Sana%", "%Sana%", "%Sana%"]);
  assert.equal(calls[1].parameters.length, 0);
});
