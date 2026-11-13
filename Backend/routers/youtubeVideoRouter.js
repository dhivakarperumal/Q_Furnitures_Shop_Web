const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const express = require("express");
const multer = require("multer");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");
const { createUploadHandler, uploadsDirectory } = require("./uploadRouter");

const documentExtensions = new Set(["pdf", "doc", "docx", "xls", "xlsx", "txt", "rtf"]);
const videoExtensions = new Set(["mp4", "mov", "webm"]);
const maxVideoFileSize = 200 * 1024 * 1024;
const uploadDirectory = path.join(uploadsDirectory, "youtube-videos");

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function parseId(value) {
  const id = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id < 1) {
    throw badRequest("Video ID must be a positive integer.");
  }
  return id;
}

function parseYoutubeVideoId(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const hostname = url.hostname.toLowerCase();
    const segments = url.pathname.split("/").filter(Boolean);
    const videoId = hostname === "youtu.be" || hostname === "www.youtu.be"
      ? segments[0]
      : hostname === "youtube.com" || hostname.endsWith(".youtube.com")
        ? url.pathname === "/watch"
          ? url.searchParams.get("v")
          : ["embed", "shorts", "live"].includes(segments[0])
            ? segments[1]
            : ""
        : "";
    return /^[A-Za-z0-9_-]{11}$/.test(videoId || "") ? videoId : null;
  } catch {
    return null;
  }
}

function isSafeMediaPath(value) {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");
}

function normalizeVideo(input) {
  const videoCode = typeof input.video_code === "string" ? input.video_code.trim() : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const videoSource = input.video_source === undefined ? "link" : input.video_source;
  const videoUrl = typeof input.video_url === "string" ? input.video_url.trim() : "";
  const videoId = videoSource === "link" ? parseYoutubeVideoId(videoUrl) : null;
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const thumbnailImage = typeof input.thumbnail_image === "string" ? input.thumbnail_image.trim() : "";
  const thumbnailUrl = typeof input.thumbnail_url === "string" ? input.thumbnail_url.trim() : "";
  const applicationLinks = input.application_links ?? [];
  const documents = input.documents ?? [];
  const followUpNotes = typeof input.follow_up_notes === "string" ? input.follow_up_notes.trim() : "";
  const status = input.status || "Active";

  if (!/^YT-\d{5}$/.test(videoCode)) {
    throw badRequest("Video ID must be in the generated YT-00000 format.");
  }
  if (!title || title.length < 2 || title.length > 160) {
    throw badRequest("Video title is required and must be 2 to 160 characters.");
  }
  if (!["link", "upload"].includes(videoSource)) {
    throw badRequest("Choose either a YouTube link or an uploaded video.");
  }
  if (videoSource === "link" && !videoId) {
    throw badRequest("Enter a valid YouTube video URL.");
  }
  if (videoSource === "upload" && (
    videoUrl.length > 512 ||
    !videoExtensions.has(path.extname(videoUrl).slice(1).toLowerCase()) ||
    !getStoredFilePath(videoUrl)
  )) {
    throw badRequest("Upload a valid MP4, MOV, or WebM video.");
  }
  if (description.length > 5000 || followUpNotes.length > 5000) {
    throw badRequest("Description and follow-up notes must be 5,000 characters or fewer.");
  }
  if (!thumbnailImage && !thumbnailUrl) {
    throw badRequest("Upload a thumbnail image or provide a thumbnail URL.");
  }
  if (thumbnailImage && (thumbnailImage.length > 512 || !isSafeMediaPath(thumbnailImage))) {
    throw badRequest("Thumbnail image must be a relative path.");
  }
  if (thumbnailUrl) {
    try {
      const url = new URL(thumbnailUrl);
      if (!["http:", "https:"].includes(url.protocol) || !url.hostname) throw new Error("Invalid URL");
    } catch {
      throw badRequest("Thumbnail URL must be a valid HTTP or HTTPS URL.");
    }
  }
  if (!Array.isArray(applicationLinks) || applicationLinks.length > 20) {
    throw badRequest("Add no more than 20 application links.");
  }
  const normalizedLinks = applicationLinks.map((link) => {
    if (!link || typeof link !== "object" || Array.isArray(link)) {
      throw badRequest("Each application link needs a title and URL.");
    }
    const linkTitle = typeof link.title === "string" ? link.title.trim() : "";
    const urlValue = typeof link.url === "string" ? link.url.trim() : "";
    if (!linkTitle && !urlValue) return null;
    if (!linkTitle || linkTitle.length > 120 || !urlValue || urlValue.length > 2048) {
      throw badRequest("Each application link needs a title and a URL of up to 2,048 characters.");
    }
    try {
      const url = new URL(urlValue);
      if (!["http:", "https:"].includes(url.protocol) || !url.hostname) throw new Error("Invalid URL");
    } catch {
      throw badRequest("Application links must use a valid HTTP or HTTPS URL.");
    }
    return { title: linkTitle, url: urlValue };
  }).filter(Boolean);

  if (!Array.isArray(documents) || documents.length > 4) {
    throw badRequest("Attach no more than 4 supporting documents.");
  }
  const normalizedDocuments = documents.map((document) => {
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      throw badRequest("Each supporting document must include a name and URL.");
    }
    const name = typeof document.name === "string" ? path.basename(document.name).trim() : "";
    const url = typeof document.url === "string" ? document.url.trim() : "";
    const extension = name.split(".").pop()?.toLowerCase();
    if (!name || name.length > 180 || !documentExtensions.has(extension) ||
        !url || url.length > 512 || !isSafeMediaPath(url)) {
      throw badRequest("Supporting documents must have a valid name and uploaded file URL.");
    }
    return { name, url };
  });
  if (!["Active", "Inactive"].includes(status)) {
    throw badRequest("Video status must be Active or Inactive.");
  }

  return {
    video_code: videoCode,
    title,
    video_source: videoSource,
    video_url: videoUrl,
    video_id: videoId,
    description,
    thumbnail_image: thumbnailImage || null,
    thumbnail_url: thumbnailUrl || null,
    application_links: normalizedLinks,
    documents: normalizedDocuments,
    follow_up_notes: followUpNotes,
    status,
  };
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getStoredFilePath(value) {
  const prefix = "/uploads/youtube-videos/";
  if (typeof value !== "string" || !value.startsWith(prefix)) return null;
  const filename = value.slice(prefix.length);
  if (!/^[\da-f-]+\.(jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|txt|rtf|mp4|mov|webm)$/i.test(filename) ||
      path.basename(filename) !== filename) return null;
  return path.join(uploadDirectory, filename);
}

async function removeReplacedFiles(previousVideo, nextVideo) {
  const nextFiles = new Set([
    nextVideo.thumbnail_image,
    ...(nextVideo.video_source === "upload" ? [nextVideo.video_url] : []),
    ...parseJsonArray(nextVideo.documents).map((document) => document.url),
  ].filter(Boolean));
  const previousFiles = [
    previousVideo.thumbnail_image,
    ...(previousVideo.video_source === "upload" ? [previousVideo.video_url] : []),
    ...parseJsonArray(previousVideo.documents).map((document) => document.url),
  ].filter((file) => file && !nextFiles.has(file));
  await Promise.all(previousFiles.map((file) => {
    const filePath = getStoredFilePath(file);
    return filePath ? fs.rm(filePath, { force: true }) : Promise.resolve();
  }));
}

function createVideoUploadHandler() {
  const storage = multer.diskStorage({
    destination(request, file, callback) {
      fs.mkdir(uploadDirectory, { recursive: true }).then(
        () => callback(null, uploadDirectory),
        callback,
      );
    },
    filename(request, file, callback) {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${randomUUID()}${extension}`);
    },
  });
  const upload = multer({
    storage,
    limits: { fileSize: maxVideoFileSize, files: 1 },
    fileFilter(request, file, callback) {
      const extension = path.extname(file.originalname).slice(1).toLowerCase();
      if (!videoExtensions.has(extension)) {
        const validationError = new Error("Choose an MP4, MOV, or WebM video.");
        validationError.status = 400;
        return callback(validationError);
      }
      return callback(null, true);
    },
  }).single("file");

  return (request, response) => {
    upload(request, response, async (error) => {
      if (error) {
        const status = error instanceof multer.MulterError
          ? (error.code === "LIMIT_FILE_SIZE" || error.code === "LIMIT_FILE_COUNT" ? 413 : 400)
          : error.status || 500;
        return response.status(status).json({
          message: error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
            ? "Video files must be 200 MB or smaller."
            : status === 500
              ? "Could not prepare the video upload."
              : error.message,
        });
      }
      if (!request.file) return response.status(400).json({ message: "Select a video to upload." });

      try {
        const fileHandle = await fs.open(request.file.path, "r");
        const header = Buffer.alloc(12);
        let bytesRead;
        try {
          ({ bytesRead } = await fileHandle.read(header, 0, header.length, 0));
        } finally {
          await fileHandle.close();
        }
        const extension = path.extname(request.file.originalname).slice(1).toLowerCase();
        const isWebm = extension === "webm" &&
          bytesRead >= 4 &&
          header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
        const isMp4OrMov = ["mp4", "mov"].includes(extension) &&
          bytesRead >= 8 &&
          header.subarray(4, 8).toString("ascii") === "ftyp";
        if (!isWebm && !isMp4OrMov) {
          await fs.rm(request.file.path, { force: true });
          return response.status(400).json({ message: "The selected file is not a valid MP4, MOV, or WebM video." });
        }
        return response.status(201).json({
          url: `/uploads/youtube-videos/${request.file.filename}`,
        });
      } catch (uploadError) {
        await fs.rm(request.file.path, { force: true });
        return response.status(500).json({ message: "Could not save the uploaded video." });
      }
    });
  };
}

function createDocumentUploadHandler() {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1024 * 1024, files: 4 },
  }).array("files", 4);

  return (request, response) => {
    upload(request, response, async (error) => {
      if (error) {
        const status = error instanceof multer.MulterError
          ? (error.code === "LIMIT_FILE_SIZE" || error.code === "LIMIT_FILE_COUNT" ? 413 : 400)
          : 400;
        return response.status(status).json({ message: error.message });
      }

      const files = request.files || [];
      if (!files.length) return response.status(400).json({ message: "Select at least one document." });
      try {
        const prepared = files.map((file) => {
          const name = path.basename(file.originalname).replace(/[^\w.-]/g, "_");
          const extension = name.split(".").pop()?.toLowerCase();
          if (!name || name.length > 180 || !documentExtensions.has(extension)) {
            const validationError = new Error("Use PDF, Word, Excel, RTF, or text documents with names up to 180 characters.");
            validationError.status = 400;
            throw validationError;
          }
          return { name, filename: `${randomUUID()}.${extension}`, buffer: file.buffer };
        });
        await fs.mkdir(uploadDirectory, { recursive: true });
        const saved = [];
        try {
          for (const file of prepared) {
            await fs.writeFile(path.join(uploadDirectory, file.filename), file.buffer, { flag: "wx" });
            saved.push(file.filename);
          }
        } catch (writeError) {
          await Promise.all(saved.map((filename) => fs.rm(path.join(uploadDirectory, filename), { force: true })));
          throw writeError;
        }
        return response.status(201).json({
          documents: prepared.map((file) => ({
            name: file.name,
            url: `/uploads/youtube-videos/${file.filename}`,
          })),
        });
      } catch (writeError) {
        return response.status(writeError.status || 500).json({
          message: writeError.status ? writeError.message : "Could not save uploaded documents.",
        });
      }
    });
  };
}

function createYoutubeVideoRouter(videoService) {
  const router = express.Router();
  const authenticateAdmin = [requireAuthentication, requireAdmin];

  router.get("/next-id", ...authenticateAdmin, async (request, response, next) => {
    try {
      return response.json({ video_code: await videoService.getNextVideoCode() });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/", ...authenticateAdmin, async (request, response, next) => {
    try {
      return response.json({ videos: await videoService.list() });
    } catch (error) {
      return next(error);
    }
  });

  router.post(
    "/upload-thumbnail",
    ...authenticateAdmin,
    createUploadHandler({
      field: "file",
      maxCount: 1,
      category: "youtube-videos",
      maxFileSize: 3 * 1024 * 1024,
      onUploaded: async (request, image) => ({ image }),
    }),
  );
  router.post("/upload-video", ...authenticateAdmin, createVideoUploadHandler());
  router.post("/upload-documents", ...authenticateAdmin, createDocumentUploadHandler());

  router.post("/", ...authenticateAdmin, async (request, response, next) => {
    try {
      const video = await videoService.create(normalizeVideo(request.body || {}));
      return response.status(201).json({ video });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      if (error.code === "ER_DUP_ENTRY") {
        return response.status(409).json({ message: "This Video ID is already in use. Generate a new one and retry." });
      }
      return next(error);
    }
  });

  router.put("/:id", ...authenticateAdmin, async (request, response, next) => {
    try {
      const id = parseId(request.params.id);
      const existing = await videoService.getById(id);
      if (!existing) return response.status(404).json({ message: "Video was not found." });
      const video = await videoService.update(id, normalizeVideo({
        ...request.body,
        video_code: existing.video_code,
      }));
      if (!video) return response.status(404).json({ message: "Video was not found." });
      await removeReplacedFiles(existing, video);
      return response.json({ video });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.delete("/:id", ...authenticateAdmin, async (request, response, next) => {
    try {
      const video = await videoService.delete(parseId(request.params.id));
      if (!video) return response.status(404).json({ message: "Video was not found." });
      await removeReplacedFiles(video, { thumbnail_image: null, documents: [] });
      return response.json({ message: "Video deleted successfully." });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  return router;
}

module.exports = createYoutubeVideoRouter;
module.exports.normalizeVideo = normalizeVideo;
module.exports.parseYoutubeVideoId = parseYoutubeVideoId;
