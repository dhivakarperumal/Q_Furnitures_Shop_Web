const test = require("node:test");
const assert = require("node:assert/strict");
const { createYoutubeVideoService } = require("./youtubeVideoService");

test("generates the next video code from stored IDs", async () => {
  const service = createYoutubeVideoService({
    async execute() {
      return [[{ lastSequence: "9" }]];
    },
  });

  assert.equal(await service.getNextVideoCode(), "YT-00010");
});

test("stores application links and documents as JSON", async () => {
  const video = {
    id: 2,
    video_code: "YT-00002",
    video_source: "link",
    title: "Product guide",
    video_url: "https://youtu.be/dQw4w9WgXcQ",
    video_id: "dQw4w9WgXcQ",
    description: "",
    thumbnail_image: "/uploads/youtube-videos/preview.webp",
    thumbnail_url: null,
    application_links: [{ title: "Apply", url: "https://example.com/apply" }],
    documents: [{ name: "Guide.pdf", url: "/uploads/youtube-videos/guide.pdf" }],
    follow_up_notes: "",
    status: "Active",
  };
  let insertParameters;
  const service = createYoutubeVideoService({
    async execute(sql, parameters) {
      if (sql.startsWith("INSERT INTO youtube_videos")) {
        insertParameters = parameters;
        return [{ insertId: video.id }];
      }
      return [[video]];
    },
  });

  assert.deepEqual(await service.create(video), video);
  assert.deepEqual(JSON.parse(insertParameters[8]), video.application_links);
  assert.deepEqual(JSON.parse(insertParameters[9]), video.documents);
});
