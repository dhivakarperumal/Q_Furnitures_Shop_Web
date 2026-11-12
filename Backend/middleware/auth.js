const jwt = require("jsonwebtoken");

function requireAuthentication(request, response, next) {
  const authorization = request.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return response.status(401).json({ message: "Sign in with a valid Bearer token to continue." });
  }

  try {
    request.auth = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return response.status(401).json({ message: "The access token is invalid or expired. Sign in again." });
  }
}

function requireAdmin(request, response, next) {
  if (request.auth?.role !== "admin") {
    return response.status(403).json({ message: "Administrator access is required." });
  }
  return next();
}

module.exports = { requireAuthentication, requireAdmin };
