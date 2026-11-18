const test = require("node:test");
const assert = require("node:assert/strict");
const { createStoreTaxSettingsService } = require("./storeTaxSettingsService");

test("reads API-backed GST settings as normalized values", async () => {
  const service = createStoreTaxSettingsService({
    async execute() {
      return [[{ gst_enabled: 0, gst_rate: "12.00" }], []];
    },
  });

  assert.deepEqual(await service.getSettings(), { gst_enabled: false, gst_rate: 12 });
});

test("persists GST settings and returns the saved values", async () => {
  let executed;
  const service = createStoreTaxSettingsService({
    async execute(sql, params) {
      executed = { sql, params };
      return [{ affectedRows: 1 }, []];
    },
  });

  assert.deepEqual(
    await service.updateSettings({ gstEnabled: true, gstRate: 5 }),
    { gst_enabled: true, gst_rate: 5 },
  );
  assert.match(executed.sql, /INSERT INTO store_tax_settings/);
  assert.deepEqual(executed.params, [1, 5]);
});

test("reports a missing initialized GST settings row", async () => {
  const service = createStoreTaxSettingsService({
    async execute() {
      return [[], []];
    },
  });

  await assert.rejects(service.getSettings, /Store GST settings are not initialized/);
});
