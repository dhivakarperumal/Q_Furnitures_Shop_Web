const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const express = require("express");
const jwt = require("jsonwebtoken");
const { createUploadRouter, uploadsDirectory } = require("./uploadRouter");

test("combo image uploads are saved under the combo uploads directory", async (t) => {
  const secret = "combo-upload-test-secret";
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  const app = express();
  app.use("/api", createUploadRouter({}));
  app.use((error, request, response, next) => {
    response.status(error.status || 500).json({ message: error.message });
  });
  const server = app.listen(0);
  let uploadedFilePath;
  t.after(async () => {
    if (uploadedFilePath) await fs.rm(uploadedFilePath, { force: true });
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  await new Promise((resolve) => server.once("listening", resolve));

  const payload = new FormData();
  payload.append("images", new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], {
    type: "image/png",
  }), "combo.png");
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/combos/upload`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${jwt.sign({ role: "admin", user_id: "admin-1" }, secret)}`,
    },
    body: payload,
  });

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.images.length, 1);
  assert.match(body.images[0], /^\/uploads\/combo\/[0-9a-f-]+\.png$/);
  uploadedFilePath = path.join(uploadsDirectory, "combo", path.basename(body.images[0]));
  await assert.doesNotReject(fs.access(uploadedFilePath));
});
