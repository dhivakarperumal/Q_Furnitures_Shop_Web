const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const createOfferRouter = require("./offerRouter");

async function withRouter(offerService, handler) {
  const app = express();
  app.use("/api/offers", createOfferRouter(offerService));
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise((resolve) => server.once("listening", resolve));
    return await handler(`http://127.0.0.1:${server.address().port}/api/offers`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("serves header-selected offers publicly from the offers endpoint", async () => {
  const headerOffers = [{ id: 1, title: "Summer sale", offer_percentage: 20 }];
  await withRouter({
    async listHeaderOffers() {
      return headerOffers;
    },
  }, async (url) => {
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { offers: headerOffers });
  });
});

test("keeps the complete offer list restricted to admins", async () => {
  process.env.JWT_SECRET = "offer-router-test-secret";
  const allOffers = [
    { id: 1, title: "Summer sale", status: "active", show_in_header: 1 },
    { id: 2, title: "Internal promotion", status: "inactive", show_in_header: 0 },
  ];

  await withRouter({
    async list() {
      return allOffers;
    },
  }, async (url) => {
    const unauthorized = await fetch(`${url}/admin`);
    assert.equal(unauthorized.status, 401);

    const token = jwt.sign({ id: 42, role: "admin" }, process.env.JWT_SECRET);
    const response = await fetch(`${url}/admin`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { offers: allOffers });
  });
});
