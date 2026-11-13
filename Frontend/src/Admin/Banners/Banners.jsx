import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileImage,
  Image,
  LayoutGrid,
  Link as LinkIcon,
  Loader2,
  Megaphone,
  Monitor,
  Pencil,
  Plus,
  Search,
  Smartphone,
  Trash2,
  UploadCloud,
  X,
  List,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api";
import { resolveMediaUrl } from "../../utils/media";

const emptyForm = {
  title: "",
  subtitle: "",
  description: "",
  destination_link: "",
  target_section: "hero",
  is_published: true,
  desktop_image: null,
  mobile_image: null,
};

const inputClassName = "mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-orange-500/20";
const labelClassName = "mb-1.5 block text-xs font-bold text-gray-700";

function getPublishedValue(value) {
  return value === true || Number(value) === 1;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
}

function ImagePicker({ label, icon: Icon, image, onChange, required }) {
  const inputRef = useRef(null);
  const preview = image?.preview || resolveMediaUrl(typeof image === "string" ? image : "");

  const selectImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Each banner image must be 8 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange({ file, preview: String(reader.result) });
    reader.onerror = () => toast.error("Could not preview this image.");
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <span className={labelClassName}>{label}</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={`Upload ${label.toLowerCase()} banner image`}
        className="group mt-1.5 flex h-32 w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-orange-400 hover:bg-orange-50/50"
      >
        {preview ? (
          <img src={preview} alt={`${label} preview`} className="h-full w-full object-cover" />
        ) : (
          <>
            <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition group-hover:text-primary">
              <Icon size={19} />
            </span>
            <span className="text-xs font-bold text-slate-700">
              {required ? "Upload visual" : "Upload optional visual"}
            </span>
            <span className="mt-1 text-[10px] font-medium text-gray-500">PNG, JPG, WEBP, GIF up to 8 MB</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={selectImage}
      />
      {preview && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-2 text-xs font-semibold text-slate-500 transition hover:text-rose-600"
        >
          Remove {label.toLowerCase()}
        </button>
      )}
    </div>
  );
}

function BannerModal({ banner, saving, onClose, onSubmit }) {
  const [form, setForm] = useState(() => banner
    ? {
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      description: banner.description || "",
      destination_link: banner.destination_link || "",
      target_section: banner.target_section || "hero",
      is_published: getPublishedValue(banner.is_published),
      desktop_image: banner.desktop_image || null,
      mobile_image: banner.mobile_image || null,
    }
    : emptyForm);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, saving]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error("Add a headline for this promotion.");
      return;
    }
    if (!form.desktop_image) {
      toast.error("Add a desktop banner visual.");
      return;
    }

    const data = new FormData();
    data.append("title", form.title.trim());
    data.append("subtitle", form.subtitle.trim());
    data.append("description", form.description.trim());
    data.append("destination_link", form.destination_link.trim());
    data.append("target_section", form.target_section);
    data.append("is_published", String(form.is_published));
    if (form.desktop_image?.file instanceof File) {
      data.append("desktop_image", form.desktop_image.file);
    } else if (typeof form.desktop_image === "string") {
      data.append("desktop_image", form.desktop_image);
    }
    if (form.mobile_image?.file instanceof File) {
      data.append("mobile_image", form.mobile_image.file);
    } else if (typeof form.mobile_image === "string") {
      data.append("mobile_image", form.mobile_image);
    }
    onSubmit(data);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl animate-in zoom-in-95 duration-200"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-gray-100 p-6">
          <div>
            <h2 className="text-xl font-black text-slate-800">{banner ? "Edit Promotion Banner" : "Add New Promotion Banner"}</h2>
            {banner && <p className="mt-1 text-xs font-medium text-gray-500">Editing banner ID: <span className="font-bold text-primary-dark">{banner.id}</span></p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close dialog"
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <fieldset>
            <legend className={`${labelClassName} mb-1.5`}>Banner Images</legend>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <ImagePicker
                label="Desktop"
                icon={Monitor}
                image={form.desktop_image}
                onChange={(image) => setField("desktop_image", image)}
                required
              />
              <ImagePicker
                label="Mobile"
                icon={Smartphone}
                image={form.mobile_image}
                onChange={(image) => setField("mobile_image", image)}
              />
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className={labelClassName}>Headline *</span>
              <input
                value={form.title}
                onChange={(event) => setField("title", event.target.value)}
                placeholder="Catchy main title"
                maxLength={160}
                required
                className={inputClassName}
              />
            </label>
            <label className="block">
              <span className={labelClassName}>Subtitle</span>
              <input
                value={form.subtitle}
                onChange={(event) => setField("subtitle", event.target.value)}
                placeholder="Supporting tag line"
                maxLength={240}
                className={inputClassName}
              />
            </label>
          </div>

          <label className="block">
            <span className={labelClassName}>Description</span>
            <textarea
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
              placeholder="Describe the offer or collection details..."
              maxLength={5000}
              rows={3}
              className={`${inputClassName} resize-y`}
            />
          </label>

          <label className="block">
            <span className={`${labelClassName} mb-1.5`}>Action Destination (Link)</span>
            <span className="relative block">
              <LinkIcon size={16} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={form.destination_link}
                onChange={(event) => setField("destination_link", event.target.value)}
                placeholder="e.g. /shop, shop or https://..."
                maxLength={2048}
                className={`${inputClassName} pl-11`}
              />
            </span>
          </label>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <fieldset>
              <legend className={labelClassName}>Target section</legend>
              <div className="mt-1.5 grid grid-cols-2 rounded-xl border border-gray-200 bg-white p-1">
                {[["hero", "Hero sec"], ["offers", "Offers"]].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setField("target_section", value)}
                    aria-pressed={form.target_section === value}
                    className={`rounded-lg px-3 py-3 text-[10px] font-bold uppercase tracking-wide transition ${
                      form.target_section === value
                        ? "bg-orange-100 text-primary-dark shadow-sm"
                        : "text-gray-400 hover:text-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className={labelClassName}>Visibility</legend>
              <button
                type="button"
                role="switch"
                aria-checked={form.is_published}
                onClick={() => setField("is_published", !form.is_published)}
                className={`mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold transition ${
                  form.is_published
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-gray-50 text-gray-500"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${form.is_published ? "bg-emerald-500" : "bg-slate-400"}`} />
                {form.is_published ? "Published on website" : "Saved as draft"}
              </button>
            </fieldset>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/80 p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-200 hover:text-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-200 transition hover:from-secondary-light hover:to-secondary-dark active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            {saving ? "Saving..." : banner ? "Save changes" : "Create promotion"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function Banners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [activeBanner, setActiveBanner] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState("table");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchBanners = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await api.get("/admin/banners");
      if (!Array.isArray(data.banners)) throw new Error("The server returned an invalid banner list.");
      setBanners(data.banners);
    } catch (error) {
      console.error("Failed to load banners:", error);
      setLoadError(error.response?.data?.message || error.message || "Could not load banners.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const loadBanners = async () => {
      try {
        const { data } = await api.get("/admin/banners");
        if (!Array.isArray(data.banners)) throw new Error("The server returned an invalid banner list.");
        if (active) setBanners(data.banners);
      } catch (error) {
        console.error("Failed to load banners:", error);
        if (active) {
          setLoadError(error.response?.data?.message || error.message || "Could not load banners.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadBanners();
    return () => {
      active = false;
    };
  }, []);

  const openCreateModal = () => {
    setActiveBanner(null);
    setModalOpen(true);
  };

  const openEditModal = (banner) => {
    setActiveBanner(banner);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!saving) setModalOpen(false);
  };

  const uploadBannerImage = async (file) => {
    const data = new FormData();
    data.append("image", file);
    const response = await api.post("/uploads/banners", data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (typeof response.data?.url !== "string" || !response.data.url) {
      throw new Error("The image upload did not return a file path.");
    }
    return response.data.url;
  };

  const saveBanner = async (formData) => {
    setSaving(true);
    try {
      const payload = {
        title: formData.get("title"),
        subtitle: formData.get("subtitle"),
        description: formData.get("description"),
        destination_link: formData.get("destination_link"),
        target_section: formData.get("target_section"),
        is_published: formData.get("is_published"),
        desktop_image: formData.get("desktop_image"),
        mobile_image: formData.get("mobile_image") || "",
      };

      for (const field of ["desktop_image", "mobile_image"]) {
        const value = formData.get(field);
        if (value instanceof File) payload[field] = await uploadBannerImage(value);
      }

      const { data } = activeBanner
        ? await api.put(`/admin/banners/${activeBanner.id}`, payload)
        : await api.post("/admin/banners", payload);
      setBanners((current) => activeBanner
        ? current.map((banner) => banner.id === data.banner.id ? data.banner : banner)
        : [data.banner, ...current]);
      setModalOpen(false);
      toast.success(activeBanner ? "Promotion updated." : "Promotion created.");
    } catch (error) {
      console.error("Failed to save banner:", error);
      toast.error(error.response?.data?.message || error.message || "Could not save this promotion.");
    } finally {
      setSaving(false);
    }
  };

  const deleteBanner = async (banner) => {
    if (!window.confirm(`Delete "${banner.title}"? This will also remove its uploaded images.`)) return;
    setDeletingId(banner.id);
    try {
      await api.delete(`/admin/banners/${banner.id}`);
      setBanners((current) => current.filter((entry) => entry.id !== banner.id));
      setCurrentPage((page) => Math.min(page, Math.max(1, Math.ceil((banners.length - 1) / itemsPerPage))));
      toast.success("Promotion deleted.");
    } catch (error) {
      console.error("Failed to delete banner:", error);
      toast.error(error.response?.data?.message || "Could not delete this promotion.");
    } finally {
      setDeletingId(null);
    }
  };

  const publishedCount = banners.filter((banner) => getPublishedValue(banner.is_published)).length;
  const draftCount = banners.length - publishedCount;
  const filteredBanners = useMemo(() => banners.filter((banner) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || [
      banner.title,
      banner.subtitle,
      banner.description,
      banner.target_section,
      String(banner.id),
    ].some((value) => String(value || "").toLowerCase().includes(query));
    const isPublished = getPublishedValue(banner.is_published);
    const matchesStatus = statusFilter === "All" ||
      (statusFilter === "Published" && isPublished) ||
      (statusFilter === "Draft" && !isPublished);
    return matchesSearch && matchesStatus;
  }), [banners, searchQuery, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredBanners.length / itemsPerPage));
  const visibleBanners = filteredBanners.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderBannerActions = (banner) => (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => openEditModal(banner)}
        aria-label={`Edit ${banner.title}`}
        title="Edit"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-primary-dark transition-colors hover:bg-orange-100"
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        onClick={() => deleteBanner(banner)}
        disabled={deletingId === banner.id}
        aria-label={`Delete ${banner.title}`}
        title="Delete"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-100 disabled:opacity-50"
      >
        {deletingId === banner.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      </button>
    </div>
  );

  const renderBannerImage = (banner, className) => banner.desktop_image
    ? <img src={resolveMediaUrl(banner.desktop_image)} alt={banner.title} className={className} />
    : <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-300"><FileImage size={24} /></div>;

  return (
    <div className="min-h-screen space-y-6 pb-20 font-sans">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-orange-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
          <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-primary-light to-primary-dark" />
          <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-orange-200/70 transition-transform duration-200 group-hover:scale-105"><Image size={21} /></div>
          <div className="relative z-10">
            <p className="mb-1 text-xs font-bold tracking-wide text-secondary-light">Total Banners</p>
            <h3 className="mb-1 text-3xl font-black leading-none text-secondary-dark">{banners.length}</h3>
            <p className="text-[10px] font-medium text-stone-500">All promotional banners</p>
          </div>
          <Image className="pointer-events-none absolute -right-1 bottom-1 text-orange-300/20" size={60} />
        </div>
        <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-emerald-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
          <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
          <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-200/70 transition-transform duration-200 group-hover:scale-105"><CheckCircle2 size={21} /></div>
          <div className="relative z-10">
            <p className="mb-1 text-xs font-bold tracking-wide text-secondary-light">Published</p>
            <h3 className="mb-1 text-3xl font-black leading-none text-secondary-dark">{publishedCount}</h3>
            <p className="text-[10px] font-medium text-stone-500">Visible on website</p>
          </div>
          <CheckCircle2 className="pointer-events-none absolute -right-1 bottom-1 text-emerald-300/20" size={60} />
        </div>
        <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-amber-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-amber-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
          <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-amber-400 to-amber-600" />
          <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-200/70 transition-transform duration-200 group-hover:scale-105"><Megaphone size={21} /></div>
          <div className="relative z-10">
            <p className="mb-1 text-xs font-bold tracking-wide text-secondary-light">Drafts</p>
            <h3 className="mb-1 text-3xl font-black leading-none text-secondary-dark">{draftCount}</h3>
            <p className="text-[10px] font-medium text-stone-500">Not published yet</p>
          </div>
          <Megaphone className="pointer-events-none absolute -right-1 bottom-1 text-amber-300/20" size={60} />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative w-full max-w-md flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400" size={18} />
          <input
            type="search"
            placeholder="Search banners by headline, subtitle..."
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-gray-100 bg-gray-50 py-2.5 pl-11 pr-4 text-sm font-medium text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm font-bold text-gray-600 outline-none focus:border-primary sm:w-auto"
            >
              <option value="All">Select Status</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                aria-label="Table view"
                aria-pressed={viewMode === "table"}
                className={`rounded-lg p-2 transition-all ${viewMode === "table" ? "bg-orange-100 text-primary-dark" : "text-gray-400 hover:text-slate-600"}`}
              >
                <List size={18} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Card view"
                aria-pressed={viewMode === "grid"}
                className={`rounded-lg p-2 transition-all ${viewMode === "grid" ? "bg-orange-100 text-primary-dark" : "text-gray-400 hover:text-slate-600"}`}
              >
                <LayoutGrid size={18} />
              </button>
            </div>
            <button type="button" onClick={openCreateModal} className="flex items-center gap-2 rounded-md bg-gradient-to-r from-primary to-primary-dark px-4 py-3 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark active:scale-95 sm:px-5">
              <Plus size={18} />
              <span className="hidden sm:inline">Add New Banner</span>
              <span className="sm:hidden">Add Banner</span>
            </button>
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-rose-700">{loadError}</p>
          <button type="button" onClick={fetchBanners} className="mt-4 rounded-lg bg-gradient-to-r from-primary to-primary-dark px-4 py-2 text-sm font-bold text-white shadow-md shadow-orange-200">Try again</button>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-12">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-primary" />
          <p className="font-bold text-gray-500">Loading Banners...</p>
        </div>
      ) : visibleBanners.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 text-center sm:p-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-300"><Search size={30} /></div>
          <h3 className="text-lg font-bold text-slate-800">{banners.length ? "No banners found" : "No promotions yet"}</h3>
          <p className="mt-1 text-sm text-gray-400">
            {banners.length ? "Adjust your search or filter to find what you're looking for." : "Add a banner to promote your store's offers and collections."}
          </p>
          {!banners.length && (
            <button type="button" onClick={openCreateModal} className="mt-5 flex items-center gap-2 rounded-md bg-gradient-to-r from-primary to-primary-dark px-5 py-3 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark">
              <Plus size={17} /> Add New Banner
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left">
              <thead>
                <tr className="border-b border-secondary-dark bg-gradient-to-r from-secondary-dark to-secondary-light">
                  <th className="w-12 px-4 py-4 text-center text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">S.No.</th>
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Banner</th>
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Description</th>
                  <th className="px-4 py-4 text-center text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Target section</th>
                  <th className="px-4 py-4 text-center text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Status</th>
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Updated</th>
                  <th className="px-4 py-4 text-center text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visibleBanners.map((banner, index) => (
                  <tr key={banner.id} className="group transition-colors hover:bg-gray-50/50">
                    <td className="px-4 py-4 text-center text-sm font-bold text-gray-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">{renderBannerImage(banner, "h-full w-full object-cover")}</div>
                        <div className="min-w-0">
                          <h4 className="max-w-[220px] truncate text-sm font-bold text-slate-800">{banner.title}</h4>
                          {banner.subtitle && <p className="max-w-[220px] truncate text-[11px] text-gray-400">{banner.subtitle}</p>}
                          <p className="mt-0.5 text-[10px] font-medium text-gray-400">ID: {banner.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-4 text-sm font-medium text-gray-500">{banner.description || "No description"}</td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-block rounded-lg border border-orange-100 bg-orange-50 px-3 py-1 text-[11px] font-bold text-primary-dark">{banner.target_section === "offers" ? "Offers" : "Hero section"}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {getPublishedValue(banner.is_published)
                        ? <span className="inline-block rounded-lg bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-600">Published</span>
                        : <span className="inline-block rounded-lg bg-orange-50 px-3 py-1 text-[11px] font-bold text-orange-600">Draft</span>}
                    </td>
                    <td className="px-4 py-4 text-xs font-medium text-gray-500">{formatDate(banner.updated_at)}</td>
                    <td className="px-4 py-4">{renderBannerActions(banner)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} start={(currentPage - 1) * itemsPerPage + 1} end={Math.min(currentPage * itemsPerPage, filteredBanners.length)} total={filteredBanners.length} />
        </div>
      ) : (
        <div className="mb-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleBanners.map((banner) => (
              <article key={banner.id} className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-orange-200 hover:shadow-md">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="h-14 w-24 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">{renderBannerImage(banner, "h-full w-full object-cover")}</div>
                  <span className="rounded bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">ID: {banner.id}</span>
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 text-sm font-bold text-slate-800">{banner.title}</h3>
                  {banner.subtitle && <p className="mb-2 line-clamp-1 text-xs font-semibold text-primary-dark">{banner.subtitle}</p>}
                  <p className="mb-4 line-clamp-2 text-xs text-gray-500">{banner.description || "No description provided."}</p>
                  <div className="mb-4 flex flex-wrap items-center gap-4">
                    <div>
                      <p className="text-[10px] font-medium text-gray-400">Target section</p>
                      <span className="mt-0.5 inline-block rounded border border-orange-100 bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase text-primary-dark">{banner.target_section === "offers" ? "Offers" : "Hero"}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-gray-400">Status</p>
                      {getPublishedValue(banner.is_published)
                        ? <span className="mt-0.5 inline-block rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600">Published</span>
                        : <span className="mt-0.5 inline-block rounded bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-600">Draft</span>}
                    </div>
                  </div>
                </div>
                <div className="mb-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-3 text-[10px] text-gray-400">
                  <span>Created: {formatDate(banner.created_at)}</span>
                  <span>{banner.mobile_image ? "Desktop + mobile" : "Desktop only"}</span>
                </div>
                <div className="mt-auto flex items-center gap-2 border-t border-gray-50 pt-4">
                  {banner.destination_link
                    ? <a href={banner.destination_link} target={/^https?:\/\//i.test(banner.destination_link) ? "_blank" : undefined} rel="noreferrer" className="mr-auto flex items-center gap-1 text-xs font-semibold text-primary-dark hover:underline">Destination <ArrowUpRight size={14} /></a>
                    : <span className="mr-auto" />}
                  <button type="button" onClick={() => openEditModal(banner)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-orange-200 py-1.5 text-xs font-bold text-primary-dark transition-colors hover:bg-orange-50">
                    <Pencil size={12} /> Edit
                  </button>
                  <button type="button" onClick={() => deleteBanner(banner)} disabled={deletingId === banner.id} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-1.5 text-xs font-bold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50">
                    {deletingId === banner.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} />
        </div>
      )}

      {modalOpen && createPortal(
        <BannerModal key={activeBanner?.id || "new"} banner={activeBanner} saving={saving} onClose={closeModal} onSubmit={saveBanner} />,
        document.body,
      )}
    </div>
  );
}

function Pagination({ currentPage, totalPages, setCurrentPage, start, end, total }) {
  if (totalPages <= 1) {
    return total === undefined ? null : (
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
        <span>Showing {total ? `${start}–${end} of ${total} banners` : "0 banners"}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
      {total !== undefined && <span>Showing {start}–{end} of {total} banners</span>}
      <div className="ml-auto flex items-center gap-2">
        <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)} aria-label="Previous page" className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-40"><ChevronLeft size={16} /></button>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-sm shadow-orange-200">{currentPage}</span>
        <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)} aria-label="Next page" className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-40"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

export default Banners;
