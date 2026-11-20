const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const cors = require("cors");
const express = require("express");
const { createPool, initializeDatabase } = require("./src/modules/db");
const { createAuthService } = require("./src/modules/authService");
const { createUserAddressService } = require("./src/modules/userAddressService");
const { createAuthController } = require("./src/controllers/authController");
const { createFavoriteController } = require("./src/controllers/favoriteController");
const { createCartController } = require("./src/controllers/cartController");
const { createCategoryService } = require("./src/modules/categoryService");
const { createProductService } = require("./src/modules/productService");
const { createComboService } = require("./src/modules/comboService");
const { createOrderService } = require("./src/modules/orderService");
const { createRazorpayService } = require("./src/modules/razorpayService");
const { createBannerService } = require("./src/modules/bannerService");
const { createDashboardService } = require("./src/modules/dashboardService");
const { createReportsService } = require("./src/modules/reportsService");
const { createReviewService } = require("./src/modules/reviewService");
const { createYoutubeVideoService } = require("./src/modules/youtubeVideoService");
const { createCouponService } = require("./src/modules/couponService");
const { createOfferService } = require("./src/modules/offerService");
const { createDealerService } = require("./src/modules/dealerService");
const { createInvoiceService } = require("./src/modules/invoiceService");
const { createStockService } = require("./src/modules/stockService");
const { createStoreTaxSettingsService } = require("./src/modules/storeTaxSettingsService");
const { createInvoiceProductService } = require("./src/modules/invoiceProductService");
const { createFavoriteService } = require("./src/modules/favoriteService");
const { createCartService } = require("./src/modules/cartService");
const createAuthRouter = require("./src/routers/authRouter");
const createCategoryRouter = require("./src/routers/categoryRouter");
const createProductRouter = require("./src/routers/productRouter");
const createComboRouter = require("./src/routers/comboRouter");
const createOrderRouter = require("./src/routers/orderRouter");
const createBannerRouter = require("./src/routers/bannerRouter");
const createDashboardRouter = require("./src/routers/dashboardRouter");
const createReportsRouter = require("./src/routers/reportsRouter");
const createReviewRouter = require("./src/routers/reviewRouter");
const createYoutubeVideoRouter = require("./src/routers/youtubeVideoRouter");
const createCouponRouter = require("./src/routers/couponRouter");
const createOfferRouter = require("./src/routers/offerRouter");
const { createPublicBannerRouter } = require("./src/routers/bannerRouter");
const createUserRouter = require("./src/routers/userRouter");
const createDealerRouter = require("./src/routers/dealerRouter");
const createInvoiceRouter = require("./src/routers/invoiceRouter");
const createStockRouter = require("./src/routers/stockRouter");
const createStoreTaxSettingsRouter = require("./src/routers/storeTaxSettingsRouter");
const createInvoiceProductRouter = require("./src/routers/invoiceProductRouter");
const createFavoriteRouter = require("./src/routers/favoriteRouter");
const createCartRouter = require("./src/routers/cartRouter");
const { createUploadRouter } = require("./src/routers/uploadRouter");
const { requireApiAuthentication } = require("./src/middleware/auth");

const port = Number(process.env.PORT || 5000);
const categoryOwnerUserId = "0af825ec-57bc-4be2-b60a-51c1d301071e";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

const pool = createPool();
const app = express();
let startupState = "initializing";
const authService = createAuthService(pool);
const userAddressService = createUserAddressService(pool);
const authController = createAuthController(authService);
const categoryService = createCategoryService(pool);
const productService = createProductService(pool);
const comboService = createComboService(pool);
const orderService = createOrderService(pool);
const razorpayService = createRazorpayService();
const bannerService = createBannerService(pool);
const dashboardService = createDashboardService(pool);
const reportsService = createReportsService(pool);
const reviewService = createReviewService(pool);
const youtubeVideoService = createYoutubeVideoService(pool);
const couponService = createCouponService(pool);
const offerService = createOfferService(pool);
const dealerService = createDealerService(pool);
const stockService = createStockService(pool);
const storeTaxSettingsService = createStoreTaxSettingsService(pool);
const invoiceService = createInvoiceService(pool, stockService);
const invoiceProductService = createInvoiceProductService(pool);
const favoriteService = createFavoriteService(pool);
const favoriteController = createFavoriteController(favoriteService);
const cartService = createCartService(pool);
const cartController = createCartController(cartService);

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads"), { dotfiles: "deny", index: false }));
app.get("/", (request, response) => {
  response.type("html").send("<!doctype html><html><body>Backend is running.</body></html>");
});
app.get("/api/health", async (request, response) => {
  if (startupState !== "ready") {
    response.status(503).json({ status: startupState, database: "unavailable" });
    return;
  }

  try {
    await pool.query("SELECT 1");
    response.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Database health check failed:", error);
    response.status(503).json({ status: "error", database: "unavailable" });
  }
});
app.use("/api", (request, response, next) => {
  if (startupState === "ready") {
    next();
    return;
  }

  response.status(503).json({
    message: startupState === "initializing"
      ? "Backend is initializing."
      : "Backend initialization failed.",
  });
});
app.use("/api/auth", createAuthRouter(authController));
app.use("/api", requireApiAuthentication);
app.use("/api/categories", createCategoryRouter(categoryService));
app.use("/api/products", createProductRouter(productService));
app.use("/api/combos", createComboRouter(comboService));
app.use("/api/favorites", createFavoriteRouter(favoriteController));
app.use("/api/cart", createCartRouter(cartController));
app.use("/api/coupons", createCouponRouter(couponService));
app.use("/api/offers", createOfferRouter(offerService));
app.use("/api/orders", createOrderRouter(orderService, cartService, razorpayService, storeTaxSettingsService));
app.use("/api/dashboard", createDashboardRouter(dashboardService));
app.use("/api/reports", createReportsRouter(reportsService));
app.use("/api/banners", createPublicBannerRouter(bannerService));
app.use("/api/banners", createBannerRouter(bannerService));
app.use("/api/admin/banners", createBannerRouter(bannerService));
app.use("/api/reviews", createReviewRouter(reviewService));
app.use("/api/admin/content/youtube-videos", createYoutubeVideoRouter(youtubeVideoService));
app.use("/api/dealers", createDealerRouter(dealerService));
app.use("/api/invoices", createInvoiceRouter(invoiceService));
app.use("/api/stock", createStockRouter(stockService));
app.use("/api/settings", createStoreTaxSettingsRouter(storeTaxSettingsService));
app.use("/api/invoice-products", createInvoiceProductRouter(invoiceProductService));
app.use("/api/users", createUserRouter(authService, userAddressService));
app.use("/api/auth/users", createUserRouter(authService, userAddressService));
app.use("/api", createUploadRouter(authService));

app.use((error, request, response, next) => {
  console.error("Backend request failed:", error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500
    ? error.status
    : 500;
  response.status(status).json({ message: status === 500 ? "Internal server error." : error.message });
});

async function start() {
  app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
  });

  try {
    await initializeDatabase(pool);
    await categoryService.seedDefaults();
    await categoryService.assignExistingToUser(categoryOwnerUserId);
    await productService.seedFurnitureProducts();
    startupState = "ready";
    console.log("Backend initialization completed (database connected).");
  } catch (error) {
    startupState = "failed";
    console.error("Could not initialize the configured MySQL database:", error);
  }
}

const isPassengerProcess = Boolean(process.env.PASSENGER_APP_ENV || process.env.PASSENGER_APP_ROOT);

if (require.main === module || isPassengerProcess) {
  start();
}

module.exports = { app, start };
