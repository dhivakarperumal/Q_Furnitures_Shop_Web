import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleOff,
  Eye,
  Grid2X2,
  LoaderCircle,
  Package,
  PackagePlus,
  Pencil,
  Search,
  Table2,
  Trash2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api";
import { resolveMediaUrl } from "../../utils/media";

const ITEMS_PER_PAGE = 10;

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function parseImages(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function getComboImage(combo) {
  const images = parseImages(combo.images);
  const imageIndex = Number(combo.main_image_index) || 0;
  return resolveMediaUrl(images[imageIndex] || images[0] || "");
}

function getStatusStyle(status) {
  if (status === "Active") return "bg-emerald-50 text-emerald-600 border-emerald-100";
  if (status === "Draft") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-gray-50 text-gray-600 border-gray-200";
}

function Combos() {
  const [combos, setCombos] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState("table");
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, lowStock: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCombos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/combos", {
        params: {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: search.trim(),
          status,
        },
      });
      if (!Array.isArray(data?.combos)) throw new Error("The combos response did not contain a combo list.");
      setCombos(data.combos);
      setPagination(data.pagination || { total: data.combos.length, totalPages: 1 });
      setStats(data.stats || { total: 0, active: 0, inactive: 0, lowStock: 0 });
    } catch (requestError) {
      console.error("Combo list request failed:", requestError);
      setError(requestError.response?.data?.message || requestError.message || "Could not load combos.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(loadCombos, 250);
    return () => window.clearTimeout(timer);
  }, [loadCombos]);

  const deleteCombo = async (combo) => {
    if (combo.legacy_product_id) {
      toast.error("This migrated combo is linked to a legacy product record and cannot be deleted here.");
      return;
    }
    if (!window.confirm(`Delete "${combo.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/combos/${combo.id}`);
      toast.success("Combo removed.");
      await loadCombos();
    } catch (requestError) {
      console.error("Combo deletion failed:", requestError);
      toast.error(requestError.response?.data?.message || "Could not delete this combo.");
    }
  };

  const totalPages = Math.max(1, Number(pagination.totalPages) || 1);
  const pageStart = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => pageStart + index);
  const showingFrom = pagination.total ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const showingTo = Math.min(currentPage * ITEMS_PER_PAGE, pagination.total);

  const summaryCards = [
    {
      label: "Total Combos",
      value: stats.total,
      sub: "All managed combos",
      icon: <Package size={22} />,
      watermark: <Package />,
      gradient: "from-primary to-primary-dark",
      accent: "from-primary-light to-primary-dark",
      border: "border-orange-100/80 hover:border-orange-200",
      iconShadow: "shadow-orange-200/70",
      watermarkColor: "text-orange-300/20",
    },
    {
      label: "Active",
      value: stats.active,
      sub: "Active combos",
      icon: <CheckCircle2 size={22} />,
      watermark: <CheckCircle2 />,
      gradient: "from-emerald-400 to-emerald-600",
      accent: "from-emerald-400 to-emerald-600",
      border: "border-emerald-100/80 hover:border-emerald-200",
      iconShadow: "shadow-emerald-200/70",
      watermarkColor: "text-emerald-300/20",
    },
    {
      label: "Inactive",
      value: stats.inactive,
      sub: "Inactive combos",
      icon: <CircleOff size={22} />,
      watermark: <CircleOff />,
      gradient: "from-amber-400 to-amber-600",
      accent: "from-amber-400 to-amber-600",
      border: "border-amber-100/80 hover:border-amber-200",
      iconShadow: "shadow-amber-200/70",
      watermarkColor: "text-amber-300/20",
    },
    {
      label: "Low Stock",
      value: stats.lowStock,
      sub: "Combos with limited stock",
      icon: <AlertTriangle size={22} />,
      watermark: <AlertTriangle />,
      gradient: "from-rose-400 to-rose-600",
      accent: "from-rose-400 to-rose-600",
      border: "border-rose-100/80 hover:border-rose-200",
      iconShadow: "shadow-rose-200/70",
      watermarkColor: "text-rose-300/20",
    },
  ];

  return (
    <div className="min-h-screen animate-in space-y-5 fade-in slide-in-from-bottom-4 pb-20 duration-700">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className={`group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border ${card.border} bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]`}>
            <div className={`absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b ${card.accent}`} />
            <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${card.gradient} text-white shadow-lg ${card.iconShadow} transition-transform duration-200 group-hover:scale-105`}>
              {card.icon}
            </div>
            <div className="relative z-10 min-w-0">
              <p className="mb-1 text-xs font-bold tracking-wide text-secondary-light">{card.label}</p>
              <p className="mb-1 text-3xl font-black leading-none text-secondary-dark">{card.value}</p>
              <p className="truncate text-[10px] font-medium text-stone-500">{card.sub}</p>
            </div>
            <div className={`pointer-events-none absolute -right-1 bottom-1 text-6xl ${card.watermarkColor}`}>{card.watermark}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Search combos by name or code</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search combos by name, SKU..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-primary focus:bg-white"
          />
        </label>

        <label>
          <span className="sr-only">Filter combos by status</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setCurrentPage(1);
            }}
            className="cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-slate-600 outline-none transition-all hover:border-primary"
          >
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Draft">Draft</option>
          </select>
        </label>

        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-1">
            <button type="button" aria-label="Table view" aria-pressed={viewMode === "table"} onClick={() => setViewMode("table")} className={`rounded-lg p-2 transition-all ${viewMode === "table" ? "bg-white text-primary-dark shadow-sm" : "text-gray-400 hover:text-slate-600"}`}>
              <Table2 size={17} />
            </button>
            <button type="button" aria-label="Grid view" aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")} className={`rounded-lg p-2 transition-all ${viewMode === "grid" ? "bg-white text-primary-dark shadow-sm" : "text-gray-400 hover:text-slate-600"}`}>
              <Grid2X2 size={17} />
            </button>
          </div>
          <Link to="/admin/combos/add" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-900/20 transition-all hover:from-secondary-light hover:to-secondary-dark active:scale-95">
            <PackagePlus size={16} /> Add New Combo
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-32 shadow-sm">
          <LoaderCircle size={38} className="mb-4 animate-spin text-primary" />
          <p className="text-sm font-bold text-gray-400">Loading combos...</p>
        </div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-medium text-red-700">{error}</div>
      ) : combos.length ? (
        viewMode === "table" ? (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead>
                  <tr className="border-b border-secondary-dark bg-gradient-to-r from-secondary-dark to-secondary-light">
                    <th className="w-10 px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-[#FCD34D]">
                      <input type="checkbox" aria-label="Select all combos on this page" className="rounded border-[#FCD34D]/40 accent-[#FCD34D]" />
                    </th>
                    <th className="w-12 px-3 py-4 text-[11px] font-bold uppercase tracking-wider text-[#FCD34D]">S.No.</th>
                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-[#FCD34D]">Combo</th>
                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-[#FCD34D]">Category</th>
                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-[#FCD34D]">Price</th>
                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-[#FCD34D]">Included</th>
                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-[#FCD34D]">Stock</th>
                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-[#FCD34D]">Status</th>
                    <th className="px-4 py-4 text-[11px] font-bold uppercase tracking-wider text-[#FCD34D]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {combos.map((combo, index) => {
                    const image = getComboImage(combo);
                    const price = combo.selling_price || combo.offer_price;
                    return (
                      <tr key={combo.id} className="group transition-colors hover:bg-orange-50/60">
                        <td className="px-5 py-4"><input type="checkbox" aria-label={`Select ${combo.name}`} className="rounded border-gray-300 accent-orange-600" /></td>
                        <td className="px-3 py-4 text-sm font-medium text-gray-500">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-100 transition-transform group-hover:scale-105">
                              {image ? <img src={image} alt={combo.name} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-gray-400"><Package size={20} /></div>}
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[200px] truncate text-sm font-bold leading-tight text-slate-800">{combo.name}</p>
                              <p className="mt-0.5 text-[11px] font-medium text-gray-400">SKU: {combo.combo_code || combo.product_code || "—"}</p>
                              {combo.legacy_product_id && <p className="mt-1 text-[10px] font-semibold text-orange-700">Migrated record</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-primary-dark">{combo.category || "—"}</span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-slate-800">{formatPrice(price)}</p>
                          {Number(combo.mrp) > Number(price) && <p className="text-[11px] text-gray-400 line-through">{formatPrice(combo.mrp)}</p>}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-slate-600">{Array.isArray(combo.combo_items) ? combo.combo_items.length : 0} products</td>
                        <td className="px-4 py-4">
                          <span className={`text-sm font-bold ${Number(combo.total_stock) <= 0 ? "text-rose-600" : Number(combo.total_stock) <= 5 ? "text-amber-600" : "text-slate-700"}`}>{Number(combo.total_stock) || 0}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-lg border px-3 py-1 text-[11px] font-bold ${getStatusStyle(combo.status)}`}>{combo.status || "Inactive"}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Link to={`/admin/combos/${combo.id}`} aria-label={`View ${combo.name}`} title="View details" className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition-all hover:bg-sky-500 hover:text-white">
                              <Eye size={14} />
                            </Link>
                            <Link to={`/admin/combos/edit/${combo.id}`} aria-label={`Edit ${combo.name}`} title="Edit" className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-primary-dark transition-all hover:bg-primary hover:text-white">
                              <Pencil size={14} />
                            </Link>
                            {combo.legacy_product_id ? (
                              <span title="Legacy product row preserved" className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-300">
                                <ArrowUpRight size={14} />
                              </span>
                            ) : (
                              <button type="button" aria-label={`Delete ${combo.name}`} title="Delete" onClick={() => deleteCombo(combo)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-400 transition-all hover:bg-red-500 hover:text-white">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4">
              <p className="text-xs font-medium text-gray-500">Showing {showingFrom} to {showingTo} of {pagination.total} combos</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))} disabled={currentPage === 1} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition-all hover:border-primary hover:text-primary-dark disabled:opacity-30">‹</button>
                {pageNumbers.map((page) => (
                  <button key={page} type="button" onClick={() => setCurrentPage(page)} className={`h-8 w-8 rounded-lg border text-xs font-bold transition-all ${currentPage === page ? "border-primary-dark bg-gradient-to-br from-primary to-primary-dark text-white shadow-md shadow-orange-900/20" : "border-gray-200 bg-white text-gray-500 hover:border-primary"}`}>
                    {page}
                  </button>
                ))}
                <button type="button" onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))} disabled={currentPage === totalPages} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition-all hover:border-primary hover:text-primary-dark disabled:opacity-30">›</button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {combos.map((combo) => {
                const image = getComboImage(combo);
                const price = combo.selling_price || combo.offer_price;
                return (
                  <article key={combo.id} className="group flex flex-col overflow-hidden rounded-xl border border-orange-100 bg-white shadow-sm transition-all hover:shadow-xl">
                    <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                      {image ? <img src={image} alt={combo.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" /> : <div className="flex h-full items-center justify-center text-orange-200"><Package size={54} strokeWidth={1.2} /></div>}
                      <span className={`absolute left-3 top-3 rounded-lg border px-2.5 py-1 text-[10px] font-bold backdrop-blur-md ${getStatusStyle(combo.status)}`}>{combo.status}</span>
                      <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <Link to={`/admin/combos/${combo.id}`} aria-label={`View ${combo.name}`} title="View details" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sky-600 shadow-md transition-all hover:bg-sky-500 hover:text-white">
                          <Eye size={14} />
                        </Link>
                        <Link to={`/admin/combos/edit/${combo.id}`} aria-label={`Edit ${combo.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-primary-dark shadow-md transition-all hover:bg-primary hover:text-white">
                          <Pencil size={14} />
                        </Link>
                        {!combo.legacy_product_id && (
                          <button type="button" aria-label={`Delete ${combo.name}`} onClick={() => deleteCombo(combo)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-red-400 shadow-md transition-all hover:bg-red-500 hover:text-white">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary-dark">{combo.category || "Furniture combo"}</p>
                      <h3 className="mt-1 truncate text-sm font-bold text-slate-800">{combo.name}</h3>
                      <p className="mt-1 text-[10px] font-medium text-gray-400">SKU: {combo.combo_code || combo.product_code || "—"}</p>
                      <p className="mt-1 text-xs text-slate-500">{Array.isArray(combo.combo_items) ? combo.combo_items.length : 0} included products</p>
                      <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-3">
                        <div>
                          <p className="text-base font-black text-slate-800">{formatPrice(price)}</p>
                          <p className="text-[10px] text-gray-400">Stock: {Number(combo.total_stock) || 0}</p>
                        </div>
                        <Link to={`/admin/combos/edit/${combo.id}`} className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-bold text-primary-dark transition-all hover:bg-primary hover:text-white">Edit</Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-4">
              <p className="text-xs font-medium text-gray-500">Showing {showingFrom} to {showingTo} of {pagination.total} combos</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))} disabled={currentPage === 1} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition-all hover:border-primary hover:text-primary-dark disabled:opacity-30">‹</button>
                {pageNumbers.map((page) => (
                  <button key={page} type="button" onClick={() => setCurrentPage(page)} className={`h-8 w-8 rounded-lg border text-xs font-bold transition-all ${currentPage === page ? "border-primary-dark bg-gradient-to-br from-primary to-primary-dark text-white shadow-md shadow-orange-900/20" : "border-gray-200 bg-white text-gray-500 hover:border-primary"}`}>
                    {page}
                  </button>
                ))}
                <button type="button" onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))} disabled={currentPage === totalPages} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition-all hover:border-primary hover:text-primary-dark disabled:opacity-30">›</button>
              </div>
            </div>
          </>
        )
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-white py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-primary/50"><Package size={32} /></div>
          <p className="text-sm font-bold text-slate-500">{search || status !== "All" ? "No combos found" : "No combos yet"}</p>
          <p className="mt-1 text-xs text-slate-400">{search || status !== "All" ? "Try adjusting your search or filters." : "Create a bundle to get started."}</p>
          {!search && status === "All" && (
            <Link to="/admin/combos/add" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-900/20 transition hover:from-secondary-light hover:to-secondary-dark">
              <PackagePlus size={16} /> Add New Combo
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default Combos;
