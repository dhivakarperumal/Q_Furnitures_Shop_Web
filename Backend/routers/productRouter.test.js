const assert = require("node:assert/strict");
const { test } = require("node:test");
const express = require("express");
const createProductRouter = require("./productRouter");

async function withRouter(productService, handler) {
  const app = express();
  app.use("/products", createProductRouter(productService));
  const server = app.listen(0);
  try {
    await new Promise((resolve) => server.once("listening", resolve));
    const address = server.address();
    return await handler(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("product list forwards the requested category filter", async () => {
  let listOptions;
  const productService = {
    async list(options) {
      listOptions = options;
      return { products: [], pagination: { total: 0, totalPages: 1 } };
    },
  };

  await withRouter(productService, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/products?category=${encodeURIComponent("Living Room")}`);
    assert.equal(response.status, 200);
    assert.equal(listOptions.category, "Living Room");
  });
});
