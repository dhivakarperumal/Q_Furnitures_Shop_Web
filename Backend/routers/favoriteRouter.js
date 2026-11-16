const express = require("express");
const { requireAuthentication } = require("../middleware/auth");

function createFavoriteRouter(favoriteController) {
  const router = express.Router();

  router.use(requireAuthentication);
  router.get("/", favoriteController.list);
  router.post("/", favoriteController.add);
  router.delete("/:productId", favoriteController.remove);

  return router;
}

module.exports = createFavoriteRouter;
