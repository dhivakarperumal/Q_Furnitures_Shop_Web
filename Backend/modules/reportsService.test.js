const test = require("node:test");
const assert = require("node:assert/strict");
const { createReportsService, getDateRange } = require("./reportsService");

const referenceDate = new Date("2025-03-19T13:45:00.000Z");

test("resolves report presets with Monday-based weeks and calendar month boundaries", () => {
  assert.deepEqual(getDateRange({ period: "today" }, referenceDate), {
    from: "2025-03-19",
    to: "2025-03-19",
  });
  assert.deepEqual(getDateRange({ period: "yesterday" }, referenceDate), {
    from: "2025-03-18",
    to: "2025-03-18",
  });
  assert.deepEqual(getDateRange({ period: "this-week" }, referenceDate), {
    from: "2025-03-17",
    to: "2025-03-19",
  });
  assert.deepEqual(getDateRange({ period: "this-month" }, referenceDate), {
    from: "2025-03-01",
    to: "2025-03-19",
  });
  assert.deepEqual(getDateRange({ period: "last-month" }, referenceDate), {
    from: "2025-02-01",
    to: "2025-02-28",
  });
  assert.deepEqual(getDateRange({ period: "this-year" }, referenceDate), {
    from: "2025-01-01",
    to: "2025-03-19",
  });
});

test("validates custom date ranges and supports all-time reports", () => {
  assert.deepEqual(getDateRange({
    period: "custom",
    from: "2025-02-10",
    to: "2025-02-14",
  }, referenceDate), {
    from: "2025-02-10",
    to: "2025-02-14",
  });
  assert.deepEqual(getDateRange({ period: "all" }, referenceDate), {
    from: "1000-01-01",
    to: "2025-03-19",
  });
  assert.throws(() => getDateRange({
    period: "custom",
    from: "2025-02-30",
    to: "2025-03-01",
  }, referenceDate), { status: 400 });
  assert.throws(() => getDateRange({
    period: "custom",
    from: "2025-03-02",
    to: "2025-03-01",
  }, referenceDate), { status: 400 });
});

test("keeps profit incomplete when a sale has no FIFO cost layer", async () => {
  const pool = {
    async execute(sql) {
      if (sql.includes("SELECT COUNT(*) AS count") && sql.includes("FROM orders")) {
        return [[{ count: 1, total: 100, revenue: 100, gst: 0, pending: 100 }], []];
      }
      if (sql.includes("FROM invoices WHERE")) return [[{ count: 0, total: 0, revenue: 0, gst: 0, pending: 0 }], []];
      if (sql.includes("FROM credit_notes cn JOIN (")) return [[{ total: 0, taxable: 0, gst: 0 }], []];
      if (sql.includes("FROM purchase_receipts WHERE is_opening_stock = 0")) {
        return [[{ count: 0, total: 0, gst: 0, pending: 0 }], []];
      }
      if (sql.includes("FROM purchase_returns WHERE return_date")) return [[{ total: 0, gst: 0 }], []];
      if (sql.includes("FROM expenses WHERE")) return [[{ total: 0 }], []];
      if (sql.includes("FROM product_stock")) return [[{ total: 1 }], []];
      if (sql.includes("SELECT oi.id AS line_id")) {
        return [[{ line_id: 1, product_id: 7, quantity: 2, event_date: "2025-03-19" }], []];
      }
      return [[], []];
    },
  };
  const summary = await createReportsService(pool).getSummary({ period: "all" });

  assert.equal(summary.uncostedQuantity, 2);
  assert.equal(summary.grossProfit, null);
  assert.equal(summary.netProfit, null);
});

test("provides one parameter for every date-boundary placeholder in report queries", async () => {
  const executedQueries = [];
  const pool = {
    async execute(sql, parameters = []) {
      executedQueries.push({ sql, parameters });
      return [[], []];
    },
  };
  const service = createReportsService(pool);
  const reportTypes = [
    "sales", "purchases", "products", "categories", "inventory", "customers",
    "suppliers", "payments", "gst", "expenses", "sales-returns", "purchase-returns",
    "orders", "deliveries", "outstanding",
  ];

  for (const type of reportTypes) {
    await service.getReport(type, { period: "custom", from: "2025-03-01", to: "2025-03-31" });
  }

  for (const { sql, parameters } of executedQueries) {
    assert.equal((sql.match(/\?/g) || []).length, parameters.length, sql);
  }
});
