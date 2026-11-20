const express = require("express");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");

function createUserRouter(authService, userAddressService) {
  const router = express.Router();

  function parseAddressId(value) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id < 1) {
      const error = new Error("Address ID is invalid.");
      error.status = 400;
      throw error;
    }
    return id;
  }

  router.get("/me", requireAuthentication, async (request, response, next) => {
    try {
      const user = await authService.getProfile(request.auth.id);
      if (!user) return response.status(404).json({ message: "Account was not found." });
      return response.json(user);
    } catch (error) {
      if (error.status) return response.status(error.status).json({ message: error.message });
      return next(error);
    }
  });

  router.put("/me", requireAuthentication, async (request, response, next) => {
    try {
      const user = await authService.updateProfile(request.auth.id, request.body);
      return response.json({ user });
    } catch (error) {
      if (error.status) return response.status(error.status).json({ message: error.message });
      return next(error);
    }
  });

  router.put("/me/password", requireAuthentication, async (request, response, next) => {
    try {
      await authService.changePassword(
        request.auth.id,
        request.body?.currentPassword,
        request.body?.newPassword,
      );
      return response.json({ message: "Password updated successfully." });
    } catch (error) {
      if (error.status) return response.status(error.status).json({ message: error.message });
      return next(error);
    }
  });

  router.get("/me/addresses", requireAuthentication, async (request, response, next) => {
    try {
      return response.json(await userAddressService.listForUser(request.auth.user_id));
    } catch (error) {
      if (error.status) return response.status(error.status).json({ message: error.message });
      return next(error);
    }
  });

  router.post("/me/addresses", requireAuthentication, async (request, response, next) => {
    try {
      const address = await userAddressService.create(request.auth.user_id, request.body);
      return response.status(201).json(address);
    } catch (error) {
      if (error.status) return response.status(error.status).json({ message: error.message });
      return next(error);
    }
  });

  router.put("/me/addresses/:id", requireAuthentication, async (request, response, next) => {
    try {
      const address = await userAddressService.update(
        request.auth.user_id,
        parseAddressId(request.params.id),
        request.body,
      );
      return response.json(address);
    } catch (error) {
      if (error.status) return response.status(error.status).json({ message: error.message });
      return next(error);
    }
  });

  router.put("/me/addresses/:id/default", requireAuthentication, async (request, response, next) => {
    try {
      const address = await userAddressService.setDefault(
        request.auth.user_id,
        parseAddressId(request.params.id),
      );
      return response.json(address);
    } catch (error) {
      if (error.status) return response.status(error.status).json({ message: error.message });
      return next(error);
    }
  });

  router.delete("/me/addresses/:id", requireAuthentication, async (request, response, next) => {
    try {
      await userAddressService.delete(
        request.auth.user_id,
        parseAddressId(request.params.id),
      );
      return response.status(204).end();
    } catch (error) {
      if (error.status) return response.status(error.status).json({ message: error.message });
      return next(error);
    }
  });

  router.delete("/me", requireAuthentication, async (request, response, next) => {
    try {
      await authService.deleteUser(request.auth.id);
      return response.json({ message: "Account deleted successfully.", deleted: true });
    } catch (error) {
      if (error.status) return response.status(error.status).json({ message: error.message });
      return next(error);
    }
  });

  router.get("/", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      return response.json(await authService.listUsers());
    } catch (error) {
      return next(error);
    }
  });

  router.put("/:id", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      const id = Number(request.params.id);
      if (!Number.isSafeInteger(id) || id < 1) {
        return response.status(400).json({ message: "User ID is invalid." });
      }
      return response.json({ user: await authService.updateUser(id, request.body) });
    } catch (error) {
      if (error.status) return response.status(error.status).json({ message: error.message });
      return next(error);
    }
  });

  router.delete("/:id", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      const id = Number(request.params.id);
      if (!Number.isSafeInteger(id) || id < 1) {
        return response.status(400).json({ message: "User ID is invalid." });
      }
      const user = await authService.deleteUser(id);
      return response.json({ message: "User account deleted successfully.", user });
    } catch (error) {
      if (error.status) return response.status(error.status).json({ message: error.message });
      return next(error);
    }
  });

  return router;
}

module.exports = createUserRouter;
