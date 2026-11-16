const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeReview } = require("./reviewRouter");

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
