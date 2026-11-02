function createAuthController(authService) {
  return {
    async register(request, response, next) {
      const body = request.body || {};
      const username = typeof body.username === "string" ? body.username.trim() : "";
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const phone = typeof body.phone === "string" ? body.phone.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";

      if (username.length < 2 || username.length > 120) {
        return response.status(400).json({ message: "Name must be between 2 and 120 characters." });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191) {
        return response.status(400).json({ message: "Enter a valid email address." });
      }
      if (phone.length < 6 || phone.length > 32) {
        return response.status(400).json({ message: "Enter a valid phone number." });
      }
      if (password.length < 8 || password.length > 72) {
        return response.status(400).json({ message: "Password must be between 8 and 72 characters." });
      }

      try {
        const user = await authService.register({ username, email, phone, password });
        return response.status(201).json({ message: "Registration successful.", user });
      } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
          return response.status(409).json({ message: "An account with this email or phone already exists." });
        }
        return next(error);
      }
    },

    async login(request, response, next) {
      const body = request.body || {};
      const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";

      if (!identifier || !password) {
        return response.status(400).json({ message: "Username, email, or mobile number and password are required." });
      }

      try {
        const result = await authService.login(identifier, password);
        if (!result) {
          return response.status(401).json({ message: "Invalid username, email, mobile number, or password." });
        }
        if (result.inactive) {
          return response.status(403).json({ message: "This account is inactive. Contact support for assistance." });
        }
        return response.json(result);
      } catch (error) {
        return next(error);
      }
    },

    async googleLogin(request, response, next) {
      const credential = typeof request.body?.credential === "string" ? request.body.credential : "";
      if (!credential) {
        return response.status(400).json({ message: "Google credential is required." });
      }

      try {
        return response.json(await authService.googleLogin(credential));
      } catch (error) {
        if (error.status === 401 && error.cause) {
          console.error("Google credential verification failed:", error.cause.message);
        }
        if (error.status) {
          return response.status(error.status).json({ message: error.message });
        }
        return next(error);
      }
    },
  };
}

module.exports = { createAuthController };
