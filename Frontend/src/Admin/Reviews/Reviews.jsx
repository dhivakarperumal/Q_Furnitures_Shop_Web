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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4">
        <div className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <div className="bg-white p-5 min-h-[116px] rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Total</p>
                <p className="text-3xl font-black text-slate-800 leading-none my-0.5">{stats?.total_reviews || 0}</p>
                <p className="text-[10px] text-slate-400">All customer reviews</p>
              </div>
            </div>

            <div className="bg-white p-5 min-h-[116px] rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white shadow-lg shrink-0">
                <Star className="w-5 h-5 fill-white" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Avg Rating</p>
                <p className="text-3xl font-black text-slate-800 leading-none my-0.5">{stats?.average_rating || 0}</p>
                <p className="text-[10px] text-slate-400">Based on all reviews</p>
              </div>
            </div>

            <div className="bg-white p-5 min-h-[116px] rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white shadow-lg shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Pending</p>
                <p className="text-3xl font-black text-slate-800 leading-none my-0.5">{stats?.pending_count || 0}</p>
                <p className="text-[10px] text-slate-400">Awaiting moderation</p>
              </div>
            </div>
          </div>
        </div>

       
      </div>

      {/* FILTERS AND SEARCH BAR */}
      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="relative w-full xl:max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#4b0b78]" />
          <input type="text" placeholder="Search reviews, products or users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full min-h-[48px] bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 text-sm font-semibold focus:outline-none focus:border-[#4b0b78]" />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter reviews by status"
              className="appearance-none min-w-40 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 pr-9 text-xs font-black uppercase tracking-widest text-[#4b0b78] outline-none focus:border-[#4b0b78]"
            >
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Published">Published</option>
              <option value="Flagged">Flagged</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">▼</span>
          </div>
          <div className="relative">
            <select
              value={selectedRating || ""}
              onChange={(e) => setSelectedRating(e.target.value ? Number(e.target.value) : null)}
              aria-label="Filter reviews by rating"
              className="appearance-none min-w-36 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 pr-9 text-xs font-black uppercase tracking-widest text-[#4b0b78] outline-none focus:border-[#4b0b78]"
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">▼</span>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1">
            <button type="button" onClick={() => setViewMode("card")} className={`p-2 rounded-lg ${viewMode === "card" ? "bg-white text-[#4b0b78] shadow-sm" : "text-slate-400"}`} aria-label="Card mode" title="Card mode"><LayoutGrid className="w-4 h-4" /></button>
            <button type="button" onClick={() => setViewMode("table")} className={`p-2 rounded-lg ${viewMode === "table" ? "bg-white text-[#4b0b78] shadow-sm" : "text-slate-400"}`} aria-label="Table mode" title="Table mode"><List className="w-4 h-4" /></button>
          </div>
           <div className="flex items-center justify-end gap-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-2 bg-[#4b0b78] text-white rounded-md text-xs font-black uppercase tracking-widest hover:bg-[#260642] shadow-xl shadow-purple-900/10 transition-all active:scale-95"
          >
            <Plus className="w-4 h-6" /> Add Review
          </button>

          {/* STATS MINI CARDS */}

        </div>
        </div>
      </div>

      {/* REVIEWS GRID */}
      {loading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 bg-white/50 rounded-[2.5rem] border border-dashed border-slate-200">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin"></div>
          </div>
          <p className="text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">Synchronizing Feedback...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 bg-white rounded-[2.5rem] border border-slate-100 border-dashed">
          <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200 mb-2">
            <MessageSquare className="w-10 h-10" />
          </div>
          <p className="text-slate-900 font-black text-lg">No reviews found</p>
          <p className="text-slate-400 text-sm font-medium">Try adjusting your filters or search query</p>
          <button
            onClick={() => { setFilter("All"); setSelectedRating(null); setSearchQuery(""); }}
            className="mt-4 px-6 py-3 bg-[#4b0b78] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#260642] transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        viewMode === "table" ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead><tr className="bg-gradient-to-r from-[#260642] to-[#4b0b78] text-[#facc15] text-[11px] font-black uppercase tracking-wider"><th className="px-4 py-4 text-center">S No</th><th className="px-6 py-4">Reviewer</th><th className="px-6 py-4">Product</th><th className="px-6 py-4">Rating</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
              <tbody>{reviews.map((item, index) => <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/60"><td className="px-4 py-4 text-center text-sm font-bold text-slate-400">{index + 1}</td><td className="px-6 py-4"><p className="font-bold text-slate-800">{item.user_name}</p><p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString()}</p></td><td className="px-6 py-4 text-sm font-semibold text-slate-600">{item.product_name || "Product Deleted"}</td><td className="px-6 py-4"><span className="inline-flex items-center gap-1 font-bold text-amber-500">{item.rating}<Star className="w-3.5 h-3.5 fill-current" /></span></td><td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase ${getStatusColor(item.status)}`}>{item.status}</span></td><td className="px-6 py-4"><div className="flex justify-end gap-2"><button onClick={() => handleStatusUpdate(item.id, "Published")} className="px-3 py-2 rounded-lg bg-[#4b0b78] text-white text-xs font-bold hover:bg-[#260642]">Approve</button><button onClick={() => setActiveReplyId(item.id)} className="px-3 py-2 rounded-lg bg-[#4b0b78] text-white text-xs font-bold hover:bg-[#260642]">Reply</button><button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg bg-[#4b0b78] text-white hover:bg-[#260642]" aria-label="Delete review"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}</tbody>
            </table>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((item, index) => (
            <div
              key={item.id}
              className={`group relative bg-white rounded-xl border border-slate-100 border-t-4 border-t-[#4b0b78] flex flex-col overflow-hidden hover:shadow-xl hover:shadow-purple-900/10 transition-all duration-300 hover:-translate-y-1 min-w-0
                ${item.status === 'Pending' ? 'ring-2 ring-amber-500/20 shadow-lg shadow-amber-500/5' : ''}`}
            >
              <span className="absolute top-3 left-5 z-10 px-2 py-1 rounded-md bg-[#4b0b78] text-white text-[9px] font-black uppercase tracking-widest">S No. {index + 1}</span>
              {/* Header: User & Rating */}
              <div className="p-5 pt-12 pb-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#4b0b78] flex items-center justify-center text-white text-sm font-black shadow-lg shadow-purple-900/20">
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
                  <p className="text-sm font-semibold text-slate-600 italic leading-relaxed line-clamp-4 min-h-[5rem] pl-3 border-l-2 border-purple-200">
                    "{item.comment}"
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100">
                  <div className="flex items-center justify-between gap-2 overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="w-3.5 h-3.5 text-[#4b0b78]" />
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
                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100/50 relative">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Official Reply</p>
                    <p className="text-[11px] font-medium text-slate-500 italic leading-snug line-clamp-2">
                      {item.admin_reply}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer: Actions */}
              <div className="p-4 mt-5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {item.status !== "Published" && (
                    <button
                      onClick={() => handleStatusUpdate(item.id, "Published")}
                      title="Approve"
                      className="p-2.5 bg-[#4b0b78] text-white border border-[#4b0b78] rounded-xl hover:bg-[#260642] transition-all shadow-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  {item.status !== "Flagged" && (
                    <button
                      onClick={() => handleStatusUpdate(item.id, "Flagged")}
                      title="Flag"
                      className="p-2.5 bg-[#4b0b78] text-white border border-[#4b0b78] rounded-xl hover:bg-[#260642] transition-all shadow-sm"
                    >
                      <AlertCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setActiveReplyId(activeReplyId === item.id ? null : item.id)}
                    title="Reply"
                    className={`p-2.5 rounded-xl border transition-all shadow-sm
                      ${activeReplyId === item.id
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-[#4b0b78] text-white border-[#4b0b78] hover:bg-[#260642]"}`}
                  >
                    <Reply className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => handleDelete(item.id)}
                  title="Delete"
                  className="p-2.5 bg-[#4b0b78] text-white hover:bg-[#260642] rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* REPLY OVERLAY */}
              {activeReplyId === item.id && (
                <div className="absolute inset-0 z-20 bg-white p-6 flex flex-col animate-in slide-in-from-bottom-full duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Official Reply</span>
                    <button onClick={() => setActiveReplyId(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    placeholder="Type response..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 focus:outline-none focus:border-blue-500 text-xs font-semibold text-slate-700 resize-none mb-4"
                  />
                  <button
                    onClick={() => handleReply(item.id)}
                    disabled={!replyText.trim()}
                    className="w-full py-3 bg-[#4b0b78] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#260642] disabled:opacity-50 flex items-center justify-center gap-2"
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
        <div className="fixed inset-0 z-[100] flex h-screen w-screen items-center justify-center p-4 sm:p-6 italic">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[3px] animate-in fade-in duration-300" onClick={() => setShowAddModal(false)}></div>

          <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Create Manual Review</h2>
                <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Admin Control Panel</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitNewReview} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Target Product *</label>
                  <select
                    required
                    value={newReview.product_id}
                    onChange={(e) => setNewReview({ ...newReview, product_id: e.target.value })}
                    className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 text-sm font-semibold transition-all"
                  >
                    <option value="">Select a Product</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Customer Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={newReview.user_name}
                    onChange={(e) => setNewReview({ ...newReview, user_name: e.target.value })}
                    className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 text-sm font-semibold transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Customer Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={newReview.user_email}
                    onChange={(e) => setNewReview({ ...newReview, user_email: e.target.value })}
                    className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 text-sm font-semibold transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Customer Rating</label>
                  <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReview({ ...newReview, rating: star })}
                        className="hover:scale-125 transition-transform"
                      >
                        <Star
                          className={`w-6 h-6 ${star <= newReview.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-black text-slate-400 uppercase">{newReview.rating} Stars</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Review Comment *</label>
                <textarea
                  required
                  rows="4"
                  placeholder="Write the customer's feedback here..."
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                  className="w-full p-5 rounded-2xl border border-slate-100 bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 text-sm font-semibold transition-all resize-none"
                ></textarea>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Review Image (Optional)</label>
                <div className="relative group overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full p-8 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-3 bg-slate-50 group-hover:bg-blue-50/30 group-hover:border-blue-200 transition-all">
                    {newReview.review_image ? (
                      <div className="relative">
                        <img src={resolveReviewImage(newReview.review_image)} className="w-32 h-32 rounded-2xl object-cover shadow-xl" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setNewReview({ ...newReview, review_image: null }); }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-300 shadow-sm">
                          <Camera className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Click to upload photo</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1">PNG, JPG or WEBP max 5MB</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="p-8 border-t border-slate-50 bg-slate-50/30 flex items-center justify-end gap-3 sticky bottom-0">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-6 py-3 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitNewReview}
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 bg-[#4b0b78] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#260642] shadow-xl shadow-purple-900/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {submitting ? "Creating..." : "Create Review"}
              </button>
            </div>
          </div>
        </div>,
        document.body
        )
      )}
    </div>
  );
};

export default Reviews;
