const DASHBOARD_RANGES = {
  week: {
    filter: "created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)",
    format: "%d %b",
    group: "DATE(created_at)",
  },
  month: {
    filter: "created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')",
    format: "%d %b",
    group: "DATE(created_at)",
  },
  all: {
    filter: "1 = 1",
    format: "%b %Y",
    group: "YEAR(created_at), MONTH(created_at)",
  },
};

function requestError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseDashboardRange(value) {
  if (typeof value !== "string" || !Object.hasOwn(DASHBOARD_RANGES, value)) {
    throw requestError(400, "Choose a valid dashboard range.");
  }
  return value;
}

function parseProductData(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return {};

  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Stored product data must be a JSON object.");
  }
  return parsed;
}

function getProductImage(value) {
  const data = parseProductData(value);
  const images = Array.isArray(data.images) ? data.images : [];
  const mainImageIndex = Number.isSafeInteger(Number(data.main_image_index))
    ? Number(data.main_image_index)
    : 0;
  const image = data.image || images[mainImageIndex] || images[0] || "";
  if (typeof image === "string") return image;
  return typeof image?.url === "string" ? image.url : "";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(value) || 0);
}

function mapOrderStatus(status) {
  if (status === "Packing") return "Packed";
  if (status === "Shipping" || status === "Out for Delivery") return "Shipped";
  if (status === "Pending") return "Order Placed";
  return status || "Order Placed";
}

function createDashboardService(pool) {
  return {
    async getDashboard(range = "week") {
      const selectedRange = parseDashboardRange(range);
      const trendRange = DASHBOARD_RANGES[selectedRange];
      const revenueTrendQuery = `
        SELECT DATE_FORMAT(created_at, ?) AS month, SUM(total_amount) AS revenue
        FROM orders
        WHERE status <> 'Cancelled' AND ${trendRange.filter}
        GROUP BY ${trendRange.group}
        ORDER BY MIN(created_at)`;

      const [
        [orderStatsRows],
        [productCountRows],
        [customerCountRows],
        [offerCountRows],
        [lowStockCountRows],
        [recentOrderRows],
        [topProductRows],
        [lowStockRows],
        [revenueTrendRows],
        [orderStatusRows],
      ] = await Promise.all([
        pool.execute(`
          SELECT COUNT(*) AS order_count,
                 COALESCE(SUM(CASE WHEN status <> 'Cancelled' THEN total_amount ELSE 0 END), 0) AS revenue,
                 SUM(CASE WHEN status IN ('Order Placed', 'Pending') THEN 1 ELSE 0 END) AS pending_count,
                 SUM(CASE WHEN status IN ('Shipping', 'Out for Delivery') THEN 1 ELSE 0 END) AS transit_count
          FROM orders`),
        pool.execute("SELECT COUNT(*) AS total FROM products"),
        pool.execute("SELECT COUNT(*) AS total FROM users WHERE status = 'active' AND role <> 'admin'"),
        pool.execute("SELECT COUNT(*) AS total FROM offers WHERE status = 'active'"),
        pool.execute(`
          SELECT COUNT(*) AS total
          FROM product_stock
          WHERE available_stock <= minimum_stock`),
        pool.execute(`
          SELECT id, order_id, customer_name, created_at, total_amount, status
          FROM orders
          ORDER BY created_at DESC, id DESC
          LIMIT 5`),
        pool.execute(`
          SELECT COALESCE(MAX(p.name), oi.product_name) AS name,
                 MAX(p.category) AS category,
                 MAX(oi.image) AS img,
                 SUM(oi.quantity) AS sales
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          LEFT JOIN products p ON p.id = oi.product_id
          WHERE o.status <> 'Cancelled'
          GROUP BY oi.product_id, oi.product_name
          ORDER BY sales DESC
          LIMIT 5`),
        pool.execute(`
          SELECT p.name, p.product_data, ps.available_stock AS stock
          FROM products p
          JOIN product_stock ps ON ps.product_id = p.id
          WHERE ps.available_stock <= ps.minimum_stock
          ORDER BY ps.available_stock ASC, p.name
          LIMIT 5`),
        pool.execute(revenueTrendQuery, [trendRange.format]),
        pool.execute("SELECT status, COUNT(*) AS total FROM orders GROUP BY status"),
      ]);

      const orderStats = orderStatsRows[0] || {};
      const orderStatusCounts = {
        "Order Placed": 0,
        Confirmed: 0,
        Packed: 0,
        Shipped: 0,
        Delivered: 0,
        Cancelled: 0,
      };
      for (const row of orderStatusRows) {
        const status = mapOrderStatus(row.status);
        if (Object.hasOwn(orderStatusCounts, status)) {
          orderStatusCounts[status] += Number(row.total) || 0;
        }
      }

      return {
        stats: [
          { label: "Products", value: Number(productCountRows[0]?.total || 0), icon: "bag", description: "Items in your catalog" },
          { label: "Orders", value: Number(orderStats.order_count || 0), icon: "saree", description: "All recorded orders" },
          { label: "Revenue", value: formatCurrency(orderStats.revenue), icon: "rupee", description: "Excluding cancelled orders" },
          { label: "Pending Orders", value: Number(orderStats.pending_count || 0), icon: "pending", description: "Awaiting fulfillment" },
          { label: "Orders in Transit", value: Number(orderStats.transit_count || 0), icon: "truck", description: "Shipping or out for delivery" },
          { label: "Customers", value: Number(customerCountRows[0]?.total || 0), icon: "users", description: "Active customer accounts" },
          { label: "Low Stock", value: Number(lowStockCountRows[0]?.total || 0), icon: "lowstock", description: "At or below reorder level" },
          { label: "Active Offers", value: Number(offerCountRows[0]?.total || 0), icon: "offer", description: "Currently active promotions" },
        ],
        recentOrders: recentOrderRows.map((order) => {
          const numericId = Number(order.id);
          const orderNumber = order.order_id || `ORD${String(numericId).padStart(4, "0")}`;
          return {
            id: `#${String(orderNumber).replace(/^#/, "")}`,
            numericId,
            customer: order.customer_name || "Guest",
            date: order.created_at,
            amount: formatCurrency(order.total_amount),
            status: mapOrderStatus(order.status),
          };
        }),
        topProducts: topProductRows.map((product) => ({
          name: product.name,
          cat: product.category || "Uncategorized",
          sales: Number(product.sales) || 0,
          img: product.img || "",
        })),
        lowStockAlerts: lowStockRows.map((product) => ({
          name: product.name,
          stock: Number(product.stock) || 0,
          img: getProductImage(product.product_data),
        })),
        revenueTrends: revenueTrendRows.map((entry) => ({
          month: entry.month,
          revenue: Number(entry.revenue) || 0,
        })),
        orderStatusCounts,
      };
    },
  };
}

module.exports = { createDashboardService, parseDashboardRange };
