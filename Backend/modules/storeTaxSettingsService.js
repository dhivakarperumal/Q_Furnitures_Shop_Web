function createStoreTaxSettingsService(pool) {
  return {
    async getSettings() {
      const [rows] = await pool.execute(
        "SELECT gst_enabled, gst_rate FROM store_tax_settings WHERE id = 1",
      );
      if (!rows[0]) throw new Error("Store GST settings are not initialized.");
      return {
        gst_enabled: Boolean(Number(rows[0].gst_enabled)),
        gst_rate: Number(rows[0].gst_rate),
      };
    },

    async updateSettings({ gstEnabled, gstRate }) {
      await pool.execute(
        `INSERT INTO store_tax_settings (id, gst_enabled, gst_rate) VALUES (1, ?, ?)
         ON DUPLICATE KEY UPDATE gst_enabled = VALUES(gst_enabled), gst_rate = VALUES(gst_rate)`,
        [gstEnabled ? 1 : 0, gstRate],
      );
      return { gst_enabled: gstEnabled, gst_rate: gstRate };
    },
  };
}

module.exports = { createStoreTaxSettingsService };
