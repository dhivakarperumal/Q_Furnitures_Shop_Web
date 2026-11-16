const { toProduct } = require("./productService");
const { PRODUCT_SNAPSHOT_FIELDS } = require("./productSnapshotFields");

function getFavoriteProduct(product) {
  const specifications = product.specifications || {};
  const shipping = product.shipping || {};
  return {
    ...product,
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

function getFieldValue(value) {
  return value === "" || value == null ? null : value;
}

async function replaceChildRows(connection, table, userId, productId) {
  await connection.execute(
    `DELETE FROM ${table} WHERE user_id = ? AND product_id = ?`,
    [userId, productId],
  );
}

async function saveChildRows(connection, userId, productId, product) {
  const images = Array.isArray(product.images)
    ? product.images
    : typeof product.image === "string" && product.image ? [product.image] : [];
  const imageRoles = Array.isArray(product.image_roles) ? product.image_roles : [];
  for (const [imageIndex, imageUrl] of images.entries()) {
    if (typeof imageUrl !== "string" || !imageUrl) continue;
    await connection.execute(
      `INSERT INTO user_favorite_images
       (user_id, product_id, image_index, image_url, image_role) VALUES (?, ?, ?, ?, ?)`,
      [userId, productId, imageIndex, imageUrl, imageRoles[imageIndex] || null],
    );
  }

  const variants = Array.isArray(product.variants) ? product.variants : [];
  for (const [variantIndex, variant] of variants.entries()) {
    await connection.execute(
      `INSERT INTO user_favorite_variants
       (user_id, product_id, variant_index, color, size, material, sku, mrp,
        offer_type, offer, selling_price, stock, image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, productId, variantIndex, variant.color || null, variant.size || null,
        variant.material || null, variant.sku || null, variant.mrp ?? null,
        variant.offer_type || null, variant.offer ?? null, variant.selling_price ?? null,
        variant.stock ?? null, variant.image || null,
      ],
    );
    const variantImages = Array.isArray(variant.images) ? variant.images : [];
    for (const [imageIndex, imageUrl] of variantImages.entries()) {
      if (typeof imageUrl !== "string" || !imageUrl) continue;
      await connection.execute(
        `INSERT INTO user_favorite_variant_images
         (user_id, product_id, variant_index, image_index, image_url)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, productId, variantIndex, imageIndex, imageUrl],
      );
    }
  }

  const customizations = Array.isArray(product.customizations) ? product.customizations : [];
  for (const [customizationIndex, customization] of customizations.entries()) {
    await connection.execute(
      `INSERT INTO user_favorite_customizations
       (user_id, product_id, customization_index, name, type, options, additional_price, required)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, productId, customizationIndex, customization.name || null,
        customization.type || null, customization.options || null,
        customization.additionalPrice ?? customization.additional_price ?? null,
        customization.required == null ? null : Number(Boolean(customization.required)),
      ],
    );
  }
}

function createFavoriteService(pool) {
  return {
    async listByUser(userId) {
      const [favorites] = await pool.execute(
        `SELECT favorites.*
         FROM user_favorites favorites
         INNER JOIN products p ON p.id = favorites.product_id
         WHERE favorites.user_id = ? AND p.status = 'Active'
         ORDER BY favorites.created_at DESC, favorites.product_id DESC`,
        [userId],
      );
      if (!favorites.length) return [];

      const productIds = favorites.map((favorite) => favorite.product_id);
      const placeholders = productIds.map(() => "?").join(", ");
      const [images] = await pool.execute(
        `SELECT product_id, image_index, image_url, image_role
         FROM user_favorite_images
         WHERE user_id = ? AND product_id IN (${placeholders})
         ORDER BY product_id, image_index`,
        [userId, ...productIds],
      );
      const [variants] = await pool.execute(
        `SELECT product_id, variant_index, color, size, material, sku, mrp,
                offer_type, offer, selling_price, stock, image
         FROM user_favorite_variants
         WHERE user_id = ? AND product_id IN (${placeholders})
         ORDER BY product_id, variant_index`,
        [userId, ...productIds],
      );
      const [variantImages] = await pool.execute(
        `SELECT product_id, variant_index, image_index, image_url
         FROM user_favorite_variant_images
         WHERE user_id = ? AND product_id IN (${placeholders})
         ORDER BY product_id, variant_index, image_index`,
        [userId, ...productIds],
      );
      const [customizations] = await pool.execute(
        `SELECT product_id, customization_index, name, type, options,
                additional_price AS additionalPrice, required
         FROM user_favorite_customizations
         WHERE user_id = ? AND product_id IN (${placeholders})
         ORDER BY product_id, customization_index`,
        [userId, ...productIds],
      );

      const imagesByProduct = new Map();
      for (const image of images) {
        const list = imagesByProduct.get(image.product_id) || [];
        list.push(image);
        imagesByProduct.set(image.product_id, list);
      }
      const variantsByProduct = new Map();
      for (const variant of variants) {
        const list = variantsByProduct.get(variant.product_id) || [];
        list.push({ ...variant, images: [] });
        variantsByProduct.set(variant.product_id, list);
      }
      for (const image of variantImages) {
        const productVariants = variantsByProduct.get(image.product_id) || [];
        productVariants[image.variant_index]?.images.push(image.image_url);
      }
      const customizationsByProduct = new Map();
      for (const customization of customizations) {
        const list = customizationsByProduct.get(customization.product_id) || [];
        list.push(customization);
        customizationsByProduct.set(customization.product_id, list);
      }

      return favorites.map((favorite) => {
        const productId = favorite.product_id;
        const productImages = imagesByProduct.get(productId) || [];
        const imagesList = productImages.map((image) => image.image_url);
        const mainImageIndex = Number(favorite.main_image_index) || 0;
        return {
          ...favorite,
          id: Number(productId),
          product_id: Number(productId),
          name: favorite.product_name,
          price: Number(favorite.offer_price ?? favorite.selling_price ?? 0),
          images: imagesList,
          image_roles: productImages.map((image) => image.image_role),
          image: imagesList[mainImageIndex] || imagesList[0] || null,
          variants: variantsByProduct.get(productId) || [],
          customizations: customizationsByProduct.get(productId) || [],
        };
      });
    },

    async add(userId, productId) {
      const [products] = await pool.execute(
        `SELECT p.*, ps.available_stock, ps.reserved_stock, ps.damaged_stock,
                ps.minimum_stock, ps.stock_type, ps.deduction_rule
         FROM products p
         LEFT JOIN product_stock ps ON ps.product_id = p.id
         WHERE p.id = ? AND p.status = 'Active'
         LIMIT 1`,
        [productId],
      );
      if (!products.length) return false;

      const product = getFavoriteProduct(toProduct(products[0]));
      const fieldNames = PRODUCT_SNAPSHOT_FIELDS.map(([column]) => column);
      const insertColumns = ["user_id", "product_id", ...fieldNames, "created_by", "updated_by"];
      const values = [
        userId,
        productId,
        ...PRODUCT_SNAPSHOT_FIELDS.map(([, , key]) => getFieldValue(product[key])),
        userId,
        userId,
      ];
      const updates = [
        ...fieldNames.map((column) => `${column} = VALUES(${column})`),
        "updated_by = VALUES(updated_by)",
        "updated_at = CURRENT_TIMESTAMP",
      ];

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.execute(
          `INSERT INTO user_favorites (${insertColumns.join(", ")})
           VALUES (${insertColumns.map(() => "?").join(", ")})
           ON DUPLICATE KEY UPDATE ${updates.join(", ")}`,
          values,
        );
        await replaceChildRows(connection, "user_favorite_images", userId, productId);
        await replaceChildRows(connection, "user_favorite_variants", userId, productId);
        await replaceChildRows(connection, "user_favorite_customizations", userId, productId);
        await saveChildRows(connection, userId, productId, product);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      return true;
    },

    async remove(userId, productId) {
      const [result] = await pool.execute(
        "DELETE FROM user_favorites WHERE user_id = ? AND product_id = ?",
        [userId, productId],
      );
      return result.affectedRows > 0;
    },
  };
}

module.exports = { createFavoriteService };
