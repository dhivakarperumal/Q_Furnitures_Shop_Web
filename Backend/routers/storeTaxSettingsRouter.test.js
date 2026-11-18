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
      return { gst_enabled: true, gst_rate: 18, tax_mode: "Tax Exclusive" };
    },
    async updateSettings(settings) {
      saved.push(settings);
      return {
        gst_enabled: settings.gstEnabled,
        gst_rate: settings.gstRate,
        tax_mode: settings.taxMode,
      };
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
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/settings/gst`;

  assert.equal((await fetch(baseUrl)).status, 401);
  const publicRead = await fetch(`${baseUrl}/public`);
  assert.equal(publicRead.status, 200);
  assert.deepEqual(await publicRead.json(), {
    gst_enabled: true,
    gst_rate: 18,
    tax_mode: "Tax Exclusive",
  });

  const staffToken = jwt.sign({ role: "staff", user_id: "staff-user" }, secret);
  assert.equal((await fetch(baseUrl, {
    headers: { authorization: `Bearer ${staffToken}` },
  })).status, 403);

  const adminToken = jwt.sign({ role: "admin", user_id: "admin-user" }, secret);
  const headers = {
    authorization: `Bearer ${adminToken}`,
    "content-type": "application/json",
  };
  const read = await fetch(baseUrl, { headers });
  assert.equal(read.status, 200);
  assert.deepEqual(await read.json(), { gst_enabled: true, gst_rate: 18, tax_mode: "Tax Exclusive" });

  const invalid = await fetch(baseUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify({ gst_enabled: "false", gst_rate: 18 }),
  });
  assert.equal(invalid.status, 400);

  const response = await fetch(baseUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify({ gst_enabled: false, gst_rate: 12, tax_mode: "Tax Inclusive" }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    gst_enabled: false,
    gst_rate: 12,
    tax_mode: "Tax Inclusive",
  });
  assert.deepEqual(saved, [{
    gstEnabled: false,
    gstRate: 12,
    taxMode: "Tax Inclusive",
  }]);

  const invalidMode = await fetch(baseUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify({ gst_enabled: true, gst_rate: 12, tax_mode: "invalid" }),
  });
  assert.equal(invalidMode.status, 400);
});
