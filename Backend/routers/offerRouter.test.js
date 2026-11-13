const test = require("node:test");
const assert = require("node:assert/strict");
const createOfferRouter = require("./offerRouter");
const { normalizeOffer } = createOfferRouter;

const validOffer = {
  title: " Weekend sale ",
  offer_percentage: "15",
  description: "Save this weekend",
  icon: "Sparkles",
  status: "active",
  show_in_header: true,
};

test("creates the offers router with its configured service", () => {
  assert.doesNotThrow(() => createOfferRouter({}));
});

test("normalizes offer fields and percentage values", () => {
  assert.deepEqual(normalizeOffer(validOffer), {
    title: "Weekend sale",
    offer_percentage: 15,
    description: "Save this weekend",
    icon: "Sparkles",
    status: "active",
    show_in_header: true,
  });
});

test("rejects invalid titles, percentages, icons, statuses, and visibility values", () => {
  assert.throws(() => normalizeOffer({ ...validOffer, title: " " }), { status: 400 });
  assert.throws(() => normalizeOffer({ ...validOffer, offer_percentage: 101 }), { status: 400 });
  assert.throws(() => normalizeOffer({ ...validOffer, icon: "InvalidIcon" }), { status: 400 });
  assert.throws(() => normalizeOffer({ ...validOffer, status: "pending" }), { status: 400 });
  assert.throws(() => normalizeOffer({ ...validOffer, show_in_header: "yes" }), { status: 400 });
});
