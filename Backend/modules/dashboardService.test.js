const test = require("node:test");
const assert = require("node:assert/strict");
const { createDashboardService } = require("./dashboardService");

test("returns dashboard data in the shape used by the admin dashboard", async () => {
  const pool = {
    async execute(sql) {
      if (sql.includes("AS productCount")) {
        return [[{
          productCount: "12",
          orderCount: "7",
          revenue: "1250.50",
          pendingCount: "2",
          shippingCount: "1",
          customerCount: "4",
          lowStockCount: "3",
          activeOfferCount: "1",
        }]];
      }
      if (sql.includes("FROM order_items")) {
        return [[{ name: "Wood Chair", cat: "Chairs", sales: "3", img: "/chair.jpg" }]];
      }
      if (sql.includes("FROM products p") && sql.includes("product_data")) {
        return [[{ name: "Side Table", product_data: '{"image":"/table.jpg"}', stock: "2" }]];
      }
      if (sql.includes("AS period")) return [[{ month: "Fri", revenue: "500" }]];
      if (sql.includes("GROUP BY status")) return [[{ status: "Packing", count: "2" }]];
      if (sql.includes("FROM orders")) {
        return [[{
          id: 8,
          customer: "A Customer",
          date: new Date("2026-11-13T00:00:00.000Z"),
          amount: "250",
          status: "Order Placed",
        }]];
      }
      throw new Error(`Unexpected dashboard query: ${sql}`);
    },
  };

  const dashboard = await createDashboardService(pool).getDashboard("week");

  assert.equal(dashboard.stats.length, 8);
  assert.equal(dashboard.stats[2].value, "₹1,250.50");
  assert.equal(dashboard.recentOrders[0].id, "#ORD-0008");
  assert.equal(dashboard.recentOrders[0].amount, "₹250.00");
  assert.equal(dashboard.topProducts[0].sales, 3);
  assert.deepEqual(dashboard.lowStockAlerts[0], {
    name: "Side Table",
    stock: 2,
    img: "/table.jpg",
  });
  assert.equal(dashboard.revenueTrends[0].revenue, 500);
  assert.equal(dashboard.orderStatusCounts.Packed, 2);
});

test("rejects unsupported dashboard ranges", async () => {
  let queryCount = 0;
  const service = createDashboardService({
    async execute() {
      queryCount += 1;
      return [[]];
    },
  });

  await assert.rejects(service.getDashboard("year"), (error) => error.status === 400);
  assert.equal(queryCount, 0);
});
