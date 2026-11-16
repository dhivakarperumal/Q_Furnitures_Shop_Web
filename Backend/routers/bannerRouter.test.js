const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeBanner } = require("./bannerRouter");

const validBanner = {
  title: "  Spring Sale  ",
  desktop_image: "/uploads/banners/spring.webp",
};

test("normalizes banner content and applies defaults", () => {
  assert.deepEqual(normalizeBanner(validBanner), {
    title: "Spring Sale",
    subtitle: "",
    description: "",
    offer: "",
    destination_link: "",
    destination_links: [],
    target_section: "hero",
    is_published: 1,
    desktop_image: "/uploads/banners/spring.webp",
    mobile_image: null,
  });
});

test("accepts mobile visuals, section and draft status", () => {
  assert.equal(normalizeBanner({
    ...validBanner,
    target_section: "offers",
    is_published: "false",
    mobile_image: "/uploads/banners/spring-mobile.jpg",
  }).is_published, 0);
  assert.equal(normalizeBanner({
    ...validBanner,
    target_section: "offers",
  }).target_section, "offers");
});

test("normalizes bare destinations to internal paths", () => {
  assert.equal(normalizeBanner({
    ...validBanner,
    destination_link: "wetwtw",
  }).destination_link, "/wetwtw");
});

test("normalizes and validates multiple labeled destinations", () => {
  const banner = normalizeBanner({
    ...validBanner,
    destination_links: [
      { label: " Shop now ", url: "shop" },
      { label: "Read more", url: "https://example.com/collection" },
    ],
  });
  assert.deepEqual(banner.destination_links, [
    { label: "Shop now", url: "/shop" },
    { label: "Read more", url: "https://example.com/collection" },
  ]);
  assert.equal(banner.destination_link, "/shop");
  assert.throws(() => normalizeBanner({
    ...validBanner,
    destination_links: [{ label: "Shop", url: "javascript:alert(1)" }],
  }), { status: 400 });
});

test("preserves typed banner offers and rejects values that are too long", () => {
  assert.equal(normalizeBanner({ ...validBanner, offer: "10% OFF" }).offer, "10% OFF");
  assert.equal(normalizeBanner({ ...validBanner, offer: "  Weekend deal  " }).offer, "Weekend deal");
  assert.throws(() => normalizeBanner({ ...validBanner, offer: "x".repeat(81) }), { status: 400 });
});

test("rejects unsafe links and invalid banner fields", () => {
  assert.throws(() => normalizeBanner({ ...validBanner, destination_link: "javascript:alert(1)" }), { status: 400 });
  assert.throws(() => normalizeBanner({ ...validBanner, destination_link: "//example.com" }), { status: 400 });
  assert.throws(() => normalizeBanner({ ...validBanner, desktop_image: "data:image/svg+xml,..."}), { status: 400 });
  assert.throws(() => normalizeBanner({ ...validBanner, target_section: "footer" }), { status: 400 });
  assert.throws(() => normalizeBanner({ ...validBanner, is_published: "yes" }), { status: 400 });
});
