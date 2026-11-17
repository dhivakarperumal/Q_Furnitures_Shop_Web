const express = require("express");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");

function createUserRouter(authService) {
  const router = express.Router();

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

  router.get("/", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      return response.json(await authService.listUsers());
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = createUserRouter;
