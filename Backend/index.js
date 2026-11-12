require("dotenv").config();

const cors = require("cors");
const express = require("express");
const path = require("node:path");
const { createPool, initializeDatabase } = require("./modules/db");
const { createAuthService } = require("./modules/authService");
const { createAuthController } = require("./controllers/authController");
const { createCategoryService } = require("./modules/categoryService");
const { createProductService } = require("./modules/productService");
const createAuthRouter = require("./routers/authRouter");
const createCategoryRouter = require("./routers/categoryRouter");
const createProductRouter = require("./routers/productRouter");
const createUserRouter = require("./routers/userRouter");
const { createUploadRouter } = require("./routers/uploadRouter");

const port = Number(process.env.PORT || 5000);
const categoryOwnerUserId = "0af825ec-57bc-4be2-b60a-51c1d301071e";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

const pool = createPool();
const app = express();
const authService = createAuthService(pool);
const authController = createAuthController(authService);
const categoryService = createCategoryService(pool);
const productService = createProductService(pool);

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
app.use("/api/users", createUserRouter(authService));
app.use("/api/auth/users", createUserRouter(authService));
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
