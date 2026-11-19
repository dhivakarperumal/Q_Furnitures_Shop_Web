const VIDEO_COLUMNS = [
  "id",
  "video_code",
  "title",
  "video_source",
  "video_url",
  "video_id",
  "description",
  "thumbnail_image",
  "thumbnail_url",
  "application_links",
  "documents",
  "follow_up_notes",
  "status",
  "created_at",
  "updated_at",
].join(", ");

function createYoutubeVideoService(pool) {
  async function getById(id) {
    const [rows] = await pool.execute(
      `SELECT ${VIDEO_COLUMNS} FROM youtube_videos WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  }

  return {
    async list() {
      const [rows] = await pool.execute(
        `SELECT ${VIDEO_COLUMNS} FROM youtube_videos ORDER BY created_at DESC, id DESC`,
      );
      return rows;
    },

    async getNextVideoCode() {
      const [rows] = await pool.execute(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(video_code, 4) AS UNSIGNED)), 0) AS lastSequence
         FROM youtube_videos
         WHERE video_code REGEXP '^YT-[0-9]+$'`,
      );
      return `YT-${String(Number(rows[0]?.lastSequence || 0) + 1).padStart(5, "0")}`;
    },

    getById,

    async create(video) {
      const [result] = await pool.execute(
        `INSERT INTO youtube_videos
         (video_code, title, video_source, video_url, video_id, description, thumbnail_image, thumbnail_url,
          application_links, documents, follow_up_notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          video.video_code,
          video.title,
          video.video_source,
          video.video_url,
          video.video_id,
          video.description,
          video.thumbnail_image,
          video.thumbnail_url,
          JSON.stringify(video.application_links),
          JSON.stringify(video.documents),
          video.follow_up_notes,
          video.status,
        ],
      );
      return getById(result.insertId);
    },

    async update(id, video) {
      await pool.execute(
        `UPDATE youtube_videos
         SET title = ?, video_source = ?, video_url = ?, video_id = ?, description = ?, thumbnail_image = ?,
             thumbnail_url = ?, application_links = ?, documents = ?, follow_up_notes = ?, status = ?
         WHERE id = ?`,
        [
          video.title,
          video.video_source,
          video.video_url,
          video.video_id,
          video.description,
          video.thumbnail_image,
          video.thumbnail_url,
          JSON.stringify(video.application_links),
          JSON.stringify(video.documents),
          video.follow_up_notes,
          video.status,
          id,
        ],
      );
      return getById(id);
    },

    async delete(id) {
      const video = await getById(id);
      if (!video) return null;
      const [result] = await pool.execute("DELETE FROM youtube_videos WHERE id = ?", [id]);
      return result.affectedRows > 0 ? video : null;
    },
  };
}

module.exports = { createYoutubeVideoService };
