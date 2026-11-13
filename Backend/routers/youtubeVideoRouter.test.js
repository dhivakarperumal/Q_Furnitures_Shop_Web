const test = require("node:test");
const assert = require("node:assert/strict");
const createYoutubeVideoRouter = require("./youtubeVideoRouter");
const { normalizeVideo } = createYoutubeVideoRouter;

const validVideo = {
  video_code: "YT-00001",
  title: "  Product guide  ",
  video_url: "https://youtu.be/dQw4w9WgXcQ",
  thumbnail_image: "/uploads/youtube-videos/preview.webp",
};

test("creates the router with upload middleware registered", () => {
  assert.doesNotThrow(() => createYoutubeVideoRouter({}));
});

test("normalizes a YouTube video and its supporting content", () => {
  assert.deepEqual(normalizeVideo({
    ...validVideo,
    application_links: [{ title: " Apply now ", url: "https://example.com/apply" }],
    documents: [{ name: "Guide.pdf", url: "/uploads/youtube-videos/guide.pdf" }],
  }), {
    video_code: "YT-00001",
    title: "Product guide",
    video_source: "link",
    video_url: "https://youtu.be/dQw4w9WgXcQ",
    video_id: "dQw4w9WgXcQ",
    description: "",
    thumbnail_image: "/uploads/youtube-videos/preview.webp",
    thumbnail_url: null,
    application_links: [{ title: "Apply now", url: "https://example.com/apply" }],
    documents: [{ name: "Guide.pdf", url: "/uploads/youtube-videos/guide.pdf" }],
    follow_up_notes: "",
    status: "Active",
  });
});

test("accepts a safely stored local video upload", () => {
  const uploadedUrl = "/uploads/youtube-videos/123e4567-e89b-12d3-a456-426614174000.mp4";
  assert.deepEqual(normalizeVideo({
    ...validVideo,
    video_source: "upload",
    video_url: uploadedUrl,
  }), {
    video_code: "YT-00001",
    title: "Product guide",
    video_source: "upload",
    video_url: uploadedUrl,
    video_id: null,
    description: "",
    thumbnail_image: "/uploads/youtube-videos/preview.webp",
    thumbnail_url: null,
    application_links: [],
    documents: [],
    follow_up_notes: "",
    status: "Active",
  });
});

test("rejects invalid YouTube links, application URLs, and upload paths", () => {
  assert.throws(() => normalizeVideo({ ...validVideo, video_url: "https://example.com/video" }), { status: 400 });
  assert.throws(() => normalizeVideo({ ...validVideo, video_url: "javascript://youtube.com/watch?v=dQw4w9WgXcQ" }), { status: 400 });
  assert.throws(() => normalizeVideo({
    ...validVideo,
    video_source: "upload",
    video_url: "/uploads/youtube-videos/not-a-generated-name.mp4",
  }), { status: 400 });
  assert.throws(() => normalizeVideo({
    ...validVideo,
    application_links: [{ title: "Apply", url: "javascript:alert(1)" }],
  }), { status: 400 });
  assert.throws(() => normalizeVideo({
    ...validVideo,
    documents: [{ name: "Guide.pdf", url: "//example.com/Guide.pdf" }],
  }), { status: 400 });
  assert.throws(() => normalizeVideo({ ...validVideo, thumbnail_image: "" }), { status: 400 });
});
