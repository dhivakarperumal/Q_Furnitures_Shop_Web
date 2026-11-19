function createCartController(cartService) {
  return {
    async list(request, response, next) {
      try {
        return response.json(await cartService.list(request.auth.user_id));
      } catch (error) {
        return next(error);
      }
    },

    async add(request, response, next) {
      try {
        const item = await cartService.add(request.auth.user_id, request.body || {});
        return response.status(201).json({ message: "Product added to cart.", item });
      } catch (error) {
        if ([400, 404, 409].includes(error.status)) {
          return response.status(error.status).json({ message: error.message });
        }
        return next(error);
      }
    },

    async updateQuantity(request, response, next) {
      try {
        const item = await cartService.updateQuantity(
          request.auth.user_id,
          request.params.itemId,
          request.body?.quantity,
        );
        return response.json({ item });
      } catch (error) {
        if ([400, 404, 409].includes(error.status)) {
          return response.status(error.status).json({ message: error.message });
        }
        return next(error);
      }
    },

    async remove(request, response, next) {
      try {
        const removed = await cartService.remove(request.auth.user_id, request.params.itemId);
        if (!removed) return response.status(404).json({ message: "Cart item was not found." });
        return response.status(204).end();
      } catch (error) {
        if (error.status === 400) {
          return response.status(400).json({ message: error.message });
        }
        return next(error);
      }
    },

    async clear(request, response, next) {
      try {
        await cartService.clear(request.auth.user_id);
        return response.status(204).end();
      } catch (error) {
        return next(error);
      }
    },
  };
}

module.exports = { createCartController };
