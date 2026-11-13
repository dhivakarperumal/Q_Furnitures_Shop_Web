import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  BadgeCheck,
  CircleAlert,
  ExternalLink,
  Eye,
  FileText,
  ImagePlus,
  LayoutGrid,
  List,
  Loader2,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api";

const emptyVideo = {
  video_code: "",
  title: "",
  video_source: "link",
  video_url: "",
  description: "",
  thumbnail_image: "",
  thumbnail_url: "",
  application_links: [{ title: "", url: "" }],
  documents: [],
  follow_up_notes: "",
  status: "Active",
};

const documentExtensions = new Set(["pdf", "doc", "docx", "xls", "xlsx", "txt", "rtf"]);
const inputClass = "mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-orange-500/20";

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function resolveMediaUrl(value) {
  if (typeof value !== "string" || !value || /^(https?:|data:|blob:)/i.test(value)) return value;
  const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${backendUrl}${value.startsWith("/") ? value : `/${value}`}`;
}

function getYoutubeVideoId(value) {
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) return false;
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
    return /^[A-Za-z0-9_-]{11}$/.test(videoId || "") ? videoId : "";
  } catch {
    return "";
  }
}

function getVideoImage(video) {
  return resolveMediaUrl(video.thumbnail_image || video.thumbnail_url || `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`);
}

function formatVideoDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

function YoutubeVideos() {
  const [videos, setVideos] = useState([]);
  const [form, setForm] = useState(emptyVideo);
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [loadingVideoCode, setLoadingVideoCode] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState(null);
  const [viewVideo, setViewVideo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState("table");

  const loadVideos = async () => {
    try {
      const { data } = await api.get("/admin/content/youtube-videos");
      setVideos(Array.isArray(data.videos) ? data.videos.map((video) => ({
        ...video,
        application_links: parseJsonArray(video.application_links),
        documents: parseJsonArray(video.documents),
      })) : []);
    } catch (error) {
      console.error("Failed to load YouTube videos:", error);
      toast.error(error.response?.data?.message || "Could not load YouTube videos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  useEffect(() => {
    if (!isAddModalOpen && !viewVideo) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving && !uploadingThumbnail && !uploadingVideo && !uploadingDocuments) {
        setIsAddModalOpen(false);
        setViewVideo(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAddModalOpen, viewVideo, saving, uploadingThumbnail, uploadingVideo, uploadingDocuments]);

  const updateApplicationLink = (index, field, value) => {
    setForm((current) => ({
      ...current,
      application_links: current.application_links.map((link, linkIndex) => (
        linkIndex === index ? { ...link, [field]: value } : link
      )),
    }));
    clearValidationError("application_links");
  };

  const clearValidationError = (field) => {
    setValidationErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const uploadThumbnail = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a PNG, JPEG, or WEBP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Thumbnail image must be 3 MB or smaller.");
      event.target.value = "";
      return;
    }

    setUploadingThumbnail(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      const { data } = await api.post("/admin/content/youtube-videos/upload-thumbnail", uploadData);
      if (typeof data.image !== "string" || !data.image) {
        throw new Error("The thumbnail upload did not return a saved image.");
      }
      setForm((current) => ({ ...current, thumbnail_image: data.image, thumbnail_url: "" }));
      setValidationErrors((current) => {
        const next = { ...current };
        delete next.thumbnail_image;
        return next;
      });
      toast.success("Thumbnail image ready.");
    } catch (error) {
      console.error("Could not upload thumbnail image:", error);
      toast.error(error.response?.data?.message || error.message || "Could not upload the thumbnail image.");
    } finally {
      setUploadingThumbnail(false);
      event.target.value = "";
    }
  };

  const uploadVideoFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["mp4", "mov", "webm"].includes(extension)) {
      toast.error("Choose an MP4, MOV, or WebM video.");
      event.target.value = "";
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      toast.error("Video files must be 200 MB or smaller.");
      event.target.value = "";
      return;
    }

    setUploadingVideo(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      const { data } = await api.post("/admin/content/youtube-videos/upload-video", uploadData);
      if (typeof data.url !== "string" || !data.url) {
        throw new Error("The video upload did not return a saved file.");
      }
      setForm((current) => ({ ...current, video_url: data.url }));
      clearValidationError("video_url");
      toast.success("Video uploaded.");
    } catch (error) {
      console.error("Could not upload video:", error);
      toast.error(error.response?.data?.message || error.message || "Could not upload this video.");
    } finally {
      setUploadingVideo(false);
      event.target.value = "";
    }
  };

  const selectVideoSource = (videoSource) => {
    setForm((current) => ({
      ...current,
      video_source: videoSource,
      video_url: current.video_source === videoSource ? current.video_url : "",
    }));
    clearValidationError("video_url");
  };

  const uploadDocuments = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;
    if (selectedFiles.length > 4 - form.documents.length) {
      toast.error("You can attach up to 4 documents.");
      event.target.value = "";
      return;
    }
    const invalidFile = selectedFiles.find((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      return !extension || !documentExtensions.has(extension) || file.size > 1024 * 1024 || file.name.length > 180;
    });
    if (invalidFile) {
      toast.error(`${invalidFile.name}: use PDF, Word, Excel, RTF, or text files up to 1 MB each.`);
      event.target.value = "";
      return;
    }

    setUploadingDocuments(true);
    try {
      const uploadData = new FormData();
      selectedFiles.forEach((file) => uploadData.append("files", file));
      const { data } = await api.post("/admin/content/youtube-videos/upload-documents", uploadData);
      if (!Array.isArray(data.documents) || data.documents.length !== selectedFiles.length) {
        throw new Error("The document upload did not return all saved documents.");
      }
      setForm((current) => ({ ...current, documents: [...current.documents, ...data.documents] }));
      toast.success(`${data.documents.length} document${data.documents.length === 1 ? "" : "s"} attached.`);
    } catch (error) {
      console.error("Could not upload supporting documents:", error);
      toast.error(error.response?.data?.message || error.message || "Could not upload the selected documents.");
    } finally {
      setUploadingDocuments(false);
      event.target.value = "";
    }
  };

  const openAddVideoModal = async () => {
    setLoadingVideoCode(true);
    try {
      const { data } = await api.get("/admin/content/youtube-videos/next-id");
      if (typeof data.video_code !== "string" || !data.video_code) {
        throw new Error("The server did not return a Video ID.");
      }
      setForm({ ...emptyVideo, video_code: data.video_code });
      setValidationErrors({});
      setEditingVideoId(null);
      setIsAddModalOpen(true);
    } catch (error) {
      console.error("Failed to generate Video ID:", error);
      toast.error(error.response?.data?.message || error.message || "Could not generate a Video ID.");
    } finally {
      setLoadingVideoCode(false);
    }
  };

  const openEditVideoModal = (video) => {
    setForm({
      ...emptyVideo,
      ...video,
      video_source: video.video_source || "link",
      application_links: parseJsonArray(video.application_links).length
        ? parseJsonArray(video.application_links)
        : [{ title: "", url: "" }],
      documents: parseJsonArray(video.documents),
      follow_up_notes: video.follow_up_notes || "",
      thumbnail_image: video.thumbnail_image || "",
      thumbnail_url: video.thumbnail_url || "",
    });
    setValidationErrors({});
    setEditingVideoId(video.id);
    setIsAddModalOpen(true);
  };

  const submitVideo = async (event) => {
    event.preventDefault();
    if (uploadingVideo) return;
    const errors = {};
    if (form.title.trim().length < 2) errors.title = "Enter a video title with at least 2 characters.";
    if (form.video_source === "link" && !getYoutubeVideoId(form.video_url)) {
      errors.video_url = "Enter a valid YouTube video URL.";
    }
    if (form.video_source === "upload" &&
        !/^\/uploads\/youtube-videos\/[\da-f-]+\.(mp4|mov|webm)$/i.test(form.video_url)) {
      errors.video_url = "Upload an MP4, MOV, or WebM video.";
    }
    if (!form.thumbnail_image && !form.thumbnail_url) errors.thumbnail_image = "Upload a thumbnail image.";
    const hasInvalidLink = form.application_links.some((link) => {
      const title = link.title.trim();
      const url = link.url.trim();
      if (!title && !url) return false;
      if (!title || !url) return true;
      try {
        return !["http:", "https:"].includes(new URL(url).protocol);
      } catch {
        return true;
      }
    });
    if (hasInvalidLink) {
      errors.application_links = "Every application link needs a title and a valid HTTP or HTTPS URL.";
    }
    if (Object.keys(errors).length) {
      setValidationErrors(errors);
      toast.error("Complete the required fields before saving.");
      const firstInvalidField = Object.keys(errors)[0];
      requestAnimationFrame(() => {
        const field = document.querySelector(`[data-validation-field="${firstInvalidField}"]`);
        field?.scrollIntoView({ behavior: "smooth", block: "center" });
        field?.focus({ preventScroll: true });
      });
      return;
    }

    setValidationErrors({});
    setSaving(true);
    const payload = {
      ...form,
      video_code: form.video_code.trim(),
      title: form.title.trim(),
      video_url: form.video_url.trim(),
      description: form.description.trim(),
      thumbnail_url: form.thumbnail_url.trim(),
      application_links: form.application_links
        .filter((link) => link.title.trim() || link.url.trim())
        .map((link) => ({ title: link.title.trim(), url: link.url.trim() })),
      follow_up_notes: form.follow_up_notes.trim(),
    };
    try {
      const { data } = editingVideoId
        ? await api.put(`/admin/content/youtube-videos/${editingVideoId}`, payload)
        : await api.post("/admin/content/youtube-videos", payload);
      const savedVideo = {
        ...data.video,
        application_links: parseJsonArray(data.video.application_links),
        documents: parseJsonArray(data.video.documents),
      };
      setVideos((current) => editingVideoId
        ? current.map((video) => video.id === editingVideoId ? savedVideo : video)
        : [savedVideo, ...current]);
      setForm(emptyVideo);
      setValidationErrors({});
      setEditingVideoId(null);
      setIsAddModalOpen(false);
      toast.success(editingVideoId ? "YouTube video updated." : "YouTube video added.");
    } catch (error) {
      console.error("Failed to save YouTube video:", error);
      toast.error(error.response?.data?.message || "Could not save this video.");
    } finally {
      setSaving(false);
    }
  };

  const deleteVideo = async (video) => {
    if (!window.confirm(`Delete "${video.title}"? This cannot be undone.`)) return;
    setDeletingId(video.id);
    try {
      await api.delete(`/admin/content/youtube-videos/${video.id}`);
      setVideos((current) => current.filter((entry) => entry.id !== video.id));
      toast.success("Video deleted.");
    } catch (error) {
      console.error("Failed to delete YouTube video:", error);
      toast.error(error.response?.data?.message || "Could not delete this video.");
    } finally {
      setDeletingId(null);
    }
  };

  const activeVideoCount = videos.filter((video) => video.status === "Active").length;
  const inactiveVideoCount = videos.length - activeVideoCount;
  const filteredVideos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return videos.filter((video) => {
      const matchesSearch = !query || [
        video.title,
        video.video_code,
        video.video_url,
        video.description,
      ].some((value) => String(value || "").toLowerCase().includes(query));
      return matchesSearch && (statusFilter === "All" || video.status === statusFilter);
    });
  }, [videos, searchQuery, statusFilter]);

  const renderVideoActions = (video) => (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => setViewVideo(video)}
        aria-label={`View ${video.title}`}
        title="View video details"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-primary-dark transition-colors hover:bg-orange-100"
      >
        <Eye className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => openEditVideoModal(video)}
        aria-label={`Edit ${video.title}`}
        title="Edit video"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-primary-dark transition-colors hover:bg-orange-100"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => deleteVideo(video)}
        disabled={deletingId === video.id}
        aria-label={`Delete ${video.title}`}
        title="Delete video"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-100 disabled:opacity-50"
      >
        {deletingId === video.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen space-y-6 pb-20 font-sans animate-in fade-in slide-in-from-bottom-4 duration-700">
      <section aria-label="YouTube video summary" className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: "Total Videos", value: videos.length, detail: "All video listings", Icon: Video, color: "orange" },
          { label: "Active", value: activeVideoCount, detail: "Available videos", Icon: BadgeCheck, color: "emerald" },
          { label: "Inactive", value: inactiveVideoCount, detail: "Hidden videos", Icon: CircleAlert, color: "amber" },
        ].map(({ label, value, detail, Icon, color }) => (
          <article
            key={label}
            className={`group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)] ${
              color === "orange" ? "border-orange-100/80 hover:border-orange-200" : color === "emerald" ? "border-emerald-100/80 hover:border-emerald-200" : "border-amber-100/80 hover:border-amber-200"
            }`}
          >
            <div className={`absolute inset-y-4 left-0 w-1 rounded-r-full ${
              color === "orange" ? "bg-gradient-to-b from-primary-light to-primary-dark" : color === "emerald" ? "bg-gradient-to-b from-emerald-400 to-emerald-600" : "bg-gradient-to-b from-amber-400 to-amber-600"
            }`} />
            <span className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white shadow-lg transition-transform duration-200 group-hover:scale-105 ${
              color === "orange" ? "bg-gradient-to-br from-primary to-primary-dark shadow-orange-200/70" : color === "emerald" ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-200/70" : "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-200/70"
            }`}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="relative z-10">
              <p className="mb-1 text-xs font-bold tracking-wide text-secondary-light">{label}</p>
              <p className="mb-1 text-3xl font-black leading-none text-secondary-dark">{value}</p>
              <p className="text-[10px] font-medium text-stone-500">{detail}</p>
            </div>
            <Icon className={`pointer-events-none absolute -right-1 bottom-1 h-[60px] w-[60px] ${
              color === "orange" ? "text-orange-300/20" : color === "emerald" ? "text-emerald-300/20" : "text-amber-300/20"
            }`} />
          </article>
        ))}
      </section>

      <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="group relative block w-full flex-1 xl:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search videos by title, ID..."
            aria-label="Search YouTube videos"
            className="w-full rounded-xl border border-gray-100 bg-gray-50 py-2.5 pl-11 pr-4 text-sm font-medium text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-orange-100"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter videos by status"
            className="min-w-36 cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600 outline-none focus:border-primary"
          >
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              className={`rounded-lg p-2 transition-all ${viewMode === "grid" ? "bg-orange-100 text-primary-dark" : "text-gray-400 hover:text-slate-600"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-label="Table view"
              aria-pressed={viewMode === "table"}
              className={`rounded-lg p-2 transition-all ${viewMode === "table" ? "bg-orange-100 text-primary-dark" : "text-gray-400 hover:text-slate-600"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={openAddVideoModal}
            disabled={loadingVideoCode}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-primary to-primary-dark px-5 py-3 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingVideoCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add video
          </button>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 shadow-sm">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
          <p className="font-bold text-gray-500">Loading videos...</p>
        </div>
      ) : videos.length === 0 || filteredVideos.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          {videos.length === 0 ? <Video className="h-10 w-10 text-orange-300" /> : <Search className="h-10 w-10 text-orange-300" />}
          <p className="mt-3 text-lg font-black text-secondary-dark">{videos.length === 0 ? "No videos yet" : "No matching videos"}</p>
          <p className="mt-1 text-sm font-medium text-gray-500">
            {videos.length === 0 ? "Add your first YouTube video to get started." : "Try another search or status filter."}
          </p>
        </div>
      ) : viewMode === "table" ? (
        <section className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] whitespace-nowrap text-left">
              <thead>
                <tr className="border-b border-secondary-dark bg-gradient-to-r from-secondary-dark to-secondary-light">
                  <th className="px-4 py-4 text-center text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">S. No.</th>
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Video</th>
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Video ID</th>
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Thumbnail</th>
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Status</th>
                  <th className="px-4 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredVideos.map((video, index) => (
                  <tr key={video.id} className="group transition-colors hover:bg-gray-50/50">
                    <td className="px-4 py-4 text-center text-sm font-bold text-gray-500">{index + 1}</td>
                    <td className="px-4 py-4">
                      <a href={video.video_url} target="_blank" rel="noreferrer" className="font-bold text-slate-800 transition-colors hover:text-primary-dark">
                        {video.title}
                      </a>
                      <p className="max-w-sm truncate text-xs text-gray-400">{video.video_url}</p>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-primary-dark">{video.video_code}</td>
                    <td className="px-4 py-4">
                      <img src={getVideoImage(video)} alt="" className="h-12 w-20 rounded-lg border border-gray-200 object-cover" />
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block rounded-lg px-3 py-1 text-[11px] font-bold ${
                        video.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                      }`}>{video.status}</span>
                    </td>
                    <td className="px-4 py-4">{renderVideoActions(video)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map((video) => (
            <article key={video.id} className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-md">
              <button
                type="button"
                onClick={() => setViewVideo(video)}
                aria-label={`View ${video.title}`}
                className="group relative block aspect-video w-full bg-gray-100"
              >
                <img src={getVideoImage(video)} alt="" className="h-full w-full object-cover transition group-hover:opacity-80" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-primary-dark shadow-lg transition group-hover:scale-110">
                    <Video className="ml-0.5 h-5 w-5" />
                  </span>
                </span>
              </button>
              <div className="flex flex-1 flex-col p-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="rounded-lg bg-orange-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-dark">{video.video_code}</span>
                  <span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${
                    video.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                  }`}>{video.status}</span>
                </div>
                <h3 className="line-clamp-2 text-sm font-bold text-slate-800">{video.title}</h3>
                {video.description && <p className="mt-2 line-clamp-2 text-xs text-gray-500">{video.description}</p>}
                {video.application_links?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {video.application_links.map((link, index) => (
                      <a
                        key={`${link.url}-${index}`}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-orange-100 bg-orange-50 px-2.5 py-1.5 text-xs font-bold text-primary-dark transition hover:bg-orange-100"
                      >
                        {link.title}<ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-4 mt-4">
                  <span className="text-[10px] font-medium text-gray-400">Added {formatVideoDate(video.created_at)}</span>
                  {renderVideoActions(video)}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {isAddModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center overflow-hidden bg-slate-900/60 p-0 backdrop-blur-md sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving && !uploadingThumbnail && !uploadingVideo && !uploadingDocuments) {
              setIsAddModalOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="youtube-form-title"
            className="flex h-[100dvh] max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-none bg-white shadow-2xl sm:rounded-[24px]"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-gray-100 p-6">
              <div>
                <h2 id="youtube-form-title" className="text-xl font-black text-slate-800">
                  {editingVideoId ? "Edit YouTube video" : "Add a YouTube video"}
                </h2>
                <p className="mt-1 text-xs font-medium text-gray-500">
                  {editingVideoId ? `Editing ${form.video_code}` : "Add video, application links, and supporting details"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                disabled={saving || uploadingThumbnail || uploadingVideo || uploadingDocuments}
                aria-label="Close YouTube video form"
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <form id="add-youtube-form" noValidate onSubmit={submitVideo} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
              {Object.keys(validationErrors).length > 0 && (
                <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <p className="font-bold">Please fix the following before saving:</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    {Object.values(validationErrors).map((message) => <li key={message}>{message}</li>)}
                  </ul>
                </div>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-xs font-bold text-gray-700">
                  Video ID (Auto-generated)
                  <input readOnly value={form.video_code} placeholder="Generating..." className={`${inputClass} cursor-not-allowed bg-gray-50 text-gray-500`} />
                </label>
                <label className="block text-xs font-bold text-gray-700">
                  Video title *
                  <input
                    required
                    minLength={2}
                    maxLength={160}
                    data-validation-field="title"
                    aria-invalid={Boolean(validationErrors.title)}
                    value={form.title}
                    onChange={(event) => {
                      setForm({ ...form, title: event.target.value });
                      clearValidationError("title");
                    }}
                    placeholder="e.g. Apply for our latest opportunity"
                    className={inputClass}
                  />
                  {validationErrors.title && <span className="mt-1 block text-xs font-medium text-red-600">{validationErrors.title}</span>}
                </label>
              </div>

              <section className="space-y-3">
                <div role="group" aria-label="Video source" className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                  <button
                    type="button"
                    disabled={uploadingVideo || saving}
                    aria-pressed={form.video_source === "link"}
                    onClick={() => selectVideoSource("link")}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                      form.video_source === "link" ? "bg-white text-primary-dark shadow-sm" : "text-gray-500 hover:text-slate-700"
                    }`}
                  >
                    <Link2 className="h-4 w-4" />Add a link
                  </button>
                  <button
                    type="button"
                    disabled={uploadingVideo || saving}
                    aria-pressed={form.video_source === "upload"}
                    onClick={() => selectVideoSource("upload")}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                      form.video_source === "upload" ? "bg-white text-primary-dark shadow-sm" : "text-gray-500 hover:text-slate-700"
                    }`}
                  >
                    <Upload className="h-4 w-4" />Upload video
                  </button>
                </div>
                {form.video_source === "link" ? (
                  <label className="block text-xs font-bold text-gray-700">
                    YouTube video URL *
                    <input
                      required
                      type="url"
                      maxLength={2048}
                      data-validation-field="video_url"
                      aria-invalid={Boolean(validationErrors.video_url)}
                      value={form.video_url}
                      onChange={(event) => {
                        setForm({ ...form, video_url: event.target.value });
                        clearValidationError("video_url");
                      }}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className={inputClass}
                    />
                    {validationErrors.video_url && <span className="mt-1 block text-xs font-medium text-red-600">{validationErrors.video_url}</span>}
                  </label>
                ) : (
                  <section
                    className="space-y-3 rounded-2xl border border-gray-200 p-4"
                    data-validation-field="video_url"
                    tabIndex={-1}
                    aria-invalid={Boolean(validationErrors.video_url)}
                  >
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Upload a video</h3>
                      <p className="mt-1 text-xs text-gray-500">MP4, MOV, or WebM, up to 200 MB.</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-bold text-primary-dark transition hover:bg-orange-100">
                      {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploadingVideo ? "Uploading video..." : form.video_url ? "Replace video" : "Choose video"}
                      <input
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                        onChange={uploadVideoFile}
                        disabled={uploadingVideo || saving}
                        className="sr-only"
                      />
                    </label>
                    {form.video_url && (
                      <video
                        controls
                        preload="metadata"
                        src={resolveMediaUrl(form.video_url)}
                        className="aspect-video w-full rounded-xl border border-gray-200 bg-black"
                      />
                    )}
                    {validationErrors.video_url && <p className="text-xs font-medium text-red-600">{validationErrors.video_url}</p>}
                  </section>
                )}
              </section>

              <section className="rounded-2xl border border-gray-200 p-4" data-validation-field="thumbnail_image" tabIndex={-1}>
                <div className="mb-3">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800"><ImagePlus className="h-4 w-4 text-primary" />Thumbnail image</h3>
                  <p className="mt-1 text-xs text-gray-500">Upload PNG, JPEG, or WEBP (max 3 MB).</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-bold text-primary-dark transition hover:bg-orange-100">
                    {uploadingThumbnail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploadingThumbnail ? "Uploading image..." : "Upload thumbnail"}
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadThumbnail} disabled={uploadingThumbnail || saving} className="sr-only" />
                  </label>
                  {(form.thumbnail_image || form.thumbnail_url) && (
                    <>
                      <img src={resolveMediaUrl(form.thumbnail_image || form.thumbnail_url)} alt="Video thumbnail preview" className="h-12 w-20 rounded-lg border border-gray-200 object-cover" />
                      <button type="button" onClick={() => setForm({ ...form, thumbnail_image: "", thumbnail_url: "" })} className="text-xs font-semibold text-gray-500 transition-colors hover:text-red-500">
                        Remove thumbnail
                      </button>
                    </>
                  )}
                </div>
                {validationErrors.thumbnail_image && <p className="mt-2 text-xs font-medium text-red-600">{validationErrors.thumbnail_image}</p>}
              </section>

              <section className="space-y-3 rounded-2xl border border-gray-200 p-4" data-validation-field="application_links" tabIndex={-1}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800"><Link2 className="h-4 w-4 text-primary" />Application links</h3>
                    <p className="mt-1 text-xs text-gray-500">Add one or more buttons, each with a title and URL.</p>
                  </div>
                  <button
                    type="button"
                    disabled={form.application_links.length >= 20}
                    onClick={() => setForm((current) => ({ ...current, application_links: [...current.application_links, { title: "", url: "" }] }))}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 px-3 py-2 text-xs font-bold text-primary-dark transition hover:bg-orange-50 disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />Add link
                  </button>
                </div>
                {form.application_links.map((link, index) => (
                  <div key={index} className="grid gap-3 rounded-xl bg-gray-50 p-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
                    <input maxLength={120} value={link.title} onChange={(event) => updateApplicationLink(index, "title", event.target.value)} placeholder="Link title (e.g. Apply now)" aria-label={`Application link ${index + 1} title`} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-orange-100" />
                    <input type="url" maxLength={2048} value={link.url} onChange={(event) => updateApplicationLink(index, "url", event.target.value)} placeholder="https://example.com/apply" aria-label={`Application link ${index + 1} URL`} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-orange-100" />
                    <button
                      type="button"
                      disabled={form.application_links.length === 1}
                      onClick={() => setForm((current) => ({ ...current, application_links: current.application_links.filter((_, linkIndex) => linkIndex !== index) }))}
                      aria-label={`Remove application link ${index + 1}`}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {validationErrors.application_links && <p className="text-xs font-medium text-red-600">{validationErrors.application_links}</p>}
              </section>

              <section className="space-y-3 rounded-2xl border border-gray-200 p-4">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800"><FileText className="h-4 w-4 text-primary" />Supporting documents</h3>
                  <p className="mt-1 text-xs text-gray-500">Attach up to 4 PDF, Word, Excel, RTF, or text files (max 1 MB each).</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-bold text-primary-dark transition hover:bg-orange-100">
                  {uploadingDocuments ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploadingDocuments ? "Uploading documents..." : "Upload documents"}
                  <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.rtf" onChange={uploadDocuments} disabled={uploadingDocuments || saving || form.documents.length >= 4} className="sr-only" />
                </label>
                {form.documents.length > 0 && (
                  <ul className="space-y-2">
                    {form.documents.map((document, index) => (
                      <li key={`${document.name}-${index}`} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                        <FileText className="h-4 w-4 shrink-0 text-primary-dark" />
                        <span className="min-w-0 flex-1 truncate text-gray-700">{document.name}</span>
                        <button type="button" onClick={() => setForm((current) => ({ ...current, documents: current.documents.filter((_, documentIndex) => documentIndex !== index) }))} aria-label={`Remove ${document.name}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500">
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <label className="block text-xs font-bold text-gray-700">
                  Follow-up notes
                  <textarea rows={3} maxLength={5000} value={form.follow_up_notes} onChange={(event) => setForm({ ...form, follow_up_notes: event.target.value })} placeholder="Add instructions or follow-up details for applicants..." className={`${inputClass} resize-y`} />
                </label>
              </section>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-xs font-bold text-gray-700">
                  Description
                  <textarea rows={3} maxLength={5000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Add a short description for this video..." className={`${inputClass} resize-y`} />
                </label>
                <label className="block text-xs font-bold text-gray-700">
                  Status
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className={inputClass}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
              </div>
            </form>

            <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50/80 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-gray-500">{editingVideoId ? "Save your changes to update this video." : "Add a link or upload a video to create this entry."}</p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button type="button" onClick={() => setIsAddModalOpen(false)} disabled={saving || uploadingThumbnail || uploadingVideo || uploadingDocuments} className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-600 transition-all hover:bg-gray-200 hover:text-slate-800 disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" form="add-youtube-form" disabled={saving || uploadingThumbnail || uploadingVideo || uploadingDocuments} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingVideoId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {saving ? "Saving video..." : editingVideoId ? "Save changes" : "Add video"}
                </button>
              </div>
            </footer>
          </section>
        </div>,
        document.body,
      )}

      {viewVideo && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-md" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setViewVideo(null);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="youtube-view-title" className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[24px] bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-dark">Video details</p>
                <h2 id="youtube-view-title" className="mt-1 truncate text-lg font-black text-slate-800">{viewVideo.title}</h2>
                <p className="mt-1 text-xs font-medium text-gray-500">{viewVideo.video_code}</p>
              </div>
              <button type="button" onClick={() => setViewVideo(null)} aria-label="Close video details" className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="space-y-5 p-6">
              {viewVideo.video_source === "upload" ? (
                <video
                  controls
                  preload="metadata"
                  src={resolveMediaUrl(viewVideo.video_url)}
                  poster={getVideoImage(viewVideo)}
                  className="aspect-video w-full rounded-xl border border-gray-100 bg-black"
                />
              ) : (
                <img src={getVideoImage(viewVideo)} alt={`${viewVideo.title} thumbnail`} className="aspect-video w-full rounded-xl border border-gray-100 bg-gray-50 object-cover" />
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className={`rounded-lg px-3 py-1 text-xs font-bold ${viewVideo.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}>{viewVideo.status}</span>
                <a href={viewVideo.video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-primary-dark transition hover:bg-orange-100">
                  <ExternalLink className="h-4 w-4" />{viewVideo.video_source === "upload" ? "Open uploaded video" : "Open on YouTube"}
                </a>
              </div>
              {viewVideo.description && <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">{viewVideo.description}</p>}
              {viewVideo.application_links?.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-bold text-slate-800">Application links</h3>
                  <div className="flex flex-wrap gap-2">
                    {viewVideo.application_links.map((link, index) => (
                      <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-xs font-bold text-primary-dark hover:bg-orange-100">
                        {link.title}<ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {viewVideo.documents?.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-bold text-slate-800">Supporting documents</h3>
                  <ul className="space-y-2">
                    {viewVideo.documents.map((document, index) => (
                      <li key={`${document.name}-${index}`}>
                        <a href={resolveMediaUrl(document.url)} download={document.name} className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-primary-dark">
                          <FileText className="h-4 w-4" />{document.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {viewVideo.follow_up_notes && (
                <div>
                  <h3 className="mb-2 text-sm font-bold text-slate-800">Follow-up notes</h3>
                  <p className="whitespace-pre-wrap rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">{viewVideo.follow_up_notes}</p>
                </div>
              )}
            </div>
            <footer className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/80 p-5">
              <button type="button" onClick={() => {
                const video = viewVideo;
                setViewVideo(null);
                openEditVideoModal(video);
              }} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark">
                <Pencil className="h-4 w-4" />Edit video
              </button>
            </footer>
          </section>
        </div>,
        document.body,
      )}
    </div>
  );
}

export default YoutubeVideos;
