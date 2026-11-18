const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const createStoreTaxSettingsRouter = require("./storeTaxSettingsRouter");

test("GST settings routes require an admin and validate persisted settings", async (t) => {
  const secret = "store-tax-settings-router-test-secret";
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  const saved = [];
  const app = express();
  app.use(express.json());
  app.use("/api/settings", createStoreTaxSettingsRouter({
    async getSettings() {
      return { gst_enabled: true, gst_rate: 18 };
    },
    async updateSettings(settings) {
      saved.push(settings);
      return { gst_enabled: settings.gstEnabled, gst_rate: settings.gstRate };
    },
  }));
  app.use((error, request, response, next) => {
    response.status(500).json({ message: error.message });
  });
  const server = app.listen(0);
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  await new Promise((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/settings/gst`;

  assert.equal((await fetch(url)).status, 401);

  const staffToken = jwt.sign({ role: "staff", user_id: "staff-user" }, secret);
  assert.equal((await fetch(url, {
    headers: { authorization: `Bearer ${staffToken}` },
  })).status, 403);

  const adminToken = jwt.sign({ role: "admin", user_id: "admin-user" }, secret);
  const headers = {
    authorization: `Bearer ${adminToken}`,
    "content-type": "application/json",
  };
  const read = await fetch(url, { headers });
  assert.equal(read.status, 200);
  assert.deepEqual(await read.json(), { gst_enabled: true, gst_rate: 18 });

  const invalid = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({ gst_enabled: "false", gst_rate: 18 }),
  });
  assert.equal(invalid.status, 400);

  const response = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({ gst_enabled: false, gst_rate: 12 }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { gst_enabled: false, gst_rate: 12 });
  assert.deepEqual(saved, [{ gstEnabled: false, gstRate: 12 }]);
});
