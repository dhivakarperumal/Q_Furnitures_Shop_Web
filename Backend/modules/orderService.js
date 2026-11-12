const ORDER_STATUSES = new Set([
  "Order Placed",
  "Packing",
  "Shipping",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
]);
const PAYMENT_METHODS = new Set(["Cash", "UPI", "Card"]);

function requestError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function readText(value, field, { required = false, max = 191, fallback = "" } = {}) {
  if (value == null) value = fallback;
  if (typeof value !== "string" && typeof value !== "number") {
    throw requestError(400, `${field} must be a string.`);
  }

  const text = String(value).trim();
  if (required && !text) throw requestError(400, `${field} is required.`);
  if (text.length > max) throw requestError(400, `${field} must be ${max} characters or fewer.`);
  return text;
}

function normalizeOrder(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw requestError(400, "Order data must be an object.");
  }

  const orderType = readText(body.order_type, "Order type", { fallback: "Shop" });
  if (orderType.toLowerCase() !== "shop") {
    throw requestError(400, "Only shop orders can be created from this page.");
  }

  const paymentMethod = readText(body.payment_method, "Payment method", { fallback: "Cash" });
  if (!PAYMENT_METHODS.has(paymentMethod)) {
    throw requestError(400, "Payment method must be Cash, UPI, or Card.");
  }

  const status = readText(body.status, "Order status", { fallback: "Order Placed" });
  if (!ORDER_STATUSES.has(status)) {
    throw requestError(400, "Order status is invalid.");
  }

  const email = readText(body.customer_email, "Customer email", { max: 191 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw requestError(400, "Customer email is invalid.");
  }

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 100) {
    throw requestError(400, "Add between 1 and 100 order items.");
  }

  const items = body.items.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw requestError(400, `Order item ${index + 1} is invalid.`);
    }

    const productId = Number(item.product_id);
    const quantity = Number(item.quantity);
    if (!Number.isSafeInteger(productId) || productId < 1) {
      throw requestError(400, `Order item ${index + 1} has an invalid product.`);
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) {
      throw requestError(400, `Order item ${index + 1} quantity must be a whole number between 1 and 10,000.`);
    }

    return {
      productId,
      quantity,
      variantColor: readText(item.variant_color, "Variant colour", { max: 100 }),
      variantSize: readText(item.variant_size, "Variant size", { max: 100 }),
    };
  });

  const userId = body.user_id == null || body.user_id === ""
    ? null
    : readText(body.user_id, "Customer ID", { max: 255 });

  return {
    userId,
    customerName: readText(body.customer_name, "Customer name", { required: true }),
    customerEmail: email || null,
    customerPhone: readText(body.customer_phone, "Customer phone", { required: true, max: 32 }),
    address: readText(body.address, "Address", { max: 2000 }),
    streetAddress: readText(body.street_address || body.address, "Street address", { required: true, max: 255 }),
    city: readText(body.city, "City", { required: true }),
    district: readText(body.district, "District"),
    state: readText(body.state, "State", { required: true }),
    country: readText(body.country, "Country", { fallback: "India" }),
    zipCode: readText(body.zip_code, "ZIP code", { required: true, max: 32 }),
    orderType: "Shop",
    paymentMethod,
    status,
    items,
  };
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

function parseStoredItems(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error("Stored order items must be a JSON array.");
  return parsed;
}

function variantColorMatches(variant, color) {
  if (!color) return true;
  const labels = [variant.colorName, variant.color, variant.colour]
    .filter((label) => label != null)
    .map((label) => String(label).trim().toLowerCase());
  return labels.includes(color.trim().toLowerCase());
}

function variantSizeMatches(variant, size) {
  if (!size) return true;
  if (variant.size != null && String(variant.size).trim()) {
    return String(variant.size).trim().toLowerCase() === size.trim().toLowerCase();
  }
  if (variant.sizesStock && Object.prototype.hasOwnProperty.call(variant.sizesStock, size)) {
    return true;
  }
  if (Array.isArray(variant.selectedSizes) && variant.selectedSizes.length) {
    return variant.selectedSizes.some((availableSize) => String(availableSize).toLowerCase() === size.toLowerCase());
  }
  return true;
}

function findVariant(variants, item) {
  return variants.find((variant) => (
    variant &&
    typeof variant === "object" &&
    variantColorMatches(variant, item.variantColor) &&
    variantSizeMatches(variant, item.variantSize)
  ));
}

function decreaseVariantStock(variant, item) {
  if (variant.sizesStock && typeof variant.sizesStock === "object" && item.variantSize) {
    if (!Object.prototype.hasOwnProperty.call(variant.sizesStock, item.variantSize)) {
      throw requestError(409, `The selected size "${item.variantSize}" is no longer available.`);
    }
    const available = Number(variant.sizesStock[item.variantSize]);
    if (!Number.isFinite(available) || available < item.quantity) {
      throw requestError(409, "There is not enough stock for the selected product variant.");
    }
    variant.sizesStock[item.variantSize] = available - item.quantity;
    variant.stock = Object.values(variant.sizesStock).reduce((sum, quantity) => sum + (Number(quantity) || 0), 0);
    return;
  }

  if (variant.stock != null) {
    const available = Number(variant.stock);
    if (!Number.isFinite(available) || available < item.quantity) {
      throw requestError(409, "There is not enough stock for the selected product variant.");
    }
    variant.stock = available - item.quantity;
  }
}

function getProductImage(productData, variant) {
  const variantImages = Array.isArray(variant?.images) ? variant.images : [];
  if (variant?.image || variantImages[0]) return variant.image || variantImages[0];

  const images = Array.isArray(productData.images) ? productData.images : [];
  const mainImageIndex = Number(productData.main_image_index) || 0;
  return images[mainImageIndex] || images[0] || productData.image || "";
}

function mapOrder(row) {
  return {
    ...row,
    order_id: `ORD${String(row.id).padStart(5, "0")}`,
    total_amount: Number(row.total_amount),
    subtotal: Number(row.total_amount),
    items: parseStoredItems(row.items),
  };
}

function createOrderService(pool) {
  async function getById(id) {
    const [rows] = await pool.execute("SELECT * FROM orders WHERE id = ? LIMIT 1", [id]);
    return rows[0] ? mapOrder(rows[0]) : null;
  }

  return {
    async create(body) {
      const order = normalizeOrder(body);
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const orderItems = [];
        let totalAmount = 0;

        for (const item of order.items) {
          const [products] = await connection.execute(
            `SELECT id, name, selling_price, offer_price, total_stock, status, product_data
             FROM products WHERE id = ? FOR UPDATE`,
            [item.productId],
          );
          const product = products[0];
          if (!product) throw requestError(404, "A selected product no longer exists.");
          if (product.status !== "Active") throw requestError(409, `${product.name} is not available for sale.`);

          const productStock = Number(product.total_stock);
          if (!Number.isInteger(productStock) || productStock < item.quantity) {
            throw requestError(409, `There is not enough stock for ${product.name}.`);
          }

          const productData = parseProductData(product.product_data);
          const variants = Array.isArray(productData.variants) ? productData.variants : [];
          const variant = variants.length ? findVariant(variants, item) : null;
          if (variants.length && !variant) {
            throw requestError(409, `The selected variant for ${product.name} is no longer available.`);
          }
          if (variant) decreaseVariantStock(variant, item);

          const price = Number(
            variant?.selling_price ??
            variant?.offer_price ??
            product.selling_price ??
            product.offer_price,
          );
          if (!Number.isFinite(price) || price < 0) {
            throw requestError(409, `A valid price is unavailable for ${product.name}.`);
          }

          const lineTotal = Math.round((price * item.quantity + Number.EPSILON) * 100) / 100;
          totalAmount = Math.round((totalAmount + lineTotal + Number.EPSILON) * 100) / 100;
          const newProductStock = productStock - item.quantity;

          await connection.execute(
            "UPDATE products SET total_stock = ?, product_data = ? WHERE id = ?",
            [newProductStock, JSON.stringify(productData), product.id],
          );

          orderItems.push({
            product_id: product.id,
            product_name: product.name,
            name: product.name,
            price,
            quantity: item.quantity,
            total: lineTotal,
            variant_color: item.variantColor,
            variant_size: item.variantSize,
            image: getProductImage(productData, variant),
          });
        }

        const [result] = await connection.execute(
          `INSERT INTO orders
           (user_id, customer_name, customer_email, customer_phone, address, street_address,
            city, district, state, country, zip_code, order_type, payment_method,
            payment_status, status, total_amount, items)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?)`,
          [
            order.userId,
            order.customerName,
            order.customerEmail,
            order.customerPhone,
            order.address || order.streetAddress,
            order.streetAddress,
            order.city,
            order.district || null,
            order.state,
            order.country,
            order.zipCode,
            order.orderType,
            order.paymentMethod,
            order.status,
            totalAmount,
            JSON.stringify(orderItems),
          ],
        );

        await connection.commit();
        return {
          id: result.insertId,
          order_id: `ORD${String(result.insertId).padStart(5, "0")}`,
          order_type: order.orderType,
          status: order.status,
          payment_status: "Pending",
          payment_method: order.paymentMethod,
          total_amount: totalAmount,
          items: orderItems,
        };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async list(status) {
      const normalizedStatus = typeof status === "string" && status.toLowerCase() !== "all"
        ? status.trim()
        : "";
      const [rows] = await pool.execute(
        `SELECT * FROM orders
         ${normalizedStatus ? "WHERE status = ?" : ""}
         ORDER BY created_at DESC, id DESC
         LIMIT 500`,
        normalizedStatus ? [normalizedStatus] : [],
      );
      return rows.map(mapOrder);
    },

    getById,
  };
}

module.exports = {
  createOrderService,
  normalizeOrder,
};
