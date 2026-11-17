const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const createUserRouter = require("./userRouter");

const originalJwtSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = "user-router-test-secret";

test.after(() => {
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

test("serves and updates only the authenticated account", async (t) => {
  const calls = [];
  const app = express();
  app.use(express.json());
  app.use("/api/users", createUserRouter({
    async getProfile(userId) {
      calls.push(["getProfile", userId]);
      return { id: userId, name: "Asha" };
    },
    async updateProfile(userId, profile) {
      calls.push(["updateProfile", userId, profile]);
      return { id: userId, name: profile.name };
    },
    async changePassword(userId, currentPassword, newPassword) {
      calls.push(["changePassword", userId, currentPassword, newPassword]);
    },
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const baseUrl = `http://127.0.0.1:${server.address().port}/api/users`;
  const unauthorized = await fetch(`${baseUrl}/me`);
  assert.equal(unauthorized.status, 401);

  const token = jwt.sign({ id: 42, role: "customer" }, process.env.JWT_SECRET);
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  const profileResponse = await fetch(`${baseUrl}/me`, { headers });
  assert.equal(profileResponse.status, 200);
  assert.deepEqual(calls[0], ["getProfile", 42]);

  const updateResponse = await fetch(`${baseUrl}/me`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ id: 999, name: "Asha Kumar", email: "asha@example.com" }),
  });
  assert.equal(updateResponse.status, 200);
  assert.deepEqual(calls[1], [
    "updateProfile",
    42,
    { id: 999, name: "Asha Kumar", email: "asha@example.com" },
  ]);

  const passwordResponse = await fetch(`${baseUrl}/me/password`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ currentPassword: "old-pass-1", newPassword: "new-pass-2" }),
  });
  assert.equal(passwordResponse.status, 200);
  assert.deepEqual(calls[2], ["changePassword", 42, "old-pass-1", "new-pass-2"]);
});
