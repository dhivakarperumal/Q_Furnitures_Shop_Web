const express = require("express");

function createAuthRouter(authController) {
  const router = express.Router();

  router.get("/", (request, response) => {
    response.json({
      message: "Authentication API",
      endpoints: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        googleLogin: "POST /api/auth/google-login",
        listUsers: "GET /api/auth/users (admin Bearer token required)",
      },
    });
  });
  router.post("/register", authController.register);
  router.post("/login", authController.login);
  router.post("/google-login", authController.googleLogin);

  return router;
}

module.exports = createAuthRouter;
