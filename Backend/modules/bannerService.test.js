const test = require("node:test");
const assert = require("node:assert/strict");
const { createBannerService } = require("./bannerService");

test("updating an unchanged banner still returns the stored record", async () => {
  const banner = {
    id: 4,
    title: "Spring sale",
    subtitle: "",
    description: "",
    offer: "",
    destination_link: "",
    target_section: "hero",
    is_published: 1,
    desktop_image: "/uploads/banners/spring.webp",
    mobile_image: null,
  };
  const pool = {
    async execute(sql) {
      if (sql.startsWith("UPDATE banners")) return [{ affectedRows: 0 }];
      return [[banner]];
    },
  };
  const service = createBannerService(pool);

  assert.deepEqual(await service.update(banner.id, banner), banner);
});

test("lists only published hero banners for the public home page", async () => {
  const banners = [{ id: 7, target_section: "hero", is_published: 1 }];
  let query;
  const service = createBannerService({
    async execute(sql) {
      query = sql;
      return [banners];
    },
  });

  assert.deepEqual(await service.listPublishedHero(), banners);
  assert.match(query, /WHERE is_published = 1 AND target_section = 'hero'/);
});

test("lists only published offer banners for the public home page", async () => {
  const banners = [{ id: 8, target_section: "offers", is_published: 1 }];
  let query;
  const service = createBannerService({
    async execute(sql) {
      query = sql;
      return [banners];
    },
  });

  assert.deepEqual(await service.listPublishedOffers(), banners);
  assert.match(query, /WHERE is_published = 1 AND target_section = 'offers'/);
});

test("stores multiple destination buttons and mirrors the first legacy link", async () => {
  const destinationLinks = [
    { label: "Shop now", url: "/shop" },
    { label: "View collection", url: "/collections/new" },
  ];
  const banner = {
    id: 8,
    title: "New collection",
    subtitle: "",
    description: "",
    offer: "",
    destination_link: "/shop",
    destination_links: destinationLinks,
    target_section: "hero",
    is_published: 1,
    desktop_image: "/uploads/banners/new.webp",
    mobile_image: null,
  };
  let insertParams;
  const pool = {
    async execute(sql, params) {
      if (sql.startsWith("INSERT INTO banners")) {
        insertParams = params;
        return [{ insertId: banner.id }];
      }
      return [[banner]];
    },
  };
  const service = createBannerService(pool);

  assert.deepEqual(await service.create(banner), banner);
  assert.equal(insertParams[4], "/shop");
  assert.deepEqual(JSON.parse(insertParams[5]), destinationLinks);
});
