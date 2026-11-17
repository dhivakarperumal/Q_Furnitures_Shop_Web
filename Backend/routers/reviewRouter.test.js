const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const createReviewRouter = require("./reviewRouter");
const { normalizeReview, normalizeCustomerReview, normalizeCustomerComboReview } = createReviewRouter;

const validReview = {
  product_id: "12",
  user_name: "  Sana  ",
  user_email: "",
  rating: "5",
  comment: "  Great quality.  ",
  review_image: "/uploads/reviews/photo.webp",
};

test("normalizes manual review fields", () => {
  assert.deepEqual(normalizeReview(validReview), {
    product_id: 12,
    user_name: "Sana",
    user_email: null,
    rating: 5,
    comment: "Great quality.",
    review_image: "/uploads/reviews/photo.webp",
  });
});

test("rejects invalid review fields and unsafe image URLs", () => {
  assert.throws(() => normalizeReview({ ...validReview, product_id: "0" }), { status: 400 });
  assert.throws(() => normalizeReview({ ...validReview, rating: "6" }), { status: 400 });
  assert.throws(() => normalizeReview({ ...validReview, comment: " " }), { status: 400 });
  assert.throws(() => normalizeReview({ ...validReview, review_image: "javascript:alert(1)" }), { status: 400 });
});

test("normalizes customer reviews without accepting customer identity fields", () => {
  assert.deepEqual(normalizeCustomerReview({
    product_id: "12",
    rating: "4",
    comment: "  Comfortable and well made.  ",
    review_image: "/uploads/reviews/product.webp",
    user_name: "Impersonated user",
  }), {
    product_id: 12,
    rating: 4,
    comment: "Comfortable and well made.",
    review_image: "/uploads/reviews/product.webp",
  });
  assert.throws(() => normalizeCustomerReview({ product_id: "12", rating: "6", comment: "Nice" }), { status: 400 });
  assert.throws(() => normalizeCustomerReview({ product_id: "12", rating: "5", comment: " " }), { status: 400 });
  assert.throws(() => normalizeCustomerReview({
    product_id: "12",
    rating: "5",
    comment: "Nice",
    review_image: "javascript:alert(1)",
  }), { status: 400 });
});

test("normalizes combo customer reviews without accepting customer identity fields", () => {
  assert.deepEqual(normalizeCustomerComboReview({
    combo_id: "12",
    rating: "4",
    comment: "  Comfortable and well made.  ",
    review_image: "/uploads/reviews/combo.webp",
    user_name: "Impersonated user",
  }), {
    combo_id: 12,
    rating: 4,
    comment: "Comfortable and well made.",
    review_image: "/uploads/reviews/combo.webp",
  });
  assert.throws(() => normalizeCustomerComboReview({ combo_id: "0", rating: "5", comment: "Nice" }), { status: 400 });
  assert.throws(() => normalizeCustomerComboReview({ combo_id: "12", rating: "6", comment: "Nice" }), { status: 400 });
  assert.throws(() => normalizeCustomerComboReview({
    combo_id: "12",
    rating: "5",
    comment: "Nice",
    review_image: "javascript:alert(1)",
  }), { status: 400 });
});

test("serves published reviews publicly", async (t) => {
  const reviews = [{ id: 3, user_name: "Sana", rating: 5, comment: "Great" }];
  const app = express();
  app.use("/api/reviews", createReviewRouter({
    async listPublished() {
      return reviews;
    },
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/reviews/published`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { reviews });
});

test("serves only reviews for the requested product", async (t) => {
  const reviews = [{ id: 8, product_id: 12, user_name: "Sana", rating: 5, comment: "Great" }];
  const app = express();
  app.use("/api/reviews", createReviewRouter({
    async listPublishedForProduct(productId) {
      assert.equal(productId, 12);
      return reviews;
    },
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/reviews/product/12`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { reviews });
});

test("creates a customer review from the authenticated account", async (t) => {
  process.env.JWT_SECRET = "review-router-test-secret";
  const submitted = [];
  const app = express();
  app.use(express.json());
  app.use("/api/reviews", createReviewRouter({
    async createCustomer(review, userId) {
      submitted.push({ review, userId });
      return { id: 9, ...review, user_name: "Sana", status: "Pending" };
    },
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const token = jwt.sign({ id: 42, role: "customer" }, process.env.JWT_SECRET);
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/reviews/customer`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      product_id: 12,
      rating: 5,
      comment: "Great quality.",
      user_name: "Impersonated user",
    }),
  });

  assert.equal(response.status, 201);
  assert.equal(submitted[0].userId, 42);
  assert.deepEqual(submitted[0].review, {
    product_id: 12,
    rating: 5,
    comment: "Great quality.",
    review_image: null,
  });
});

test("rejects a second customer review for the same product", async (t) => {
  process.env.JWT_SECRET = "review-router-test-secret";
  const app = express();
  app.use(express.json());
  app.use("/api/reviews", createReviewRouter({
    async createCustomer() {
      const error = new Error("Duplicate review");
      error.code = "ER_DUP_ENTRY";
      throw error;
    },
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const token = jwt.sign({ id: 42, role: "customer" }, process.env.JWT_SECRET);
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/reviews/customer`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ product_id: 12, rating: 5, comment: "Great quality." }),
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { message: "You have already reviewed this product." });
});

test("rejects a second customer review for the same combo", async (t) => {
  process.env.JWT_SECRET = "review-router-test-secret";
  const app = express();
  app.use(express.json());
  app.use("/api/reviews", createReviewRouter({
    async createCustomerCombo() {
      const error = new Error("Duplicate review");
      error.code = "ER_DUP_ENTRY";
      throw error;
    },
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const token = jwt.sign({ id: 42, role: "customer" }, process.env.JWT_SECRET);
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/reviews/combo/customer`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ combo_id: 12, rating: 5, comment: "Great combo." }),
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { message: "You have already reviewed this combo." });
});
