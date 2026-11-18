const ORDER_STATUSES = new Set([
  "Order Placed",
  "Packing",
  "Shipping",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
]);
const PAYMENT_METHODS = new Set(["Cash", "UPI", "Card", "Online"]);

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

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function readAmount(value, field, { fallback = 0, max = 9999999999.99 } = {}) {
  const amount = value == null || value === "" ? fallback : Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > max) {
    throw requestError(400, `${field} must be between 0 and ${max}.`);
  }
  return roundCurrency(amount);
}

function readDateTime(value, field) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw requestError(400, `${field} must be a valid date.`);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw requestError(400, `${field} must be a valid date.`);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function calculateOrderAmounts(subtotal, discountType, discountValue, gstRate, taxMode = "Tax Exclusive") {
  const discountAmount = discountType === "percentage"
    ? roundCurrency(subtotal * discountValue / 100)
    : discountValue;
  if (discountAmount > subtotal) {
    throw requestError(400, "Fixed discount cannot exceed the order subtotal.");
  }
  const discountedSubtotal = roundCurrency(subtotal - discountAmount);
  const gstAmount = taxMode === "Tax Inclusive"
    ? roundCurrency(discountedSubtotal * gstRate / (100 + gstRate))
    : roundCurrency(subtotal * gstRate / 100);
  return {
    discountAmount,
    gstAmount,
    totalAmount: taxMode === "Tax Inclusive"
      ? discountedSubtotal
      : roundCurrency(subtotal + gstAmount - discountAmount),
  };
}

function calculateCartTotals(items, gstRate = 3, taxMode = "Tax Exclusive") {
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    throw requestError(400, "Add between 1 and 100 cart items.");
  }

  const subtotal = items.reduce((total, item, index) => {
    const price = Number(item?.price);
    const quantity = Number(item?.quantity);
    if (!Number.isFinite(price) || price < 0 ||
        !Number.isSafeInteger(quantity) || quantity < 1) {
      throw requestError(409, `Cart item ${index + 1} has invalid pricing or quantity.`);
    }
    return roundCurrency(total + roundCurrency(price * quantity));
  }, 0);

  return {
    subtotal,
    ...calculateOrderAmounts(subtotal, "percentage", 0, gstRate, taxMode),
  };
}

function normalizeOrder(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw requestError(400, "Order data must be an object.");
  }

  const orderType = readText(body.order_type, "Order type", { fallback: "Shop" });
  if (orderType.toLowerCase() !== "shop") {
    throw requestError(400, "Only shop orders can be created from this page.");
  }
  const fulfillmentType = readText(body.fulfillment_type, "Fulfillment type", {
    fallback: "Delivery",
    max: 16,
  });
  if (!["Delivery", "Pickup"].includes(fulfillmentType)) {
    throw requestError(400, "Fulfillment type must be Delivery or Pickup.");
  }
  const requiresDeliveryAddress = fulfillmentType === "Delivery";

  const paymentMethod = readText(body.payment_method, "Payment method", { fallback: "Cash" });
  if (!PAYMENT_METHODS.has(paymentMethod)) {
    throw requestError(400, "Payment method must be Cash, UPI, or Card.");
  }

  const discountType = readText(body.discount_type, "Discount type", { fallback: "percentage" });
  if (!["percentage", "fixed"].includes(discountType)) {
    throw requestError(400, "Discount type must be percentage or fixed.");
  }
  const discountValue = readAmount(body.discount_value, "Discount value", {
    max: discountType === "percentage" ? 100 : 9999999999.99,
  });
  const gstRate = readAmount(body.gst_rate, "GST rate", { fallback: 3, max: 100 });
  const taxMode = readText(body.tax_mode, "Tax mode", { fallback: "Tax Exclusive", max: 20 });
  if (!["Tax Exclusive", "Tax Inclusive"].includes(taxMode)) {
    throw requestError(400, "Tax mode must be Tax Exclusive or Tax Inclusive.");
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

    const hasProductId = item.product_id != null && item.product_id !== "";
    const hasComboId = item.combo_id != null && item.combo_id !== "";
    const productId = hasProductId ? Number(item.product_id) : null;
    const comboId = hasComboId ? Number(item.combo_id) : null;
    const quantity = Number(item.quantity);
    if (hasProductId === hasComboId ||
        (hasProductId && (!Number.isSafeInteger(productId) || productId < 1)) ||
        (hasComboId && (!Number.isSafeInteger(comboId) || comboId < 1))) {
      throw requestError(400, `Order item ${index + 1} must identify one valid product or combo.`);
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) {
      throw requestError(400, `Order item ${index + 1} quantity must be a whole number between 1 and 10,000.`);
    }

    let comboItems = null;
    if (hasComboId && Array.isArray(item.combo_items)) {
      comboItems = item.combo_items.map((component, componentIndex) => {
        const componentProductId = Number(component?.product_id);
        const componentQuantity = Number(component?.quantity);
        const variantIndex = Number(component?.variant_index || 0);
        if (!Number.isSafeInteger(componentProductId) || componentProductId < 1 ||
            !Number.isSafeInteger(componentQuantity) || componentQuantity < 1 ||
            !Number.isSafeInteger(variantIndex) || variantIndex < 0) {
          throw requestError(400, `Combo component ${componentIndex + 1} is invalid.`);
        }
        return {
          product_id: componentProductId,
          quantity: componentQuantity,
          variant_index: variantIndex,
          variant_color: readText(component.variant_color, "Variant colour", { max: 100 }),
          variant_size: readText(component.variant_size, "Variant size", { max: 100 }),
        };
      });
    }

    return {
      productId,
      comboId,
      quantity,
      variantColor: readText(item.variant_color, "Variant colour", { max: 100 }),
      variantSize: readText(item.variant_size, "Variant size", { max: 100 }),
      comboItems,
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
    address: requiresDeliveryAddress ? readText(body.address, "Address", { max: 2000 }) : "",
    streetAddress: requiresDeliveryAddress
      ? readText(body.street_address || body.address, "Street address", { required: true, max: 255 })
      : "",
    city: requiresDeliveryAddress ? readText(body.city, "City", { required: true }) : "",
    district: requiresDeliveryAddress ? readText(body.district, "District") : "",
    state: requiresDeliveryAddress ? readText(body.state, "State", { required: true }) : "",
    country: requiresDeliveryAddress ? readText(body.country, "Country", { fallback: "India" }) : "",
    zipCode: requiresDeliveryAddress ? readText(body.zip_code, "ZIP code", { required: true, max: 32 }) : "",
    orderType: "Shop",
    fulfillmentType,
    paymentMethod,
    discountType,
    discountValue,
    gstRate,
    taxMode,
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

function mapOrderItem(row) {
  const comboSnapshot = row.combo_snapshot == null ? {} : parseProductData(row.combo_snapshot);
  return {
    ...row,
    product_id: row.product_id == null ? null : Number(row.product_id),
    combo_id: row.combo_id == null ? null : Number(row.combo_id),
    item_type: row.combo_id == null && row.combo_snapshot == null ? "product" : "combo",
    product_name: row.product_name,
    name: row.product_name,
    price: Number(row.price),
    quantity: Number(row.quantity),
    total: Number(row.total),
    combo_items: Array.isArray(comboSnapshot.combo_items) ? comboSnapshot.combo_items : [],
  };
}

function mapOrder(row, address, items) {
  const shippingAddress = address
    ? {
      user_id: address.user_id || null,
      customer_name: address.customer_name,
      customer_email: address.customer_email,
      customer_phone: address.customer_phone,
      address: address.address || address.street_address,
      street_address: address.street_address,
      city: address.city,
      district: address.district,
      state: address.state,
      country: address.country,
      zip_code: address.zip_code,
    }
    : {};
  return {
    ...row,
    ...shippingAddress,
    shipping_address: address ? shippingAddress : null,
    order_id: row.order_id || `ORD${String(row.id).padStart(4, "0")}`,
    total_amount: Number(row.total_amount),
    subtotal: Number(row.subtotal ?? row.total_amount),
    discount_type: row.discount_type || "percentage",
    discount_value: Number(row.discount_value || 0),
    discount_amount: Number(row.discount_amount || 0),
    gst_rate: Number(row.gst_rate || 0),
    gst_amount: Number(row.gst_amount || 0),
    items,
  };
}

function createOrderService(pool) {
  async function hydrateOrders(rows) {
    if (!rows.length) return [];

    const ids = rows.map((row) => row.id);
    const placeholders = ids.map(() => "?").join(", ");
    const [addressResult, itemResult] = await Promise.all([
      pool.execute(
        `SELECT * FROM \`address\` WHERE order_id IN (${placeholders})`,
        ids,
      ),
      pool.execute(
        `SELECT * FROM order_items
         WHERE order_id IN (${placeholders})
         ORDER BY order_id, id`,
        ids,
      ),
    ]);
    const [addresses] = addressResult;
    const [items] = itemResult;
    const addressesByOrderId = new Map(addresses.map((address) => [String(address.order_id), address]));
    const mappedItems = items.map(mapOrderItem);
    const comboComponentIds = [...new Set(mappedItems.flatMap((item) =>
      item.combo_items
        .map((component) => Number(component.product_id))
        .filter((productId) => Number.isSafeInteger(productId) && productId > 0),
    ))];
    const productsById = new Map();
    if (comboComponentIds.length) {
      const [products] = await pool.execute(
        `SELECT id, name, product_data FROM products
         WHERE id IN (${comboComponentIds.map(() => "?").join(", ")})`,
        comboComponentIds,
      );
      for (const product of products) {
        productsById.set(Number(product.id), product);
      }
    }

    const itemsByOrderId = new Map();
    for (const item of mappedItems) {
      if (item.combo_items.length) {
        item.combo_items = item.combo_items.map((component) => {
          const productId = Number(component.product_id);
          const product = productsById.get(productId);
          const productData = product ? parseProductData(product.product_data) : {};
          const variants = Array.isArray(productData.variants) ? productData.variants : [];
          const variant = variants[Number(component.variant_index) || 0] || null;
          return {
            ...component,
            product_id: productId,
            product_name: component.product_name || product?.name || `Product #${productId}`,
            image: component.image || getProductImage(productData, variant),
          };
        });
      }
      const key = String(item.order_id);
      if (!itemsByOrderId.has(key)) itemsByOrderId.set(key, []);
      itemsByOrderId.get(key).push(item);
    }

    return rows.map((row) => mapOrder(
      row,
      addressesByOrderId.get(String(row.id)),
      itemsByOrderId.get(String(row.id)) || [],
    ));
  }

  async function getById(id) {
    const [rows] = await pool.execute("SELECT * FROM orders WHERE id = ? LIMIT 1", [id]);
    if (!rows[0]) return null;
    const [order] = await hydrateOrders(rows);
    return order;
  }

  return {
    async create(body, options = {}) {
      const order = normalizeOrder(body);
      const paymentStatus = options.paymentStatus || "Pending";
      if (!["Pending", "Paid"].includes(paymentStatus)) {
        throw requestError(400, "Payment status is invalid.");
      }
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const orderItems = [];
        let subtotal = 0;

        for (const [itemIndex, item] of order.items.entries()) {
          if (item.comboId != null) {
            const [comboRows] = await connection.execute(
              "SELECT id, name, offer_price, status, combo_data FROM combos WHERE id = ? FOR UPDATE",
              [item.comboId],
            );
            const combo = comboRows[0];
            if (!combo) throw requestError(404, "A selected combo no longer exists.");
            if (combo.status !== "Active") throw requestError(409, `${combo.name} is not available for sale.`);
            const comboData = parseProductData(combo.combo_data);
            const comboItems = item.comboItems?.length ? item.comboItems : comboData.combo_items;
            if (!Array.isArray(comboItems) || !comboItems.length) {
              throw requestError(409, `${combo.name} does not have any available component products.`);
            }
            const seenComponentIds = new Set();
            for (const component of comboItems) {
              const componentId = Number(component.product_id);
              if (seenComponentIds.has(componentId)) {
                throw requestError(409, `${combo.name} contains a duplicate component product.`);
              }
              seenComponentIds.add(componentId);
            }
            const componentIds = [...new Set(comboItems.map((component) => Number(component.product_id)))]
              .sort((left, right) => left - right);
            if (componentIds.some((id) => !Number.isSafeInteger(id) || id < 1)) {
              throw requestError(409, `${combo.name} contains an invalid component product.`);
            }
            const [components] = await connection.execute(
              `SELECT p.id, p.name, p.product_code, p.status, p.total_stock, p.product_data,
                      ps.available_stock
               FROM products p
               LEFT JOIN product_stock ps ON ps.product_id = p.id
               WHERE p.id IN (${componentIds.map(() => "?").join(",")})
               ORDER BY p.id FOR UPDATE`,
              componentIds,
            );
            const componentById = new Map(components.map((component) => [Number(component.id), component]));
            if (componentById.size !== componentIds.length) {
              throw requestError(409, `${combo.name} includes a component product that no longer exists.`);
            }

            for (const componentItem of comboItems) {
              const component = componentById.get(Number(componentItem.product_id));
              if (!component || component.status !== "Active") {
                throw requestError(409, `${component?.name || "A combo component"} is not available for sale.`);
              }
              const requiredQuantity = Number(componentItem.quantity) * item.quantity;
              if (!Number.isSafeInteger(requiredQuantity) || requiredQuantity < 1) {
                throw requestError(409, `${combo.name} has an invalid component quantity.`);
              }
              const totalStock = Number(component.total_stock);
              const availableStock = component.available_stock == null
                ? totalStock
                : Math.min(totalStock, Number(component.available_stock));
              if (!Number.isFinite(availableStock) || availableStock < requiredQuantity) {
                throw requestError(409, `There is not enough stock for ${component.name}.`);
              }

              const componentData = parseProductData(component.product_data);
              const variants = Array.isArray(componentData.variants) ? componentData.variants : [];
              const variantIndex = Number(componentItem.variant_index || 0);
              const variant = variants[variantIndex];
              if (!variants.length && variantIndex !== 0) {
                throw requestError(409, `The selected variant for ${component.name} is no longer available.`);
              }
              if (variants.length && !variant) {
                throw requestError(409, `The selected variant for ${component.name} is no longer available.`);
              }
              const selectedComponent = {
                variantColor: componentItem.variant_color || "",
                variantSize: componentItem.variant_size || "",
              };
              if (variant && (!variantColorMatches(variant, selectedComponent.variantColor) ||
                  !variantSizeMatches(variant, selectedComponent.variantSize))) {
                throw requestError(409, `The selected variant for ${component.name} has changed.`);
              }
              if (variant) {
                const componentQuantity = { ...selectedComponent, quantity: requiredQuantity };
                decreaseVariantStock(variant, componentQuantity);
              }

              await connection.execute(
                "UPDATE products SET total_stock = ?, product_data = ? WHERE id = ?",
                [totalStock - requiredQuantity, JSON.stringify(componentData), component.id],
              );
              await connection.execute(
                `INSERT INTO product_stock (product_id, available_stock)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE available_stock = VALUES(available_stock)`,
                [component.id, availableStock - requiredQuantity],
              );
            }

            const cartPrice = options.useCartPrices ? Number(body.items[itemIndex]?.price) : null;
            const price = options.useCartPrices ? roundCurrency(cartPrice) : Number(combo.offer_price);
            if (!Number.isFinite(price) || price < 0) {
              throw requestError(409, `A valid price is unavailable for ${combo.name}.`);
            }
            const lineTotal = roundCurrency(price * item.quantity);
            subtotal = roundCurrency(subtotal + lineTotal);
            const image = getProductImage(comboData, null);
            orderItems.push({
              product_id: null,
              combo_id: combo.id,
              combo_snapshot: { combo_items: comboItems },
              product_name: combo.name,
              name: combo.name,
              price,
              quantity: item.quantity,
              total: lineTotal,
              variant_color: "",
              variant_size: "",
              image,
            });
            continue;
          }

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

          const cartPrice = options.useCartPrices ? Number(body.items[itemIndex]?.price) : null;
          const price = options.useCartPrices
            ? roundCurrency(cartPrice)
            : Number(
              variant?.selling_price ??
              variant?.offer_price ??
              product.selling_price ??
              product.offer_price,
            );
          if (!Number.isFinite(price) || price < 0) {
            throw requestError(409, `A valid price is unavailable for ${product.name}.`);
          }

          const lineTotal = Math.round((price * item.quantity + Number.EPSILON) * 100) / 100;
          subtotal = roundCurrency(subtotal + lineTotal);
          const newProductStock = productStock - item.quantity;

          await connection.execute(
            "UPDATE products SET total_stock = ?, product_data = ? WHERE id = ?",
            [newProductStock, JSON.stringify(productData), product.id],
          );

          orderItems.push({
            product_id: product.id,
            combo_id: null,
            combo_snapshot: null,
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

        const { discountAmount, gstAmount, totalAmount } = calculateOrderAmounts(
          subtotal,
          order.discountType,
          order.discountValue,
          order.gstRate,
          order.taxMode,
        );

        const [result] = await connection.execute(
          `INSERT INTO orders
           (user_id, customer_name, customer_email, customer_phone, order_type, fulfillment_type, payment_method,
            payment_status, status, subtotal, discount_type, discount_value, discount_amount,
             gst_rate, tax_mode, gst_amount, total_amount, razorpay_order_id, razorpay_payment_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            order.userId,
            order.customerName,
            order.customerEmail,
            order.customerPhone,
            order.orderType,
            order.fulfillmentType,
            order.paymentMethod,
            paymentStatus,
            order.status,
            subtotal,
            order.discountType,
            order.discountValue,
            discountAmount,
            order.gstRate,
            order.taxMode,
            gstAmount,
            totalAmount,
            options.razorpayOrderId || null,
            options.razorpayPaymentId || null,
          ],
        );
        const orderId = `ORD${String(result.insertId).padStart(4, "0")}`;
        await connection.execute(
          "UPDATE orders SET order_id = ? WHERE id = ?",
          [orderId, result.insertId],
        );

        if (order.fulfillmentType === "Delivery") {
          await connection.execute(
            `INSERT INTO \`address\`
             (order_id, user_id, customer_name, customer_email, customer_phone, address,
              street_address, city, district, state, country, zip_code)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              result.insertId,
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
            ],
          );
        }

        for (const item of orderItems) {
          await connection.execute(
            `INSERT INTO order_items
             (order_id, product_id, combo_id, combo_snapshot, product_name, price, quantity,
              total, variant_color, variant_size, image)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              result.insertId,
              item.product_id,
              item.combo_id,
              item.combo_snapshot ? JSON.stringify(item.combo_snapshot) : null,
              item.product_name,
              item.price,
              item.quantity,
              item.total,
              item.variant_color,
              item.variant_size,
              item.image || null,
            ],
          );
        }

        await connection.commit();
        return {
          id: result.insertId,
          order_id: orderId,
          order_type: order.orderType,
          fulfillment_type: order.fulfillmentType,
          status: order.status,
          payment_status: paymentStatus,
          payment_method: order.paymentMethod,
          subtotal,
          discount_type: order.discountType,
          discount_value: order.discountValue,
          discount_amount: discountAmount,
          gst_rate: order.gstRate,
          tax_mode: order.taxMode,
          gst_amount: gstAmount,
          total_amount: totalAmount,
          razorpay_order_id: options.razorpayOrderId || null,
          razorpay_payment_id: options.razorpayPaymentId || null,
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
      return hydrateOrders(rows);
    },

    async listForUser(userId) {
      const [rows] = await pool.execute(
        `SELECT * FROM orders
         WHERE user_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT 500`,
        [userId],
      );
      return hydrateOrders(rows);
    },

    async updateStatus(id, body) {
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw requestError(400, "Order status data must be an object.");
      }

      const status = readText(body.status, "Order status", { required: true });
      if (!ORDER_STATUSES.has(status)) {
        throw requestError(400, "Order status is invalid.");
      }

      const assignments = ["status = ?"];
      const values = [status];
      if (status === "Shipping") {
        assignments.push("tracking_number = ?", "courier_name = ?");
        values.push(
          readText(body.tracking_number, "Tracking number", { required: true }),
          readText(body.courier_name, "Courier name", { required: true }),
        );
        if (body.shipped_at != null && body.shipped_at !== "") {
          assignments.push("shipped_at = ?");
          values.push(readDateTime(body.shipped_at, "Shipped date"));
        }
      } else if (status === "Cancelled") {
        assignments.push("cancellation_reason = ?");
        values.push(readText(body.cancellation_reason, "Cancellation reason", {
          required: true,
          max: 5000,
        }));
        if (body.cancelled_at != null && body.cancelled_at !== "") {
          assignments.push("cancelled_at = ?");
          values.push(readDateTime(body.cancelled_at, "Cancellation date"));
        }
      }

      await pool.execute(
        `UPDATE orders SET ${assignments.join(", ")} WHERE id = ?`,
        [...values, id],
      );
      const order = await getById(id);
      if (!order) throw requestError(404, "Order was not found.");
      return order;
    },

    async getByRazorpayPaymentId(paymentId) {
      const [rows] = await pool.execute(
        "SELECT id FROM orders WHERE razorpay_payment_id = ? LIMIT 1",
        [paymentId],
      );
      return rows[0] ? getById(rows[0].id) : null;
    },

    getById,
  };
}

module.exports = {
  createOrderService,
  normalizeOrder,
  calculateOrderAmounts,
  calculateCartTotals,
};
