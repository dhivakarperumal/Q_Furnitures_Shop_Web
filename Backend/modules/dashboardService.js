const DASHBOARD_RANGES = {
  week: {
    period: "DATE(created_at)",
    label: "DATE_FORMAT(created_at, '%a')",
    filter: "created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)",
  },
  month: {
    period: "DATE(created_at)",
    label: "DATE_FORMAT(created_at, '%d %b')",
    filter: "created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)",
  },
  all: {
    period: "DATE_FORMAT(created_at, '%Y-%m')",
    label: "DATE_FORMAT(created_at, '%b %Y')",
    filter: "1 = 1",
  },
};

function requestError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseProductData(value) {
  if (value == null) return {};
  const data = typeof value === "string" ? JSON.parse(value) : value;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Stored product data must be a JSON object.");
  }
  return data;
}

function getProductImage(value) {
  const data = parseProductData(value);
  const firstImage = Array.isArray(data.images) ? data.images[0] : null;
  const candidate = data.image || data.image_url || data.thumbnail || firstImage;
  if (typeof candidate === "string") return candidate;
  if (candidate && typeof candidate === "object") {
    return candidate.url || candidate.src || candidate.image || "";
  }
  return "";
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function normalizeStatus(status) {
  if (status === "Pending") return "Order Placed";
  if (status === "Packing") return "Packed";
  if (status === "Shipping" || status === "Out for Delivery") return "Shipped";
  return status;
}

function createDashboardService(pool) {
  async function getDashboard(requestedRange = "week") {
    if (typeof requestedRange !== "string" ||
        !Object.prototype.hasOwnProperty.call(DASHBOARD_RANGES, requestedRange)) {
      throw requestError(400, "Dashboard range must be week, month, or all.");
    }
    const range = DASHBOARD_RANGES[requestedRange];

    const trendQuery = `
      SELECT ${range.period} AS period, ${range.label} AS month,
             COALESCE(SUM(total_amount), 0) AS revenue
      FROM orders
      WHERE status <> 'Cancelled' AND ${range.filter}
      GROUP BY ${range.period}, ${range.label}
      ORDER BY period ASC
    `;

    const [
      [summaryRows],
      [recentOrderRows],
      [topProductRows],
      [lowStockRows],
      [revenueTrends],
      [statusRows],
    ] = await Promise.all([
      pool.execute(`
        SELECT
          (SELECT COUNT(*) FROM products) AS productCount,
          (SELECT COUNT(*) FROM orders) AS orderCount,
          (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status <> 'Cancelled') AS revenue,
          (SELECT COUNT(*) FROM orders WHERE status IN ('Order Placed', 'Pending', 'Confirmed', 'Packing')) AS pendingCount,
          (SELECT COUNT(*) FROM orders WHERE status IN ('Shipping', 'Shipped', 'Out for Delivery')) AS shippingCount,
          (SELECT COUNT(*) FROM users WHERE role = 'customer' AND status = 'active') AS customerCount,
          (SELECT COUNT(*) FROM products p
            LEFT JOIN product_stock ps ON ps.product_id = p.id
            WHERE COALESCE(ps.available_stock, p.total_stock) <= COALESCE(ps.minimum_stock, 5)) AS lowStockCount,
          (SELECT COUNT(*) FROM offers WHERE status = 'active') AS activeOfferCount
      `),
      pool.execute(`
        SELECT id, customer_name AS customer, created_at AS date, total_amount AS amount, status
        FROM orders
        ORDER BY created_at DESC, id DESC
        LIMIT 8
      `),
      pool.execute(`
        SELECT oi.product_name AS name, COALESCE(p.category, 'Furniture') AS cat,
               SUM(oi.quantity) AS sales, MAX(oi.image) AS img
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE o.status <> 'Cancelled'
        GROUP BY oi.product_id, oi.product_name, p.category
        ORDER BY sales DESC, name ASC
        LIMIT 5
      `),
      pool.execute(`
        SELECT p.name, p.product_data,
               COALESCE(ps.available_stock, p.total_stock, 0) AS stock
        FROM products p
        LEFT JOIN product_stock ps ON ps.product_id = p.id
        WHERE COALESCE(ps.available_stock, p.total_stock) <= COALESCE(ps.minimum_stock, 5)
        ORDER BY stock ASC, p.name
        LIMIT 5
      `),
      pool.execute(trendQuery),
      pool.execute("SELECT status, COUNT(*) AS count FROM orders GROUP BY status"),
    ]);

    const summary = summaryRows[0] || {};
    const stats = [
      { label: "Products", value: Number(summary.productCount || 0).toLocaleString("en-IN"), icon: "product", description: "Items in your catalog" },
      { label: "Orders", value: Number(summary.orderCount || 0).toLocaleString("en-IN"), icon: "bag", description: "All recorded orders" },
      { label: "Revenue", value: formatCurrency(summary.revenue), icon: "rupee", description: "Excluding cancelled orders" },
      { label: "Pending Orders", value: Number(summary.pendingCount || 0).toLocaleString("en-IN"), icon: "pending", description: "Awaiting fulfillment" },
      { label: "Orders in Transit", value: Number(summary.shippingCount || 0).toLocaleString("en-IN"), icon: "truck", description: "Shipping or out for delivery" },
      { label: "Customers", value: Number(summary.customerCount || 0).toLocaleString("en-IN"), icon: "users", description: "Active customer accounts" },
      { label: "Low Stock", value: Number(summary.lowStockCount || 0).toLocaleString("en-IN"), icon: "lowstock", description: "At or below reorder level" },
      { label: "Active Offers", value: Number(summary.activeOfferCount || 0).toLocaleString("en-IN"), icon: "offer", description: "Currently active promotions" },
    ];

    const orderStatusCounts = {};
    for (const row of statusRows) {
      const status = normalizeStatus(row.status);
      orderStatusCounts[status] = (orderStatusCounts[status] || 0) + Number(row.count || 0);
    }

    return {
      stats,
      recentOrders: recentOrderRows.map((order) => ({
        ...order,
        id: `#ORD-${String(order.id).padStart(4, "0")}`,
        amount: formatCurrency(order.amount),
        status: normalizeStatus(order.status),
      })),
      topProducts: topProductRows.map((product) => ({
        ...product,
        sales: Number(product.sales || 0),
        cat: product.cat || "Furniture",
        img: product.img || "",
      })),
      lowStockAlerts: lowStockRows.map((product) => ({
        name: product.name,
        stock: Number(product.stock || 0),
        img: getProductImage(product.product_data),
      })),
      revenueTrends: revenueTrends.map((trend) => ({
        month: trend.month,
        revenue: Number(trend.revenue || 0),
      })),
      orderStatusCounts,
    };
  }

  return { getDashboard };
}

module.exports = { createDashboardService };
