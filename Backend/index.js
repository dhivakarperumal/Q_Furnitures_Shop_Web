const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const cors = require("cors");
const express = require("express");
const { createPool, initializeDatabase } = require("./modules/db");
const { createAuthService } = require("./modules/authService");
const { createUserAddressService } = require("./modules/userAddressService");
const { createAuthController } = require("./controllers/authController");
const { createFavoriteController } = require("./controllers/favoriteController");
const { createCartController } = require("./controllers/cartController");
const { createCategoryService } = require("./modules/categoryService");
const { createProductService } = require("./modules/productService");
const { createComboService } = require("./modules/comboService");
const { createOrderService } = require("./modules/orderService");
const { createRazorpayService } = require("./modules/razorpayService");
const { createBannerService } = require("./modules/bannerService");
const { createDashboardService } = require("./modules/dashboardService");
const { createReportsService } = require("./modules/reportsService");
const { createReviewService } = require("./modules/reviewService");
const { createYoutubeVideoService } = require("./modules/youtubeVideoService");
const { createCouponService } = require("./modules/couponService");
const { createOfferService } = require("./modules/offerService");
const { createDealerService } = require("./modules/dealerService");
const { createInvoiceService } = require("./modules/invoiceService");
const { createStockService } = require("./modules/stockService");
const { createStoreTaxSettingsService } = require("./modules/storeTaxSettingsService");
const { createInvoiceProductService } = require("./modules/invoiceProductService");
const { createFavoriteService } = require("./modules/favoriteService");
const { createCartService } = require("./modules/cartService");
const createAuthRouter = require("./routers/authRouter");
const createCategoryRouter = require("./routers/categoryRouter");
const createProductRouter = require("./routers/productRouter");
const createComboRouter = require("./routers/comboRouter");
const createOrderRouter = require("./routers/orderRouter");
const createBannerRouter = require("./routers/bannerRouter");
const createDashboardRouter = require("./routers/dashboardRouter");
const createReportsRouter = require("./routers/reportsRouter");
const createReviewRouter = require("./routers/reviewRouter");
const createYoutubeVideoRouter = require("./routers/youtubeVideoRouter");
const createCouponRouter = require("./routers/couponRouter");
const createOfferRouter = require("./routers/offerRouter");
const { createPublicBannerRouter } = require("./routers/bannerRouter");
const createUserRouter = require("./routers/userRouter");
const createDealerRouter = require("./routers/dealerRouter");
const createInvoiceRouter = require("./routers/invoiceRouter");
const createStockRouter = require("./routers/stockRouter");
const createStoreTaxSettingsRouter = require("./routers/storeTaxSettingsRouter");
const createInvoiceProductRouter = require("./routers/invoiceProductRouter");
const createFavoriteRouter = require("./routers/favoriteRouter");
const createCartRouter = require("./routers/cartRouter");
const { createUploadRouter } = require("./routers/uploadRouter");

const port = Number(process.env.PORT || 5000);
const categoryOwnerUserId = "0af825ec-57bc-4be2-b60a-51c1d301071e";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

const pool = createPool();
const app = express();
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
app.get("/api/health", async (request, response) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Database health check failed:", error);
    response.status(503).json({ status: "error", database: "unavailable" });
  }
});
app.use("/api/auth", createAuthRouter(authController));
app.use("/api/categories", createCategoryRouter(categoryService));
app.use("/api/products", createProductRouter(productService));
app.use("/api/combos", createComboRouter(comboService));
app.use("/api/favorites", createFavoriteRouter(favoriteController));
app.use("/api/cart", createCartRouter(cartController));
app.use("/api/coupons", createCouponRouter(couponService));
app.use("/api/offers", createOfferRouter(offerService));
app.use("/api/orders", createOrderRouter(orderService, cartService, razorpayService));
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
  try {
    await initializeDatabase(pool);
    await categoryService.seedDefaults();
    await categoryService.assignExistingToUser(categoryOwnerUserId);
    await productService.seedFurnitureProducts();

    app.listen(port, () => {
      console.log(`Backend listening on http://localhost:${port} (database connected)`);
    });
  } catch (error) {
    console.error("Could not initialize the configured MySQL database:", error);
    await pool.end();
    process.exitCode = 1;
  }
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
