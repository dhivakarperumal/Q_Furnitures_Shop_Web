const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const createReviewRouter = require("./reviewRouter");
const { normalizeReview } = createReviewRouter;

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
