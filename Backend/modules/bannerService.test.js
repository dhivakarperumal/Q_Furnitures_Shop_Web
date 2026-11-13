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
