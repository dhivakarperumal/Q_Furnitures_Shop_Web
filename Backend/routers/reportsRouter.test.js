const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const createReportsRouter = require("./reportsRouter");

test("reports endpoints reject unauthenticated and non-admin callers", async (t) => {
  const secret = "reports-router-test-secret";
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  const app = express();
  app.use("/api/reports", createReportsRouter({
    getSummary: async () => { throw new Error("Protected report service was reached."); },
  }));
  const server = app.listen(0);
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}/api/reports/summary`;

  const unauthenticated = await fetch(url);
  assert.equal(unauthenticated.status, 401);

  const nonAdminToken = jwt.sign({ role: "staff", user_id: "staff-user" }, secret);
  const nonAdmin = await fetch(url, { headers: { authorization: `Bearer ${nonAdminToken}` } });
  assert.equal(nonAdmin.status, 403);
});
