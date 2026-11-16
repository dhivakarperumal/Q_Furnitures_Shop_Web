const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const createFavoriteRouter = require("./favoriteRouter");

test("favorite routes require authentication and use the authenticated user", async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "favorite-router-test-secret";
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  const calls = [];
  const app = express();
  app.use(express.json());
  app.use("/api/favorites", createFavoriteRouter({
    async list(request, response) {
      calls.push(["list", request.auth.user_id]);
      return response.json([]);
    },
    async add(request, response) {
      calls.push(["add", request.auth.user_id, request.body.product_id]);
      return response.status(201).json({ message: "Product added to favorites." });
    },
    async remove(request, response) {
      calls.push(["remove", request.auth.user_id, request.params.productId]);
      return response.status(204).end();
    },
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const baseUrl = `http://127.0.0.1:${server.address().port}/api/favorites`;
  const unauthenticated = await fetch(baseUrl);
  assert.equal(unauthenticated.status, 401);

  const token = jwt.sign({ user_id: "customer-a", role: "customer" }, process.env.JWT_SECRET);
  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };
  assert.equal((await fetch(baseUrl, { headers })).status, 200);
  assert.equal((await fetch(baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ product_id: 8, user_id: "customer-b" }),
  })).status, 201);
  assert.equal((await fetch(`${baseUrl}/8`, { method: "DELETE", headers })).status, 204);
  assert.deepEqual(calls, [
    ["list", "customer-a"],
    ["add", "customer-a", 8],
    ["remove", "customer-a", "8"],
  ]);
});
