const test = require("node:test");
const assert = require("node:assert/strict");
const { createDashboardService } = require("./dashboardService");

function createDashboardPool() {
  return {
    async execute(sql) {
      if (sql.includes("AS order_count")) {
        return [[{ order_count: 5, revenue: "1000.00", pending_count: 1, transit_count: 1 }], []];
      }
      if (sql.includes("COUNT(*) AS total FROM products")) return [[{ total: 10 }], []];
      if (sql.includes("COUNT(*) AS total FROM users")) return [[{ total: 4 }], []];
      if (sql.includes("COUNT(*) AS total FROM offers")) return [[{ total: 2 }], []];
      if (sql.includes("COUNT(*) AS total") && sql.includes("FROM product_stock")) {
        return [[{ total: 1 }], []];
      }
      if (sql.includes("DATE_FORMAT(created_at")) {
        return [[{ month: "13 Nov", revenue: "1000.00" }], []];
      }
      if (sql.includes("FROM order_items")) {
        return [[{ name: "Wooden Desk", category: "Office", img: "/uploads/desk.webp", sales: 3 }], []];
      }
      if (sql.includes("FROM products p")) {
        return [[{
          name: "Accent Chair",
          product_data: { images: ["/uploads/chair.webp"], main_image_index: 0 },
          stock: 2,
        }], []];
      }
      if (sql.includes("GROUP BY status")) {
        return [[
          { status: "Order Placed", total: 1 },
          { status: "Packing", total: 1 },
          { status: "Shipping", total: 1 },
          { status: "Delivered", total: 1 },
          { status: "Cancelled", total: 1 },
        ], []];
      }
      if (sql.includes("FROM orders") && sql.includes("LIMIT 5")) {
        return [[{
          id: 7,
          order_id: null,
          customer_name: "Test Customer",
          created_at: new Date("2026-11-13T00:00:00Z"),
          total_amount: "29.00",
          status: "Packing",
        }], []];
      }
      throw new Error(`Unexpected dashboard query: ${sql}`);
    },
  };
}

test("dashboard data maps database values to the frontend response shape", async () => {
  const service = createDashboardService(createDashboardPool());
  const data = await service.getDashboard("week");

  assert.equal(data.stats.length, 8);
  assert.equal(data.stats.find((stat) => stat.label === "Orders").value, 5);
  assert.equal(data.stats.find((stat) => stat.label === "Revenue").value, "₹1,000.00");
  assert.deepEqual(data.recentOrders[0], {
    id: "#ORD0007",
    numericId: 7,
    customer: "Test Customer",
    date: new Date("2026-11-13T00:00:00Z"),
    amount: "₹29.00",
    status: "Packed",
  });
  assert.deepEqual(data.topProducts[0], {
    name: "Wooden Desk",
    cat: "Office",
    sales: 3,
    img: "/uploads/desk.webp",
  });
  assert.deepEqual(data.lowStockAlerts[0], {
    name: "Accent Chair",
    stock: 2,
    img: "/uploads/chair.webp",
  });
  assert.equal(data.orderStatusCounts.Packed, 1);
  assert.deepEqual(data.revenueTrends, [{ month: "13 Nov", revenue: 1000 }]);
});

test("dashboard rejects unsupported revenue ranges", async () => {
  const service = createDashboardService(createDashboardPool());
  await assert.rejects(
    service.getDashboard("quarter"),
    (error) => error.status === 400 && error.message === "Choose a valid dashboard range.",
  );
});
