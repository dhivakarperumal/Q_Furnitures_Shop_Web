import { useState, useEffect, useContext } from "react";
import { createPortal } from "react-dom";
import { useAdmin } from "../../PrivateRouter/AdminContext";
import {
  Star,
  Search,
  Filter,
  MoreVertical,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  User,
  Trash2,
  Send,
  Loader2,
  ChevronRight,
  ShieldAlert,
  Calendar,
  Package,
  ArrowUpRight,
  Reply,
  X,
  Plus,
  Camera,
  Upload,
  LayoutGrid,
  List
} from "lucide-react";
import api from "../../api";
import toast from "react-hot-toast";

const resolveReviewImage = (image) => {
  if (!image || /^(https?:|data:|blob:)/i.test(image)) return image;
  const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
};

const Reviews = () => {
  const { reviewsCache, setReviewsCache } = useAdmin();
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRating, setSelectedRating] = useState(null);
  const [viewMode, setViewMode] = useState("table");

  const currentCacheKey = `${filter}-${selectedRating}-${searchQuery}`;
  const cachedData = reviewsCache[currentCacheKey];

  const [reviews, setReviews] = useState(cachedData?.reviews || []);
  const [stats, setStats] = useState(cachedData?.stats || null);
  const [loading, setLoading] = useState(!cachedData);
  const [replyText, setReplyText] = useState("");
  const [activeReplyId, setActiveReplyId] = useState(null);

  // Add Review State
  const [showAddModal, setShowAddModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [newReview, setNewReview] = useState({
    product_id: "",
    user_name: "",
    user_email: "",
    rating: 5,
    comment: "",
    review_image: null
  });

  const fetchReviews = async () => {
    try {
      const cacheKey = `${filter}-${selectedRating}-${searchQuery}`;
      if (!reviewsCache[cacheKey]) setLoading(true);

      const params = {};
      if (filter !== "All") params.status = filter;
      if (selectedRating) params.rating = selectedRating;
      if (searchQuery) params.search = searchQuery;

      const res = await api.get("/reviews/admin/all", { params });
      const data = { reviews: res.data.reviews || [], stats: res.data.stats || null };
      setReviews(data.reviews);
      setStats(data.stats);
      setReviewsCache(prev => ({ ...prev, [cacheKey]: data }));
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get("/products", { params: { limit: 100 } });
      const productList = Array.isArray(res.data) ? res.data : res.data.products;
      setProducts(Array.isArray(productList) ? productList : []);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [filter, selectedRating]);

  useEffect(() => {
    if (showAddModal) fetchProducts();
  }, [showAddModal]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchReviews();
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.put(`/reviews/admin/${id}/status`, { status });
      toast.success(`Review ${status.toLowerCase()} successfully`);
      fetchReviews();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      await api.delete(`/reviews/admin/${id}`);
      toast.success("Review deleted");
      fetchReviews();
    } catch (err) {
      toast.error("Failed to delete review");
    }
  };

  const handleReply = async (id) => {
    if (!replyText.trim()) return;
    try {
      await api.put(`/reviews/admin/${id}/reply`, { admin_reply: replyText });
      toast.success("Reply added");
      setReplyText("");
      setActiveReplyId(null);
      fetchReviews();
    } catch (err) {
      toast.error("Failed to add reply");
    }
  };

  const handleSubmitNewReview = async (e) => {
    e.preventDefault();
    if (!newReview.product_id || !newReview.user_name || !newReview.comment) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/reviews", newReview);
      toast.success("Review created successfully");
      setShowAddModal(false);
      setNewReview({
        product_id: "",
        user_name: "",
        user_email: "",
        rating: 5,
        comment: "",
        review_image: null
      });
      fetchReviews();
    } catch (err) {
      console.error("Failed to create review:", err);
      toast.error(err.response?.data?.message || "Failed to create review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Review image is too large. Maximum size is 5 MB.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await api.post("/reviews/upload", formData);
      setNewReview((previous) => ({ ...previous, review_image: response.data.url }));
      toast.success("Review image uploaded!");
    } catch (error) {
      console.error("Review image upload failed:", error);
      toast.error("Review image upload failed");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Published": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "Pending": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      case "Flagged": return "text-red-500 bg-red-500/10 border-red-500/20";
      default: return "text-slate-400 bg-slate-400/10 border-slate-400/20";
    }
  };

  return (
    <div className="min-h-screen space-y-6 pb-20 font-sans animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4">
        <div className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-orange-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
              <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-primary-light to-primary-dark" />
              <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-orange-200/70 transition-transform duration-200 group-hover:scale-105">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="relative z-10">
                <p className="mb-1 text-xs font-bold tracking-wide text-secondary-light">Total Reviews</p>
                <p className="mb-1 text-3xl font-black leading-none text-secondary-dark">{stats?.total_reviews || 0}</p>
                <p className="text-[10px] font-medium text-stone-500">All customer reviews</p>
              </div>
              <MessageSquare className="pointer-events-none absolute -right-1 bottom-1 text-orange-300/20" size={60} />
            </div>

            <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-amber-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-amber-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
              <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-amber-400 to-amber-600" />
              <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-200/70 transition-transform duration-200 group-hover:scale-105">
                <Star className="w-5 h-5 fill-white" />
              </div>
              <div className="relative z-10">
                <p className="mb-1 text-xs font-bold tracking-wide text-secondary-light">Average Rating</p>
                <p className="mb-1 text-3xl font-black leading-none text-secondary-dark">{stats?.average_rating || 0}</p>
                <p className="text-[10px] font-medium text-stone-500">Based on all reviews</p>
              </div>
              <Star className="pointer-events-none absolute -right-1 bottom-1 fill-amber-300/20 text-amber-300/20" size={60} />
            </div>

            <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-emerald-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
              <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
              <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-200/70 transition-transform duration-200 group-hover:scale-105">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="relative z-10">
                <p className="mb-1 text-xs font-bold tracking-wide text-secondary-light">Pending</p>
                <p className="mb-1 text-3xl font-black leading-none text-secondary-dark">{stats?.pending_count || 0}</p>
                <p className="text-[10px] font-medium text-stone-500">Awaiting moderation</p>
              </div>
              <ShieldAlert className="pointer-events-none absolute -right-1 bottom-1 text-emerald-300/20" size={60} />
            </div>
          </div>
        </div>

       
      </div>

      {/* FILTERS AND SEARCH BAR */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative w-full xl:max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors group-focus-within:text-primary" />
          <input type="text" placeholder="Search reviews, products or users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-xl border border-gray-100 bg-gray-50 py-2.5 pl-11 pr-4 text-sm font-medium text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-orange-100" />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter reviews by status"
              className="min-w-40 cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm font-bold text-gray-600 outline-none focus:border-primary"
            >
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Published">Published</option>
              <option value="Flagged">Flagged</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><ChevronRight className="h-4 w-4 rotate-90" /></span>
          </div>
          <div className="relative">
            <select
              value={selectedRating || ""}
              onChange={(e) => setSelectedRating(e.target.value ? Number(e.target.value) : null)}
              aria-label="Filter reviews by rating"
              className="min-w-36 cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm font-bold text-gray-600 outline-none focus:border-primary"
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><ChevronRight className="h-4 w-4 rotate-90" /></span>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            <button type="button" onClick={() => setViewMode("card")} className={`rounded-lg p-2 transition-all ${viewMode === "card" ? "bg-orange-100 text-primary-dark" : "text-gray-400 hover:text-slate-600"}`} aria-label="Card mode" title="Card mode"><LayoutGrid className="w-4 h-4" /></button>
            <button type="button" onClick={() => setViewMode("table")} className={`rounded-lg p-2 transition-all ${viewMode === "table" ? "bg-orange-100 text-primary-dark" : "text-gray-400 hover:text-slate-600"}`} aria-label="Table mode" title="Table mode"><List className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center justify-end gap-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-md bg-gradient-to-r from-primary to-primary-dark px-5 py-3 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark active:scale-95"
          >
            <Plus className="h-5 w-5" /> Add Review
          </button>

          {/* STATS MINI CARDS */}

        </div>
        </div>
      </div>

      {/* REVIEWS GRID */}
      {loading ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-2xl border border-gray-200 bg-white p-12 shadow-sm">
          <div className="relative">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-primary"></div>
          </div>
          <p className="animate-pulse font-bold text-gray-500">Loading reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-2xl border border-gray-200 bg-white p-16 shadow-sm">
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-primary">
            <MessageSquare className="h-8 w-8" />
          </div>
          <p className="text-lg font-black text-secondary-dark">No reviews found</p>
          <p className="text-sm font-medium text-gray-500">Try adjusting your filters or search query</p>
          <button
            onClick={() => { setFilter("All"); setSelectedRating(null); setSearchQuery(""); }}
            className="mt-4 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark active:scale-95"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        viewMode === "table" ? (
          <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left">
                <thead>
                  <tr className="border-b border-secondary-dark bg-gradient-to-r from-secondary-dark to-secondary-light">
                    <th className="px-4 py-4 text-center text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">S No</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Reviewer</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Product</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Rating</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Status</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reviews.map((item, index) => (
                    <tr key={item.id} className="group transition-colors hover:bg-gray-50/50">
                      <td className="px-4 py-4 text-center text-sm font-bold text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{item.user_name}</p>
                        <p className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-600">{item.product_name || "Product Deleted"}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                          {item.rating}<Star className="h-3.5 w-3.5 fill-current" />
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block rounded-lg border px-3 py-1 text-[11px] font-bold ${getStatusColor(item.status)}`}>{item.status}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(item.id, "Published")}
                            className="flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-600 transition-colors hover:bg-emerald-100"
                          >
                            <CheckCircle className="h-4 w-4" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveReplyId(item.id)}
                            className="flex items-center gap-1.5 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-xs font-bold text-primary-dark transition-colors hover:bg-orange-100"
                          >
                            <Reply className="h-4 w-4" /> Reply
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-100"
                            aria-label="Delete review"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((item, index) => (
            <div
              key={item.id}
              className={`group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-md
                ${item.status === "Pending" ? "ring-2 ring-amber-500/20 shadow-lg shadow-amber-500/5" : ""}`}
            >
              <span className="absolute left-5 top-3 z-10 rounded-lg bg-orange-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-dark">S No. {index + 1}</span>
              {/* Header: User & Rating */}
              <div className="p-5 pt-12 pb-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-sm font-black text-white shadow-lg shadow-orange-200/70">
                      {item.user_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-sm truncate w-24">{item.user_name}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-md border text-[8px] font-black uppercase tracking-widest ${getStatusColor(item.status)}`}>
                    {item.status}
                  </div>
                </div>

                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${i < item.rating ? "fill-amber-400 text-amber-400" : "text-slate-100"}`}
                    />
                  ))}
                </div>
              </div>

              {/* Body: Comment & Product */}
              <div className="flex-1 px-5 space-y-4">
                <div className="relative">
                  <p className="min-h-[5rem] border-l-2 border-orange-200 pl-3 text-sm font-semibold italic leading-relaxed text-slate-600 line-clamp-4">
                    "{item.comment}"
                  </p>
                </div>

                <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-3">
                  <div className="flex items-center justify-between gap-2 overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="h-3.5 w-3.5 text-primary-dark" />
                      <p className="text-[10px] font-black text-slate-700 truncate">
                        {item.product_name || "Product Deleted"}
                      </p>
                    </div>
                    {item.product_id && (
                      <span className="text-[8px] font-black bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded shrink-0">
                        ID: {item.product_id}
                      </span>
                    )}
                  </div>
                </div>

                {item.review_image && (
                  <div className="relative h-32 rounded-2xl overflow-hidden border border-slate-100 group/img">
                    <img
                      src={resolveReviewImage(item.review_image)}
                      alt="Review"
                      className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <ArrowUpRight className="text-white w-6 h-6" />
                    </div>
                  </div>
                )}

                {item.admin_reply && (
                  <div className="relative rounded-xl border border-orange-100 bg-orange-50/50 p-4">
                    <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-primary-dark">Official Reply</p>
                    <p className="text-[11px] font-medium text-slate-500 italic leading-snug line-clamp-2">
                      {item.admin_reply}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer: Actions */}
              <div className="mt-5 flex items-center justify-between border-t border-gray-100 bg-gray-50/70 p-4">
                <div className="flex items-center gap-1">
                  {item.status !== "Published" && (
                    <button
                      onClick={() => handleStatusUpdate(item.id, "Published")}
                      title="Approve"
                      className="rounded-full bg-emerald-50 p-2.5 text-emerald-600 transition-colors hover:bg-emerald-100"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  {item.status !== "Flagged" && (
                    <button
                      onClick={() => handleStatusUpdate(item.id, "Flagged")}
                      title="Flag"
                      className="rounded-full bg-orange-50 p-2.5 text-primary-dark transition-colors hover:bg-orange-100"
                    >
                      <AlertCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setActiveReplyId(activeReplyId === item.id ? null : item.id)}
                    title="Reply"
                    className={`p-2.5 rounded-xl border transition-all shadow-sm
                      ${activeReplyId === item.id
                        ? "border-orange-300 bg-orange-100 text-primary-dark"
                        : "border-orange-100 bg-orange-50 text-primary-dark hover:bg-orange-100"}`}
                  >
                    <Reply className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => handleDelete(item.id)}
                  title="Delete"
                  className="rounded-full bg-red-50 p-2.5 text-red-500 transition-colors hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* REPLY OVERLAY */}
              {activeReplyId === item.id && (
                <div className="absolute inset-0 z-20 flex animate-in slide-in-from-bottom-full flex-col bg-white p-6 duration-300">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-800">Official Reply</span>
                    <button type="button" onClick={() => setActiveReplyId(null)} className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-slate-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    placeholder="Type response..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="mb-4 w-full flex-1 resize-none rounded-xl border border-gray-200 bg-white p-4 text-sm font-medium text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-orange-100"
                  />
                  <button
                    onClick={() => handleReply(item.id)}
                    disabled={!replyText.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark py-3 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" /> Send Reply
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        )
      )}

      {/* ADD REVIEW MODAL */}
      {showAddModal && (
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 cursor-default"
              aria-label="Close review dialog"
            />
            <div className="relative flex h-[min(90vh,720px)] max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 p-6">
                <div>
                  <h2 className="text-xl font-black text-slate-800">Create Manual Review</h2>
                  <p className="mt-1 text-xs font-medium text-gray-500">Add customer feedback to a product</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  aria-label="Close dialog"
                  className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-slate-700"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitNewReview} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-700">Target Product *</label>
                    <select
                      required
                      value={newReview.product_id}
                      onChange={(e) => setNewReview({ ...newReview, product_id: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-orange-500/20"
                    >
                      <option value="">Select a Product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-700">Customer Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={newReview.user_name}
                      onChange={(e) => setNewReview({ ...newReview, user_name: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-700">Customer Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={newReview.user_email}
                      onChange={(e) => setNewReview({ ...newReview, user_email: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-gray-700">Customer Rating</label>
                    <div className="mt-1.5 flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewReview({ ...newReview, rating: star })}
                          aria-label={`${star} star${star === 1 ? "" : "s"}`}
                          aria-pressed={star === newReview.rating}
                          className="rounded-md transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                        >
                          <Star className={`h-5 w-5 ${star <= newReview.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                        </button>
                      ))}
                      <span className="ml-1 text-xs font-bold text-gray-500">{newReview.rating} Stars</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700">Review Comment *</label>
                  <textarea
                    required
                    rows="4"
                    placeholder="Write the customer's feedback here..."
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-gray-700">Review Image (Optional)</label>
                  <input
                    id="review-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="sr-only"
                  />
                  <label
                    htmlFor="review-image-upload"
                    className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center transition-all hover:border-orange-400 hover:bg-orange-50/50"
                  >
                    {newReview.review_image ? (
                      <img
                        src={resolveReviewImage(newReview.review_image)}
                        alt="Review upload preview"
                        className="h-28 w-28 rounded-xl border border-gray-200 object-cover"
                      />
                    ) : (
                      <>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                          <Camera size={19} />
                        </span>
                        <span>
                          <span className="block text-xs font-bold text-slate-700">Upload review image</span>
                          <span className="mt-1 block text-[10px] font-medium text-gray-500">PNG, JPG or WEBP up to 5 MB</span>
                        </span>
                      </>
                    )}
                  </label>
                  {newReview.review_image && (
                    <button
                      type="button"
                      onClick={() => setNewReview({ ...newReview, review_image: null })}
                      className="mt-2 text-xs font-semibold text-gray-500 transition-colors hover:text-red-500"
                    >
                      Remove image
                    </button>
                  )}
                </div>
              </form>

              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/80 p-5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-600 transition-all hover:bg-gray-200 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitNewReview}
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {submitting ? "Creating..." : "Create Review"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      )}
    </div>
  );
};

export default Reviews;
