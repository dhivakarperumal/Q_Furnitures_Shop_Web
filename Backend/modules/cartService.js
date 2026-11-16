const { toProduct } = require("./productService");
const { PRODUCT_SNAPSHOT_FIELDS } = require("./productSnapshotFields");

function cartError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizePositiveInteger(value, field, maximum = 10000) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > maximum) {
    throw cartError(400, `${field} must be a whole number between 1 and ${maximum}.`);
  }
  return number;
}

function matchesVariant(variant, color, size) {
  const colors = [variant.color, variant.colorName, variant.colour]
    .filter((value) => value != null)
    .map((value) => String(value).trim().toLowerCase());
  const normalizedColor = color.trim().toLowerCase();
  if (normalizedColor && normalizedColor !== "default" &&
      colors.length && !colors.includes(normalizedColor)) return false;

  if (size && variant.size != null && String(variant.size).trim()) {
    return String(variant.size).trim().toLowerCase() === size.toLowerCase();
  }
  if (size && Array.isArray(variant.selectedSizes) && variant.selectedSizes.length) {
    return variant.selectedSizes.some((availableSize) =>
      String(availableSize).trim().toLowerCase() === size.toLowerCase());
  }
  if (size && variant.sizesStock && typeof variant.sizesStock === "object") {
    return Object.prototype.hasOwnProperty.call(variant.sizesStock, size);
  }
  return true;
}

function getSelectedVariant(product, color, size) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (!variants.length) return null;
  const variant = variants.find((candidate) => matchesVariant(candidate, color, size));
  if (!variant) {
    throw cartError(409, "The selected product variant is not available.");
  }
  return variant;
}

function getAvailableStock(product, variant, size) {
  if (variant?.sizesStock && Object.prototype.hasOwnProperty.call(variant.sizesStock, size)) {
    return Number(variant.sizesStock[size]) || 0;
  }
  if (variant?.stock != null) return Number(variant.stock) || 0;
  return Number(product.available_stock ?? product.total_stock ?? 0) || 0;
}

function getUnitPrice(product, variant) {
  let value = variant?.selling_price ?? variant?.offer_price;
  if (value == null && variant?.mrp != null) {
    const mrp = Number(variant.mrp);
    const offer = Number(variant.offer) || 0;
    value = variant.offer_type === "Fixed Amount"
      ? mrp - offer
      : mrp * (1 - offer / 100);
  }
  if (value == null) value = product.selling_price ?? product.offer_price;
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0) {
    throw cartError(409, "A valid price is unavailable for this product.");
  }
  return Math.round((price + Number.EPSILON) * 100) / 100;
}

function getImageList(product) {
  return Array.isArray(product.images)
    ? product.images
    : typeof product.image === "string" && product.image ? [product.image] : [];
}

function getCartImage(product, variant) {
  if (variant?.image) return variant.image;
  if (Array.isArray(variant?.images) && variant.images[0]) return variant.images[0];
  const images = getImageList(product);
  return images[Number(product.main_image_index) || 0] || images[0] || null;
}

function toSnapshotProduct(product) {
  const specifications = product.specifications || {};
  const shipping = product.shipping || {};
  const images = getImageList(product);
  return {
    ...product,
    image: (typeof product.image === "string" && product.image) ||
      images[Number(product.main_image_index) || 0] || images[0] || null,
    material_type: product.material_type || specifications.materialType,
    wood_type: product.wood_type || specifications.woodType,
    colour: product.colour || specifications.colour,
    finish_type: product.finish_type || specifications.finishType,
    height: product.height ?? specifications.height,
    width: product.width ?? specifications.width,
    depth: product.depth ?? specifications.depth,
    weight: product.weight ?? specifications.weight,
    seating_capacity: product.seating_capacity ?? specifications.seatingCapacity,
    doors: product.doors ?? specifications.doors,
    drawers: product.drawers ?? specifications.drawers,
    mattress_size: product.mattress_size || specifications.mattressSize,
    warranty_period: product.warranty_period || specifications.warrantyPeriod,
    country_of_origin: product.country_of_origin || specifications.countryOfOrigin,
    package_length: product.package_length ?? shipping.packageLength,
    package_width: product.package_width ?? shipping.packageWidth,
    package_height: product.package_height ?? shipping.packageHeight,
    delivery_available: product.delivery_available ?? shipping.deliveryAvailable,
    delivery_charges: product.delivery_charges ?? shipping.deliveryCharges,
    free_delivery: product.free_delivery ?? shipping.freeDelivery,
    estimated_delivery_days: product.estimated_delivery_days ?? shipping.estimatedDeliveryDays,
    assembly_required: product.assembly_required ?? shipping.assemblyRequired,
    installation_available: product.installation_available ?? shipping.installationAvailable,
    return_policy: product.return_policy || shipping.returnPolicy,
  };
}

function mapCartItem(row) {
  return {
    ...row,
    id: Number(row.id),
    product_id: Number(row.product_id),
    quantity: Number(row.quantity),
    price: Number(row.price),
    total_price: Number(row.total_price),
    name: row.product_name,
    image: row.cart_image || row.image || null,
    colorName: row.variant_color || "",
    color: row.variant_color || "",
    size: row.variant_size || "",
  };
}

function createCartService(pool) {
  async function getProductForUpdate(connection, productId) {
    const [rows] = await connection.execute(
      `SELECT p.*, ps.available_stock, ps.reserved_stock, ps.damaged_stock,
              ps.minimum_stock, ps.stock_type, ps.deduction_rule
       FROM products p
       LEFT JOIN product_stock ps ON ps.product_id = p.id
       WHERE p.id = ? LIMIT 1 FOR UPDATE`,
      [productId],
    );
    if (!rows[0]) throw cartError(404, "Product was not found.");
    if (rows[0].status !== "Active") throw cartError(409, "This product is not available for sale.");
    return { row: rows[0], product: toProduct(rows[0]) };
  }

  return {
    async list(userId) {
      const [rows] = await pool.execute(
        `SELECT * FROM user_cart_items
         WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
        [userId],
      );
      return rows.map(mapCartItem);
    },

    async add(userId, input) {
      const productId = normalizePositiveInteger(input.product_id, "Product ID", Number.MAX_SAFE_INTEGER);
      const quantity = normalizePositiveInteger(input.quantity ?? 1, "Quantity");
      const color = typeof input.variant_color === "string" ? input.variant_color.trim().slice(0, 100) : "";
      const size = typeof input.variant_size === "string" ? input.variant_size.trim().slice(0, 100) : "";

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const { product: storedProduct } = await getProductForUpdate(connection, productId);
        const selectedVariant = getSelectedVariant(storedProduct, color, size);
        const canonicalColor = selectedVariant
          ? String(selectedVariant.colorName || selectedVariant.color || selectedVariant.colour || color || "Default").slice(0, 100)
          : color || "Default";
        const canonicalSize = selectedVariant
          ? String(
            selectedVariant.size ||
            (selectedVariant.sizesStock && Object.prototype.hasOwnProperty.call(selectedVariant.sizesStock, size)
              ? size
              : size || selectedVariant.selectedSizes?.[0] || "Free Size"),
          ).slice(0, 100)
          : size || "Free Size";
        const availableStock = getAvailableStock(storedProduct, selectedVariant, canonicalSize);
        const price = getUnitPrice(storedProduct, selectedVariant);

        const [existingRows] = await connection.execute(
          `SELECT id, quantity FROM user_cart_items
           WHERE user_id = ? AND product_id = ? AND variant_color = ? AND variant_size = ?
           LIMIT 1 FOR UPDATE`,
          [userId, productId, canonicalColor, canonicalSize],
        );
        const existing = existingRows[0];
        const nextQuantity = Number(existing?.quantity || 0) + quantity;
        if (nextQuantity > availableStock) {
          throw cartError(409, `Only ${availableStock} item${availableStock === 1 ? "" : "s"} available.`);
        }

        const product = toSnapshotProduct(storedProduct);
        const cartImage = getCartImage(product, selectedVariant);
        const fields = PRODUCT_SNAPSHOT_FIELDS.map(([column]) => column);
        const fieldValues = PRODUCT_SNAPSHOT_FIELDS.map(([, , key]) => {
          const value = product[key];
          return value === "" || value == null ? null : value;
        });
        let cartItemId;
        if (existing) {
          const setFields = fields.map((field) => `${field} = ?`).join(", ");
          const [updateResult] = await connection.execute(
            `UPDATE user_cart_items
             SET ${setFields}, variant_color = ?, variant_size = ?, cart_image = ?,
                 price = ?, quantity = ?, total_price = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ?`,
            [
              ...fieldValues, canonicalColor, canonicalSize, cartImage, price, nextQuantity,
              Number((price * nextQuantity).toFixed(2)), userId, existing.id, userId,
            ],
          );
          if (updateResult.affectedRows !== 1) throw new Error("Cart item could not be updated.");
          cartItemId = existing.id;
        } else {
          const columns = [
            "user_id", "product_id", "variant_color", "variant_size", "cart_image",
            ...fields, "price", "quantity", "total_price", "created_by", "updated_by",
          ];
          const values = [
            userId, productId, canonicalColor, canonicalSize, cartImage,
            ...fieldValues, price, nextQuantity, Number((price * nextQuantity).toFixed(2)), userId, userId,
          ];
          const [insertResult] = await connection.execute(
            `INSERT INTO user_cart_items (${columns.join(", ")})
             VALUES (${columns.map(() => "?").join(", ")})`,
            values,
          );
          cartItemId = insertResult.insertId;
        }

        await connection.commit();
        return { id: Number(cartItemId), quantity: nextQuantity, price, total_price: Number((price * nextQuantity).toFixed(2)) };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async updateQuantity(userId, cartItemIdValue, quantityValue) {
      const cartItemId = normalizePositiveInteger(cartItemIdValue, "Cart item ID", Number.MAX_SAFE_INTEGER);
      const quantity = normalizePositiveInteger(quantityValue, "Quantity");
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [initialCartRows] = await connection.execute(
          `SELECT * FROM user_cart_items
           WHERE id = ? AND user_id = ? LIMIT 1`,
          [cartItemId, userId],
        );
        const initialCartItem = initialCartRows[0];
        if (!initialCartItem) throw cartError(404, "Cart item was not found.");

        const { product } = await getProductForUpdate(connection, initialCartItem.product_id);
        const [cartRows] = await connection.execute(
          `SELECT * FROM user_cart_items
           WHERE id = ? AND user_id = ? LIMIT 1 FOR UPDATE`,
          [cartItemId, userId],
        );
        const cartItem = cartRows[0];
        if (!cartItem) throw cartError(404, "Cart item was not found.");
        const selectedVariant = getSelectedVariant(
          product,
          cartItem.variant_color,
          cartItem.variant_size,
        );
        const availableStock = getAvailableStock(product, selectedVariant, cartItem.variant_size);
        if (quantity > availableStock) {
          throw cartError(409, `Only ${availableStock} item${availableStock === 1 ? "" : "s"} available.`);
        }
        const totalPrice = Number((Number(cartItem.price) * quantity).toFixed(2));
        await connection.execute(
          `UPDATE user_cart_items
           SET quantity = ?, total_price = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND user_id = ?`,
          [quantity, totalPrice, userId, cartItemId, userId],
        );
        await connection.commit();
        return { id: cartItemId, quantity, price: Number(cartItem.price), total_price: totalPrice };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async remove(userId, cartItemIdValue) {
      const cartItemId = normalizePositiveInteger(cartItemIdValue, "Cart item ID", Number.MAX_SAFE_INTEGER);
      const [result] = await pool.execute(
        "DELETE FROM user_cart_items WHERE id = ? AND user_id = ?",
        [cartItemId, userId],
      );
      return result.affectedRows > 0;
    },

    async clear(userId) {
      const [result] = await pool.execute(
        "DELETE FROM user_cart_items WHERE user_id = ?",
        [userId],
      );
      return result.affectedRows;
    },
  };
}

module.exports = { createCartService };
