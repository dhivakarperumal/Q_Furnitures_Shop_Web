const test = require("node:test");
const assert = require("node:assert/strict");
const { createReviewService } = require("./reviewService");

test("lists only public review fields for the latest published reviews", async () => {
  const reviews = [{ id: 3, user_name: "Sana", rating: 5, comment: "Great", product_name: "Desk" }];
  let query;
  const service = createReviewService({
    async execute(sql) {
      query = sql;
      return [reviews];
    },
  });

  assert.deepEqual(await service.listPublished(), reviews);
  assert.match(query, /WHERE reviews\.status = 'Published'/);
  assert.match(query, /LIMIT 6/);
  assert.doesNotMatch(query, /user_email/);
});

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
  assert.deepEqual(calls[0].parameters, ["Pending", 5, "%Sana%", "%Sana%", "%Sana%", "%Sana%", "%Sana%"]);
  assert.equal(calls[1].parameters.length, 0);
});

test("lists published reviews for one product and checks that customer's review", async () => {
  const reviews = [{ id: 8, product_id: 12, user_name: "Sana", rating: 5 }];
  const ownReview = { id: 9, status: "Pending" };
  const calls = [];
  const service = createReviewService({
    async execute(sql, parameters = []) {
      calls.push({ sql, parameters });
      return [sql.includes("reviewer_user_id") ? [ownReview] : reviews];
    },
  });

  assert.deepEqual(await service.listPublishedForProduct(12), reviews);
  assert.deepEqual(await service.getCustomerReview(12, 42), ownReview);
  assert.match(calls[0].sql, /reviews\.product_id = \?/);
  assert.match(calls[0].sql, /reviews\.status = 'Published'/);
  assert.deepEqual(calls[0].parameters, [12]);
  assert.deepEqual(calls[1].parameters, [12, 42]);
});

test("lists published reviews for one combo and checks that customer's review", async () => {
  const reviews = [{ id: 8, combo_id: 12, user_name: "Sana", rating: 5 }];
  const ownReview = { id: 9, status: "Pending" };
  const calls = [];
  const service = createReviewService({
    async execute(sql, parameters = []) {
      calls.push({ sql, parameters });
      return [sql.includes("reviewer_user_id") ? [ownReview] : reviews];
    },
  });

  assert.deepEqual(await service.listPublishedForCombo(12), reviews);
  assert.deepEqual(await service.getCustomerComboReview(12, 42), ownReview);
  assert.match(calls[0].sql, /reviews\.combo_id = \?/);
  assert.match(calls[0].sql, /reviews\.status = 'Published'/);
  assert.deepEqual(calls[0].parameters, [12]);
  assert.deepEqual(calls[1].parameters, [12, 42]);
});

test("creates a customer review using the account identity from the database", async () => {
  const calls = [];
  const expectedReview = { id: 10, user_name: "Sana", status: "Pending" };
  const service = createReviewService({
    async execute(sql, parameters = []) {
      calls.push({ sql, parameters });
      return sql.startsWith("INSERT INTO reviews")
        ? [{ affectedRows: 1, insertId: 10 }]
        : [[expectedReview]];
    },
  });

  assert.deepEqual(await service.createCustomer({
    product_id: 12,
    rating: 5,
    comment: "Great quality.",
  }, 42), expectedReview);
  assert.match(calls[0].sql, /SELECT \?, users\.id, users\.username, users\.email/);
  assert.deepEqual(calls[0].parameters, [12, 5, "Great quality.", 42]);
  assert.deepEqual(calls[1].parameters, [10]);
});

test("creates a customer combo review using the account identity from the database", async () => {
  const calls = [];
  const expectedReview = { id: 11, user_name: "Sana", status: "Pending", combo_name: "Living room set" };
  const service = createReviewService({
    async execute(sql, parameters = []) {
      calls.push({ sql, parameters });
      return sql.startsWith("INSERT INTO reviews")
        ? [{ affectedRows: 1, insertId: 11 }]
        : [[expectedReview]];
    },
  });

  assert.deepEqual(await service.createCustomerCombo({
    combo_id: 12,
    rating: 5,
    comment: "Great combo.",
    review_image: "/uploads/reviews/combo.webp",
  }, 42), expectedReview);
  assert.match(calls[0].sql, /SELECT \?, users\.id, users\.username, users\.email/);
  assert.match(calls[0].sql, /\(combo_id, reviewer_user_id, user_name, user_email, rating, comment, review_image\)/);
  assert.deepEqual(calls[0].parameters, [12, 5, "Great combo.", "/uploads/reviews/combo.webp", 42]);
  assert.deepEqual(calls[1].parameters, [11]);
});
