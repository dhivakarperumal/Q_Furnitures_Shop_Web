const fs = require("node:fs/promises");
const path = require("node:path");
const express = require("express");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");
const { uploadsDirectory } = require("./uploadRouter");

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function parseId(value) {
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    throw badRequest("Banner ID must be a positive integer.");
  }
  return Number(value);
}

function isSafeImagePath(image) {
  return /^https?:\/\//i.test(image) ||
    (image.startsWith("/") && !image.startsWith("//") && !image.includes("\\"));
}

function normalizeBanner(body, existing = {}) {
  const input = { ...existing, ...body };
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const subtitle = typeof input.subtitle === "string" ? input.subtitle.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const rawOffer = input.offer == null ? "" : input.offer;
  const offer = typeof rawOffer === "string" ? rawOffer.trim() : null;
  const legacyDestinationLink = typeof input.destination_link === "string"
    ? input.destination_link.trim()
    : "";
  const rawDestinationLinks = input.destination_links == null
    ? (legacyDestinationLink ? [{ label: "Shop now", url: legacyDestinationLink }] : [])
    : input.destination_links;
  const targetSection = input.target_section || "hero";
  const rawPublished = input.is_published === undefined ? true : input.is_published;
  const isPublished = rawPublished === true || rawPublished === 1 ||
    rawPublished === "1" || rawPublished === "true";
  const desktopImage = typeof input.desktop_image === "string" ? input.desktop_image.trim() : "";
  const mobileImage = typeof input.mobile_image === "string" ? input.mobile_image.trim() : "";

  if (!title || title.length > 160) {
    throw badRequest("Headline is required and must be 160 characters or fewer.");
  }
  if (subtitle.length > 240) {
    throw badRequest("Subtitle must be 240 characters or fewer.");
  }
  if (description.length > 5000) {
    throw badRequest("Description must be 5,000 characters or fewer.");
  }
  if (offer === null || offer.length > 80) {
    throw badRequest("Offer must be 80 characters or fewer.");
  }
  if (!Array.isArray(rawDestinationLinks) || rawDestinationLinks.length > 10) {
    throw badRequest("Add no more than 10 destination links.");
  }
  const destinationLinks = rawDestinationLinks.map((link) => {
    if (!link || typeof link !== "object" || Array.isArray(link)) {
      throw badRequest("Each destination link must include a label and URL.");
    }
    const label = typeof link.label === "string" ? link.label.trim() : "";
    let url = typeof link.url === "string" ? link.url.trim() : "";
    if (!label || label.length > 60 || !url) {
      throw badRequest("Each destination link needs a label (up to 60 characters) and URL.");
    }
    if (/^https?:\/\//i.test(url)) {
      try {
        const parsedUrl = new URL(url);
        if (!parsedUrl.hostname) throw new Error("Missing hostname");
      } catch {
        throw badRequest("Destination must be a valid http(s) URL.");
      }
    } else {
      if (/^[a-z][a-z\d+.-]*:/i.test(url) ||
          url.startsWith("//") || url.includes("\\")) {
        throw badRequest("Destination must be a relative path or an http(s) URL.");
      }
      if (!url.startsWith("/")) url = `/${url}`;
    }
    if (url.length > 2048) {
      throw badRequest("Destination link must be 2,048 characters or fewer.");
    }
    return { label, url };
  });
  const destinationLink = destinationLinks[0]?.url || "";
  if (!["hero", "offers"].includes(targetSection)) {
    throw badRequest("Target section must be hero or offers.");
  }
  if (![true, false, 1, 0, "true", "false", "1", "0"].includes(rawPublished)) {
    throw badRequest("Published status must be true or false.");
  }
  if (!desktopImage || desktopImage.length > 512) {
    throw badRequest("A desktop banner image is required.");
  }
  if (!isSafeImagePath(desktopImage)) {
    throw badRequest("Desktop image must be a relative path or an http(s) URL.");
  }
  if (mobileImage.length > 512) {
    throw badRequest("Mobile image path must be 512 characters or fewer.");
  }
  if (mobileImage && !isSafeImagePath(mobileImage)) {
    throw badRequest("Mobile image must be a relative path or an http(s) URL.");
  }

  return {
    title,
    subtitle,
    description,
    offer,
    destination_link: destinationLink,
    destination_links: destinationLinks,
    target_section: targetSection,
    is_published: isPublished ? 1 : 0,
    desktop_image: desktopImage,
    mobile_image: mobileImage || null,
  };
}

function getStoredBannerImagePath(image) {
  const prefix = "/uploads/banners/";
  if (typeof image !== "string" || !image.startsWith(prefix)) return null;
  const filename = image.slice(prefix.length);
  if (!/^[\da-f-]+\.(jpg|png|gif|webp)$/i.test(filename) || path.basename(filename) !== filename) return null;
  return path.join(uploadsDirectory, "banners", filename);
}

async function removeReplacedImages(previousBanner, nextBanner) {
  const nextImages = new Set([nextBanner.desktop_image, nextBanner.mobile_image].filter(Boolean));
  const previousImages = [previousBanner.desktop_image, previousBanner.mobile_image]
    .filter((image) => image && !nextImages.has(image));
  await Promise.all(previousImages.map((image) => {
    const filePath = getStoredBannerImagePath(image);
    return filePath ? fs.rm(filePath, { force: true }) : Promise.resolve();
  }));
}

function createBannerRouter(bannerService) {
  const router = express.Router();
  router.use(requireAuthentication, requireAdmin);

  router.get("/", async (request, response, next) => {
    try {
      return response.json({ banners: await bannerService.list() });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/", async (request, response, next) => {
    try {
      const banner = await bannerService.create(normalizeBanner(request.body || {}));
      return response.status(201).json({ banner });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.put("/:id", async (request, response, next) => {
    try {
      const id = parseId(request.params.id);
      const existing = await bannerService.getById(id);
      if (!existing) return response.status(404).json({ message: "Banner was not found." });

      const updated = await bannerService.update(id, normalizeBanner(request.body || {}, existing));
      if (!updated) return response.status(404).json({ message: "Banner was not found." });
      await removeReplacedImages(existing, updated);
      return response.json({ banner: updated });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.delete("/:id", async (request, response, next) => {
    try {
      const banner = await bannerService.delete(parseId(request.params.id));
      if (!banner) return response.status(404).json({ message: "Banner was not found." });
      await removeReplacedImages(banner, { desktop_image: null, mobile_image: null });
      return response.json({ message: "Banner deleted successfully." });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  return router;
}

module.exports = createBannerRouter;
module.exports.normalizeBanner = normalizeBanner;
