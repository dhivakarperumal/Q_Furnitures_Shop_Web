function createStoreTaxSettingsService(pool) {
  return {
    async getSettings() {
      const [rows] = await pool.execute(
        "SELECT gst_enabled, gst_rate, tax_mode FROM store_tax_settings WHERE id = 1",
      );
      if (!rows[0]) throw new Error("Store GST settings are not initialized.");
      if (!["Tax Exclusive", "Tax Inclusive"].includes(rows[0].tax_mode)) {
        throw new Error("Store GST tax mode is invalid.");
      }
      return {
        gst_enabled: Boolean(Number(rows[0].gst_enabled)),
        gst_rate: Number(rows[0].gst_rate),
        tax_mode: rows[0].tax_mode,
      };
    },

    async updateSettings({ gstEnabled, gstRate, taxMode }) {
      await pool.execute(
        `INSERT INTO store_tax_settings (id, gst_enabled, gst_rate, tax_mode) VALUES (1, ?, ?, ?)
         ON DUPLICATE KEY UPDATE gst_enabled = VALUES(gst_enabled), gst_rate = VALUES(gst_rate),
         tax_mode = VALUES(tax_mode)`,
        [gstEnabled ? 1 : 0, gstRate, taxMode],
      );
      return { gst_enabled: gstEnabled, gst_rate: gstRate, tax_mode: taxMode };
    },
  };
}

module.exports = { createStoreTaxSettingsService };
