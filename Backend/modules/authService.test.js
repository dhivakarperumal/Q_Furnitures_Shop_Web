const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { createAuthService } = require("./authService");

const originalJwtSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = "auth-service-test-secret";

test.after(() => {
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

test("updates only editable profile fields and returns the public account", async () => {
  const statements = [];
  const pool = {
    async execute(statement, values) {
      statements.push({ statement, values });
      if (statement.startsWith("UPDATE users")) return [{ affectedRows: 1 }];
      return [[{
        id: 7,
        user_id: "customer-7",
        username: "Asha Kumar",
        email: "asha@example.com",
        phone: "9876543210",
        password_hash: "must-not-be-returned",
        role: "customer",
        status: "active",
      }]];
    },
  };
  const service = createAuthService(pool);

  const user = await service.updateProfile(7, {
    name: "  Asha Kumar  ",
    email: " ASHA@EXAMPLE.COM ",
    phone: " 9876543210 ",
    role: "admin",
  });

  assert.deepEqual(statements[0].values, ["Asha Kumar", "asha@example.com", "9876543210", 7]);
  assert.equal(user.name, "Asha Kumar");
  assert.equal(user.role, "customer");
  assert.equal(Object.hasOwn(user, "password_hash"), false);
  assert.equal(statements[1].values[0], 7);
});

test("rejects invalid profile data before making a database change", async () => {
  let executeCount = 0;
  const service = createAuthService({
    async execute() {
      executeCount += 1;
      return [[], []];
    },
  });

  await assert.rejects(
    service.updateProfile(7, { name: "", email: "not-an-email", phone: "" }),
    { status: 400 },
  );
  assert.equal(executeCount, 0);
});

test("changes a password only after verifying the current password", async () => {
  const currentHash = await bcrypt.hash("current-pass-1", 4);
  let updatedHash = "";
  const service = createAuthService({
    async execute(statement, values) {
      if (statement.startsWith("SELECT")) return [[{ password_hash: currentHash }]];
      updatedHash = values[0];
      return [{ affectedRows: 1 }];
    },
  });

  await assert.rejects(
    service.changePassword(7, "incorrect-pass", "new-password-2"),
    { status: 400 },
  );
  assert.equal(updatedHash, "");

  await service.changePassword(7, "current-pass-1", "new-password-2");
  assert.notEqual(updatedHash, "new-password-2");
  assert.equal(await bcrypt.compare("new-password-2", updatedHash), true);
});
