const assert = require("node:assert/strict");
const { test } = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const createOrderRouter = require("./orderRouter");

async function withRouter(orderService, cartService, handler) {
  const app = express();
  app.use(express.json());
  app.use("/orders", createOrderRouter(orderService, cartService));
  const server = app.listen(0);
  try {
    await new Promise((resolve) => server.once("listening", resolve));
    const address = server.address();
    return await handler(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("customer checkout creates an order from their saved cart and authenticated identity", async () => {
  process.env.JWT_SECRET = "order-router-test-secret";
  let createdOrder;
  const orderService = {
    async create(order) {
      createdOrder = order;
      return { order_id: "ORD0001" };
    },
  };
  const cartService = {
    async list(userId) {
      assert.equal(userId, "customer-1");
      return [{
        product_id: 7,
        quantity: 2,
        price: 999999,
        colorName: "Walnut",
        size: "Queen",
      }];
    },
  };
  const token = jwt.sign({ user_id: "customer-1", role: "user" }, process.env.JWT_SECRET);

  await withRouter(orderService, cartService, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/orders/checkout`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        user_id: "another-user",
        discount_type: "fixed",
        discount_value: 100,
        gst_rate: 0,
        status: "Cancelled",
        items: [{ product_id: 999, quantity: 50 }],
        customer_name: "Customer One",
        customer_phone: "9876543210",
        street_address: "10 Market Road",
        city: "Chennai",
        state: "Tamil Nadu",
        zip_code: "600001",
        payment_method: "Cash",
      }),
    });

    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { order_id: "ORD0001" });
    assert.equal(createdOrder.user_id, "customer-1");
    assert.equal(createdOrder.status, "Order Placed");
    assert.equal(createdOrder.discount_value, 0);
    assert.equal(createdOrder.gst_rate, 3);
    assert.deepEqual(createdOrder.items, [{
      product_id: 7,
      quantity: 2,
      variant_color: "Walnut",
      variant_size: "Queen",
    }]);
  });
});

test("customer checkout rejects an empty cart", async () => {
  process.env.JWT_SECRET = "order-router-test-secret";
  const token = jwt.sign({ user_id: "customer-1" }, process.env.JWT_SECRET);

  await withRouter(
    { async create() { assert.fail("An order must not be created for an empty cart."); } },
    { async list() { return []; } },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/orders/checkout`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      });

      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { message: "Your cart is empty." });
    },
  );
});

test("admin can update an order status through the status endpoint", async () => {
  process.env.JWT_SECRET = "order-router-test-secret";
  let updatedId;
  let updatedDetails;
  const token = jwt.sign({ user_id: "admin-1", role: "admin" }, process.env.JWT_SECRET);
  const orderService = {
    async updateStatus(id, details) {
      updatedId = id;
      updatedDetails = details;
      return { id, status: details.status };
    },
  };

  await withRouter(orderService, {}, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/orders/6/status`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ status: "Packing" }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { id: 6, status: "Packing" });
    assert.equal(updatedId, 6);
    assert.deepEqual(updatedDetails, { status: "Packing" });
  });
});
