const test = require("node:test");
const assert = require("node:assert/strict");

const requiredEnvironment = {
  DB_HOST: "127.0.0.1",
  DB_PORT: "3306",
  DB_USER: "startup-test",
  DB_NAME: "startup_test",
  PORT: "5000",
  JWT_SECRET: "startup-test-secret",
};
const previousEnvironment = Object.fromEntries(
  Object.keys(requiredEnvironment).map((key) => [key, process.env[key]]),
);
Object.assign(process.env, requiredEnvironment);
const { app } = require("./index");
for (const [key, value] of Object.entries(previousEnvironment)) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

test("serves Passenger requests while database initialization is pending", async () => {
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise((resolve) => server.once("listening", resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const rootResponse = await fetch(baseUrl);
    assert.equal(rootResponse.status, 200);

    const healthResponse = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthResponse.status, 503);
    assert.deepEqual(await healthResponse.json(), {
      status: "initializing",
      database: "unavailable",
    });

    const apiResponse = await fetch(`${baseUrl}/api/products`);
    assert.equal(apiResponse.status, 503);
    assert.deepEqual(await apiResponse.json(), {
      message: "Backend is initializing.",
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
