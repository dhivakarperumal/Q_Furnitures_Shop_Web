const jwt = require("jsonwebtoken");

const PUBLIC_SUMMARY_ROUTES = new Set([
  "GET /api/offers",
  "GET /api/categories",
  "GET /api/products",
  "GET /api/products/rooms",
  "GET /api/combos",
  "GET /api/banners/hero",
  "GET /api/banners/offers",
  "GET /api/reviews/published",
]);

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

function requireApiAuthentication(request, response, next) {
  const pathname = request.originalUrl.split("?")[0].replace(/\/+$/, "") || "/";
  if (PUBLIC_SUMMARY_ROUTES.has(`${request.method} ${pathname}`)) {
    return next();
  }
  return requireAuthentication(request, response, next);
}

function requireAdmin(request, response, next) {
  if (request.auth?.role !== "admin") {
    return response.status(403).json({ message: "Administrator access is required." });
  }
  return next();
}

module.exports = { requireAuthentication, requireApiAuthentication, requireAdmin };
