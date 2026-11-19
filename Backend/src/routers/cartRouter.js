const express = require("express");
const { requireAuthentication } = require("../middleware/auth");

function createCartRouter(cartController) {
  const router = express.Router();

  router.use(requireAuthentication);
  router.get("/", cartController.list);
  router.post("/", cartController.add);
  router.delete("/clear", cartController.clear);
  router.put("/:itemId", cartController.updateQuantity);
  router.delete("/:itemId", cartController.remove);

  return router;
}

module.exports = createCartRouter;
