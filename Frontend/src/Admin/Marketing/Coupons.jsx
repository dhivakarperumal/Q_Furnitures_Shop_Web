import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  BadgeCheck,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LayoutGrid,
  List,
  Loader2,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api";

const emptyCoupon = {
  code: "",
  name: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  min_order_value: "0",
  start_date: "",
  expiry_date: "",
  usage_limit_global: "",
  usage_limit_per_customer: "1",
  status: "active",
  coupon_scope: "all",
  applicable_product_ids: [],
  applicable_category_ids: [],
  applicable_subcategory_ids: [],
};

const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-orange-500/20";

function normalizeIdArray(value) {
  let ids = value;
  if (typeof ids === "string") {
    try {
      ids = JSON.parse(ids);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(ids)) return [];
  return ids.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0);
}

function formatDateTimeInput(value) {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
    if (match) return `${match[1]}T${match[2]}`;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCoupon, setCurrentCoupon] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState("table");
  const [formData, setFormData] = useState(emptyCoupon);

  const fetchCoupons = async () => {
    try {
      const { data } = await api.get("/coupons");
      setCoupons(Array.isArray(data.coupons) ? data.coupons : []);
    } catch (error) {
      console.error("Failed to fetch coupons:", error);
      toast.error(error.response?.data?.message || "Could not load coupons.");
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    setOptionsLoading(true);
    try {
      const [firstProducts, categoryResponse] = await Promise.all([
        api.get("/products", { params: { page: 1, limit: 100 } }),
        api.get("/categories"),
      ]);
      const productData = firstProducts.data;
      const allProducts = Array.isArray(productData?.products)
        ? [...productData.products]
        : Array.isArray(productData)
          ? [...productData]
          : [];
      const totalPages = Math.min(100, Math.max(1, Number(productData?.pagination?.totalPages) || 1));
      if (totalPages > 1) {
        const remainingPages = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            api.get("/products", { params: { page: index + 2, limit: 100 } })
          ),
        );
        remainingPages.forEach(({ data }) => {
          if (Array.isArray(data?.products)) allProducts.push(...data.products);
        });
      }
      setProducts(allProducts
        .filter((product) => Number.isSafeInteger(Number(product.id)) && Number(product.id) > 0)
        .map((product) => ({ value: Number(product.id), label: product.name || `Product ${product.id}` })));

      const categoryData = Array.isArray(categoryResponse.data)
        ? categoryResponse.data
        : categoryResponse.data?.categories || [];
      setCategories(categoryData
        .filter((category) => Number.isSafeInteger(Number(category.id)) && Number(category.id) > 0)
        .map((category) => ({ value: Number(category.id), label: category.name || `Category ${category.id}` })));
    } catch (error) {
      console.error("Failed to load coupon options:", error);
      toast.error(error.response?.data?.message || "Could not load products and categories.");
    } finally {
      setOptionsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetchOptions();
  }, []);

  useEffect(() => {
    if (!isModalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) setIsModalOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen, saving]);

  const openModal = (coupon = null) => {
    setCurrentCoupon(coupon);
    setFormData(coupon ? {
      ...emptyCoupon,
      ...coupon,
      applicable_product_ids: normalizeIdArray(coupon.applicable_product_ids),
      applicable_category_ids: normalizeIdArray(coupon.applicable_category_ids),
      applicable_subcategory_ids: normalizeIdArray(coupon.applicable_subcategory_ids),
      start_date: formatDateTimeInput(coupon.start_date),
      expiry_date: formatDateTimeInput(coupon.expiry_date),
    } : { ...emptyCoupon });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
    setCurrentCoupon(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const toggleSelection = (field, id) => {
    setFormData((current) => ({
      ...current,
      [field]: current[field].includes(id)
        ? current[field].filter((selectedId) => selectedId !== id)
        : [...current[field], id],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = currentCoupon
        ? await api.put(`/coupons/${currentCoupon.id}`, formData)
        : await api.post("/coupons", formData);
      if (!response.data.success) throw new Error("The coupon was not saved.");
      toast.success(currentCoupon ? "Coupon updated successfully." : "Coupon created successfully.");
      setIsModalOpen(false);
      setCurrentCoupon(null);
      await fetchCoupons();
    } catch (error) {
      console.error("Failed to save coupon:", error);
      toast.error(error.response?.data?.message || error.message || "Could not save this coupon.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return;
    setDeletingId(coupon.id);
    try {
      await api.delete(`/coupons/${coupon.id}`);
      const remainingCoupons = coupons.filter((entry) => entry.id !== coupon.id);
      setCoupons(remainingCoupons);
      const remainingFiltered = remainingCoupons.filter((entry) => {
        const query = searchTerm.trim().toLowerCase();
        const matchesSearch = !query || [entry.code, entry.name]
          .some((value) => String(value || "").toLowerCase().includes(query));
        return matchesSearch && (statusFilter === "All" || entry.status === statusFilter);
      });
      setCurrentPage((page) => Math.min(page, Math.ceil(remainingFiltered.length / 10) || 1));
      toast.success("Coupon deleted.");
    } catch (error) {
      console.error("Failed to delete coupon:", error);
      toast.error(error.response?.data?.message || "Could not delete this coupon.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCoupons = coupons.filter((coupon) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query || [coupon.code, coupon.name]
      .some((value) => String(value || "").toLowerCase().includes(query));
    return matchesSearch && (statusFilter === "All" || coupon.status === statusFilter);
  });
  const totalPages = Math.ceil(filteredCoupons.length / 10) || 1;
  const currentCoupons = filteredCoupons.slice((currentPage - 1) * 10, currentPage * 10);
  const activeCount = coupons.filter((coupon) => coupon.status === "active").length;
  const inactiveCount = coupons.length - activeCount;

  if (loading) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 shadow-sm">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-primary" />
        <p className="font-bold text-gray-500">Loading coupons...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-in slide-in-from-bottom-4 space-y-6 pb-20 font-sans duration-700">
      <section aria-label="Coupon summary" className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Coupons", value: coupons.length, detail: "All discount offers", Icon: Tag, color: "orange" },
          { label: "Active", value: activeCount, detail: "Available to customers", Icon: BadgeCheck, color: "emerald" },
          { label: "Inactive", value: inactiveCount, detail: "Currently unavailable", Icon: CircleAlert, color: "amber" },
        ].map(({ label, value, detail, Icon, color }) => (
          <article key={label} className={`group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)] ${
            color === "orange" ? "border-orange-100/80 hover:border-orange-200" : color === "emerald" ? "border-emerald-100/80 hover:border-emerald-200" : "border-amber-100/80 hover:border-amber-200"
          }`}>
            <div className={`absolute inset-y-4 left-0 w-1 rounded-r-full ${
              color === "orange" ? "bg-gradient-to-b from-primary-light to-primary-dark" : color === "emerald" ? "bg-gradient-to-b from-emerald-400 to-emerald-600" : "bg-gradient-to-b from-amber-400 to-amber-600"
            }`} />
            <span className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white shadow-lg transition-transform duration-200 group-hover:scale-105 ${
              color === "orange" ? "bg-gradient-to-br from-primary to-primary-dark shadow-orange-200/70" : color === "emerald" ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-200/70" : "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-200/70"
            }`}><Icon className="h-5 w-5" /></span>
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
        <label className="group relative block w-full max-w-md flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search coupons by code or name..."
            aria-label="Search coupons"
            className="w-full rounded-xl border border-gray-100 bg-gray-50 py-2.5 pl-11 pr-4 text-sm font-medium text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-orange-100"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter coupons by status"
              className="appearance-none cursor-pointer rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm font-bold text-gray-600 outline-none focus:border-primary"
            >
              <option value="All">Select Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            <button type="button" onClick={() => setViewMode("table")} aria-label="Table view" aria-pressed={viewMode === "table"} className={`rounded-lg p-2 transition-all ${viewMode === "table" ? "bg-orange-100 text-primary-dark" : "text-gray-400 hover:text-slate-600"}`}>
              <List className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setViewMode("grid")} aria-label="Grid view" aria-pressed={viewMode === "grid"} className={`rounded-lg p-2 transition-all ${viewMode === "grid" ? "bg-orange-100 text-primary-dark" : "text-gray-400 hover:text-slate-600"}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <button type="button" onClick={() => openModal()} className="flex items-center gap-2 rounded-md bg-gradient-to-r from-primary to-primary-dark px-5 py-3 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark active:scale-95">
            <Plus className="h-4 w-4" />Add New Coupon
          </button>
          </div>
        </div>
      </section>

      {viewMode === "table" ? (
        <section className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] whitespace-nowrap text-left">
              <thead>
                <tr className="border-b border-secondary-dark bg-gradient-to-r from-secondary-dark to-secondary-light">
                  {["S. No.", "Code", "Name", "Discount", "Validity", "Usage", "Scope", "Status", "Actions"].map((heading) => (
                    <th key={heading} className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentCoupons.length ? currentCoupons.map((coupon, index) => (
                  <tr key={coupon.id} className="group transition-colors hover:bg-gray-50/50">
                    <td className="px-4 py-4 text-sm font-bold text-gray-500">{(currentPage - 1) * 10 + index + 1}</td>
                    <td className="px-4 py-4"><span className="inline-flex rounded-lg border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-bold text-gray-800">{coupon.code}</span></td>
                    <td className="px-4 py-4"><p className="font-bold text-slate-800">{coupon.name}</p><p className="mt-1 max-w-48 truncate text-xs text-gray-400">{coupon.description}</p></td>
                    <td className="px-4 py-4 font-black text-primary-dark">{coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}</td>
                    <td className="px-4 py-4 text-xs font-semibold text-slate-600"><div>Start: {formatDate(coupon.start_date)}</div><div className="mt-1">End: {formatDate(coupon.expiry_date)}</div></td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">{coupon.usage_count || 0}{coupon.usage_limit_global ? ` / ${coupon.usage_limit_global}` : " used"}</td>
                    <td className="px-4 py-4 text-xs font-bold capitalize text-slate-700">{String(coupon.coupon_scope || "all").replace(/_/g, " ")}</td>
                    <td className="px-4 py-4 text-center"><span className={`inline-block rounded-lg px-3 py-1 text-[11px] font-bold ${coupon.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}>{coupon.status}</span></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => openModal(coupon)} className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-primary-dark transition-colors hover:bg-orange-100" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDelete(coupon)} disabled={deletingId === coupon.id} className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-100 disabled:opacity-50" title="Delete">
                          {deletingId === coupon.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="9" className="px-5 py-12 text-center text-sm font-semibold text-slate-500">No coupons found. Create one to get started.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {currentCoupons.length ? currentCoupons.map((coupon) => (
            <article key={coupon.id} className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-primary">
                  <Tag className="h-6 w-6" />
                </span>
                <span className="rounded bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">{coupon.code}</span>
              </div>
              <div className="flex-1">
                <h3 className="mb-1 text-sm font-bold text-slate-800">{coupon.name}</h3>
                <p className="mb-4 line-clamp-2 text-xs text-gray-500">{coupon.description || "No description provided."}</p>
                <div className="mb-4 flex items-center gap-4">
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">Discount</p>
                    <p className="text-sm font-bold text-primary-dark">{coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">Status</p>
                    <span className={`mt-0.5 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${coupon.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}>{coupon.status}</span>
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-500">Valid until {formatDate(coupon.expiry_date)}</p>
              </div>
              <div className="mt-auto flex shrink-0 items-center gap-2 border-t border-gray-50 pt-4">
                <button type="button" onClick={() => openModal(coupon)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-orange-200 py-1.5 text-xs font-bold text-primary-dark transition-colors hover:bg-orange-50">
                  <Pencil className="h-3 w-3" />Edit
                </button>
                <button type="button" onClick={() => handleDelete(coupon)} disabled={deletingId === coupon.id} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-1.5 text-xs font-bold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50">
                  {deletingId === coupon.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}Delete
                </button>
              </div>
            </article>
          )) : (
            <div className="col-span-full rounded-2xl border border-gray-200 bg-white p-12 text-center text-sm font-semibold text-slate-500">No coupons found. Create one to get started.</div>
          )}
        </section>
      )}

      {filteredCoupons.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-sm font-bold text-gray-500">
            Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, filteredCoupons.length)} of {filteredCoupons.length} coupons
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))} disabled={currentPage === 1} aria-label="Previous page" className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-primary px-2 text-sm font-bold text-white shadow-sm shadow-orange-200">{currentPage}</span>
            <button type="button" onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))} disabled={currentPage === totalPages} aria-label="Next page" className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-md" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) closeModal();
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="coupon-modal-title" className="my-auto flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <header className="flex shrink-0 items-center justify-between border-b border-gray-100 p-6">
              <div>
                <h2 id="coupon-modal-title" className="text-xl font-black text-slate-800">{currentCoupon ? "Edit Coupon" : "Create New Coupon"}</h2>
                <p className="mt-1 text-xs font-medium text-gray-500">Manage discount settings and limits</p>
              </div>
              <button type="button" onClick={closeModal} disabled={saving} aria-label="Close coupon form" className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-slate-700 disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </header>
            <form id="coupon-form" onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-white p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-700">Coupon code *
                  <input required maxLength={64} pattern="[A-Za-z0-9][A-Za-z0-9_-]*" name="code" value={formData.code} onChange={handleChange} placeholder="e.g. SUMMER50" className={`${inputClass} mt-2 uppercase`} />
                </label>
                <label className="text-xs font-bold text-slate-700">Coupon name *
                  <input required maxLength={160} name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Summer special sale" className={`${inputClass} mt-2`} />
                </label>
                <label className="text-xs font-bold text-slate-700 sm:col-span-2">Description
                  <textarea rows={2} maxLength={5000} name="description" value={formData.description || ""} onChange={handleChange} placeholder="Brief description of the coupon..." className={`${inputClass} mt-2 resize-y`} />
                </label>
                <label className="text-xs font-bold text-slate-700">Discount type *
                  <select required name="discount_type" value={formData.discount_type} onChange={handleChange} className={`${inputClass} mt-2`}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed amount (₹)</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-700">Discount value *
                  <input required type="number" min="0.01" max={formData.discount_type === "percentage" ? "100" : undefined} step="0.01" name="discount_value" value={formData.discount_value} onChange={handleChange} placeholder="e.g. 10" className={`${inputClass} mt-2`} />
                </label>
                <label className="text-xs font-bold text-slate-700">Minimum order value (₹)
                  <input type="number" min="0" step="0.01" name="min_order_value" value={formData.min_order_value} onChange={handleChange} className={`${inputClass} mt-2`} />
                </label>
                <label className="text-xs font-bold text-slate-700">Global usage limit
                  <input type="number" min="1" step="1" name="usage_limit_global" value={formData.usage_limit_global} onChange={handleChange} placeholder="Leave blank for unlimited" className={`${inputClass} mt-2`} />
                </label>
                <label className="text-xs font-bold text-slate-700">Usage limit per customer *
                  <input required type="number" min="1" step="1" name="usage_limit_per_customer" value={formData.usage_limit_per_customer} onChange={handleChange} className={`${inputClass} mt-2`} />
                </label>
                <label className="text-xs font-bold text-slate-700">Start date & time *
                  <input required type="datetime-local" name="start_date" value={formData.start_date} onChange={handleChange} className={`${inputClass} mt-2`} />
                </label>
                <label className="text-xs font-bold text-slate-700">Expiry date & time *
                  <input required type="datetime-local" name="expiry_date" value={formData.expiry_date} onChange={handleChange} className={`${inputClass} mt-2`} />
                </label>
                <label className="text-xs font-bold text-slate-700">Status
                  <select name="status" value={formData.status} onChange={handleChange} className={`${inputClass} mt-2`}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-700">Coupon applies to *
                  <select required name="coupon_scope" value={formData.coupon_scope} onChange={handleChange} className={`${inputClass} mt-2`}>
                    <option value="all">All products</option>
                    <option value="first_order_only">First order only</option>
                    <option value="new_customers_only">New customers only</option>
                    <option value="specific_products">Specific products</option>
                    <option value="specific_categories">Specific categories</option>
                  </select>
                </label>
              </div>

              {formData.coupon_scope === "specific_products" && (
                <fieldset className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
                  <legend className="px-1 text-xs font-bold text-slate-700">Select products *</legend>
                  {optionsLoading ? <p className="text-sm text-slate-500">Loading products...</p> : products.length ? (
                    <div className="grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2">
                      {products.map((product) => (
                        <label key={product.value} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                          <input type="checkbox" checked={formData.applicable_product_ids.includes(product.value)} onChange={() => toggleSelection("applicable_product_ids", product.value)} className="accent-orange-600" />
                          <span className="truncate">{product.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : <p className="text-sm text-slate-500">No products available.</p>}
                </fieldset>
              )}

              {formData.coupon_scope === "specific_categories" && (
                <fieldset className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
                  <legend className="px-1 text-xs font-bold text-slate-700">Select categories *</legend>
                  {optionsLoading ? <p className="text-sm text-slate-500">Loading categories...</p> : categories.length ? (
                    <div className="grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2">
                      {categories.map((category) => (
                        <label key={category.value} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                          <input type="checkbox" checked={formData.applicable_category_ids.includes(category.value)} onChange={() => toggleSelection("applicable_category_ids", category.value)} className="accent-orange-600" />
                          <span className="truncate">{category.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : <p className="text-sm text-slate-500">No categories available.</p>}
                </fieldset>
              )}
            </form>
            <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/80 p-5">
              <button type="button" onClick={closeModal} disabled={saving} className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-600 transition-all hover:bg-gray-200 hover:text-slate-800 disabled:opacity-50">Cancel</button>
              <button type="submit" form="coupon-form" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark active:scale-95 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                {saving ? "Saving..." : currentCoupon ? "Save changes" : "Create coupon"}
              </button>
            </footer>
          </section>
        </div>,
        document.body,
      )}
    </div>
  );
}

export default Coupons;
