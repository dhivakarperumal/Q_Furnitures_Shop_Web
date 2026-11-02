const { randomUUID } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");

const uploadsDirectory = path.resolve(__dirname, "..", "uploads");
const imageTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function createMulter(maxFileSize, allowPdf) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileSize, files: 10 },
    fileFilter(request, file, callback) {
      if (imageTypes.has(file.mimetype) || (allowPdf && file.mimetype === "application/pdf")) {
        return callback(null, true);
      }
      return callback(new Error("Only JPG, PNG, GIF, WEBP, and PDF documents are supported."));
    },
  });
}

function getFileExtension(buffer, allowPdf) {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "jpg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer.subarray(0, 6).toString("ascii").match(/^GIF8[79]a$/)) return "gif";
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  if (allowPdf && buffer.subarray(0, 5).toString("ascii") === "%PDF-") return "pdf";
  return null;
}

function createUploadHandler({ field, maxCount, category, allowPdf = false, onUploaded }) {
  const maxFileSize = allowPdf ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
  const parseFiles = createMulter(maxFileSize, allowPdf).array(field, maxCount);

  return (request, response, next) => {
    parseFiles(request, response, async (parseError) => {
      if (parseError) {
        const status = parseError instanceof multer.MulterError
          ? (parseError.code === "LIMIT_FILE_SIZE" || parseError.code === "LIMIT_FILE_COUNT" ? 413 : 400)
          : 400;
        return response.status(status).json({ message: parseError.message });
      }

      try {
        const files = request.files || [];
        if (files.length === 0) {
          return response.status(400).json({ message: "Select at least one file to upload." });
        }

        const uploads = files.map((file) => {
          const extension = getFileExtension(file.buffer, allowPdf);
          if (!extension) {
            const error = new Error("The uploaded file is not a supported image or document.");
            error.status = 400;
            throw error;
          }
          return { buffer: file.buffer, filename: `${randomUUID()}.${extension}` };
        });

        const directory = path.join(uploadsDirectory, category);
        await fs.mkdir(directory, { recursive: true });
        const savedFiles = [];
        try {
          for (const upload of uploads) {
            await fs.writeFile(path.join(directory, upload.filename), upload.buffer, { flag: "wx" });
            savedFiles.push(upload.filename);
          }
        } catch (error) {
          await Promise.all(savedFiles.map((filename) => fs.rm(path.join(directory, filename), { force: true })));
          throw error;
        }

        const urls = uploads.map((upload) => `/uploads/${category}/${upload.filename}`);
        let additionalResponseData = {};
        if (onUploaded) {
          try {
            additionalResponseData = await onUploaded(request, urls[0]);
          } catch (error) {
            await Promise.all(uploads.map((upload) => fs.rm(path.join(directory, upload.filename), { force: true })));
            throw error;
          }
        }
        if (field === "images") {
          return response.status(201).json({ images: urls });
        }
        return response.status(201).json({ url: urls[0], ...additionalResponseData });
      } catch (error) {
        return next(error);
      }
    });
  };
}

function requireAuthentication(request, response, next) {
  const authorization = request.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return response.status(401).json({ message: "Sign in before uploading files." });
  }

  try {
    request.auth = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return response.status(401).json({ message: "Your session is invalid or expired. Sign in again." });
  }
}

function requireAdmin(request, response, next) {
  if (request.auth?.role !== "admin") {
    return response.status(403).json({ message: "Administrator access is required to upload this file." });
  }
  return next();
}

function createUploadRouter(authService) {
  const router = express.Router();

  router.post("/products/upload", requireAuthentication, requireAdmin, createUploadHandler({ field: "images", maxCount: 5, category: "products" }));
  router.post("/reviews/upload", requireAuthentication, createUploadHandler({ field: "image", maxCount: 1, category: "reviews" }));
  router.post(
    "/uploads/profile-image",
    requireAuthentication,
    createUploadHandler({
      field: "image",
      maxCount: 1,
      category: "profiles",
      onUploaded: async (request, imageUrl) => {
        const user = await authService.updateProfileImage(request.auth.id, imageUrl);
        if (!user) {
          const error = new Error("User account was not found.");
          error.status = 404;
          throw error;
        }
        return { user };
      },
    }),
  );
  router.post("/uploads/images", requireAuthentication, requireAdmin, createUploadHandler({ field: "images", maxCount: 10, category: "general" }));
  router.post("/uploads/image", requireAuthentication, requireAdmin, createUploadHandler({ field: "image", maxCount: 1, category: "general" }));
  router.post("/uploads/document", requireAuthentication, requireAdmin, createUploadHandler({ field: "document", maxCount: 1, category: "documents", allowPdf: true }));

  return router;
}

module.exports = { createUploadRouter, uploadsDirectory };
