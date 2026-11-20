const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const { requireApiAuthentication } = require("./auth");

test("allows designated summary reads but protects full-data routes", async (t) => {
  const secret = "api-auth-test-secret";
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  const app = express();
  app.use("/api", requireApiAuthentication);
  app.use((request, response) => response.json({ authenticated: Boolean(request.auth) }));
  const server = app.listen(0, "127.0.0.1");
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

  for (const path of [
    "/offers",
    "/categories",
    "/products",
    "/products/rooms",
    "/combos",
    "/banners/hero",
    "/banners/offers",
    "/reviews/published",
  ]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200, `${path} should be publicly readable`);
  }

  for (const path of ["/products/12", "/combos/12", "/users/me"]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 401, `${path} should require authentication`);
  }

  const token = jwt.sign({ role: "customer", user_id: "customer-1" }, secret);
  const authenticated = await fetch(`${baseUrl}/products/12`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(authenticated.status, 200);
  assert.deepEqual(await authenticated.json(), { authenticated: true });
});
