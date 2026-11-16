const test = require("node:test");
const assert = require("node:assert/strict");
const { createOfferService } = require("./offerService");

test("lists only active offers selected for the website header", async () => {
  let executedQuery = "";
  const expectedOffers = [{ id: 3, title: "Weekend offer" }];
  const service = createOfferService({
    async execute(query) {
      executedQuery = query;
      return [expectedOffers];
    },
  });

  assert.deepEqual(await service.listHeaderOffers(), expectedOffers);
  assert.match(executedQuery, /status = 'active'/);
  assert.match(executedQuery, /show_in_header = 1/);
});
