function parseProductId(value) {
  const stringValue = String(value ?? "");
  const productId = Number(stringValue);
  if (!/^\d+$/.test(stringValue) || !Number.isSafeInteger(productId) || productId < 1) {
    const error = new Error("Product ID must be a positive integer.");
    error.status = 400;
    throw error;
  }
  return productId;
}

function createFavoriteController(favoriteService) {
  return {
    async list(request, response, next) {
      try {
        return response.json(await favoriteService.listByUser(request.auth.user_id));
      } catch (error) {
        return next(error);
      }
    },

    async add(request, response, next) {
      let productId;
      try {
        productId = parseProductId(request.body?.product_id);
      } catch (error) {
        return response.status(error.status).json({ message: error.message });
      }

      try {
        const added = await favoriteService.add(request.auth.user_id, productId);
        if (!added) return response.status(404).json({ message: "Active product was not found." });
        return response.status(201).json({ message: "Product added to favorites." });
      } catch (error) {
        return next(error);
      }
    },

    async remove(request, response, next) {
      let productId;
      try {
        productId = parseProductId(request.params.productId);
      } catch (error) {
        return response.status(error.status).json({ message: error.message });
      }

      try {
        await favoriteService.remove(request.auth.user_id, productId);
        return response.status(204).end();
      } catch (error) {
        return next(error);
      }
    },
  };
}

module.exports = { createFavoriteController };
