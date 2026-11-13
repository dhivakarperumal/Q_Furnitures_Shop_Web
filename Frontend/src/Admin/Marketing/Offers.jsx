import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  BadgeCheck,
  Check,
  CircleAlert,
  Eye,
  Gift,
  Heart,
  LayoutGrid,
  Loader2,
  List,
  Pencil,
  Percent,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Tag,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api";

const OFFER_ICONS = {
  Tag,
  Sparkles,
  ShoppingBag,
  Gift,
  Zap,
  Percent,
  Heart,
  Star,
  ShoppingCart,
};

const emptyForm = {
  title: "",
  offer_percentage: "",
  description: "",
  icon: "Tag",
  status: "active",
  show_in_header: false,
};

function getStatusLabel(offer) {
  return offer.status === "active" ? "Active" : "Inactive";
}

function Offers() {
  const [offers, setOffers] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table");
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingHeaderIds, setUpdatingHeaderIds] = useState(() => new Set());

  const fetchOffers = async () => {
    try {
      const { data } = await api.get("/offers");
      setOffers(Array.isArray(data.offers) ? data.offers : []);
    } catch (error) {
      console.error("Could not load offers:", error);
      toast.error(error.response?.data?.message || "Could not load offers.");
      setOffers([]);
    }
  };

  useEffect(() => {
    let active = true;
    api.get("/offers")
      .then(({ data }) => {
        if (active) setOffers(Array.isArray(data.offers) ? data.offers : []);
      })
      .catch((error) => {
        if (!active) return;
        console.error("Could not load offers:", error);
        toast.error(error.response?.data?.message || "Could not load offers.");
        setOffers([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!dialog) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) setDialog(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dialog, saving]);

  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (offers || []).filter((offer) => {
      const matchesSearch = !query ||
        String(offer.title || "").toLowerCase().includes(query) ||
        String(offer.id || "").toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || offer.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [offers, search, statusFilter]);

  const openForm = (offer = null) => {
    setDialog({ mode: offer ? "edit" : "create", offer });
    setForm(offer ? {
      title: offer.title || "",
      offer_percentage: String(offer.offer_percentage ?? ""),
      description: offer.description || "",
      icon: offer.icon || "Tag",
      status: offer.status || "active",
      show_in_header: Boolean(offer.show_in_header),
    } : { ...emptyForm });
  };

  const updateHeaderVisibility = async (offer, showInHeader) => {
    const previousValue = Boolean(offer.show_in_header);
    setUpdatingHeaderIds((current) => new Set(current).add(offer.id));
    setOffers((current) => current.map((item) => item.id === offer.id
      ? { ...item, show_in_header: showInHeader }
      : item));
    try {
      await api.patch(`/offers/${offer.id}/header`, { show_in_header: showInHeader });
    } catch (error) {
      setOffers((current) => current.map((item) => item.id === offer.id
        ? { ...item, show_in_header: previousValue }
        : item));
      toast.error(error.response?.data?.message || `Could not update header visibility for "${offer.title}".`);
    } finally {
      setUpdatingHeaderIds((current) => {
        const next = new Set(current);
        next.delete(offer.id);
        return next;
      });
    }
  };

  const saveOffer = async (event) => {
    event.preventDefault();
    const percentage = Number(form.offer_percentage);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      toast.error("Offer percentage must be between 0 and 100.");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, offer_percentage: percentage };
      if (dialog.mode === "edit") {
        await api.put(`/offers/${dialog.offer.id}`, payload);
        toast.success("Offer updated.");
      } else {
        await api.post("/offers", payload);
        toast.success("Offer created.");
      }
      setDialog(null);
      await fetchOffers();
    } catch (error) {
      console.error("Could not save offer:", error);
      toast.error(error.response?.data?.message || "Could not save this offer.");
    } finally {
      setSaving(false);
    }
  };

  const deleteOffer = async (offer) => {
    if (!window.confirm(`Delete "${offer.title}"? This cannot be undone.`)) return;
    setDeletingId(offer.id);
    try {
      await api.delete(`/offers/${offer.id}`);
      setOffers((current) => current.filter((item) => item.id !== offer.id));
      toast.success("Offer deleted.");
    } catch (error) {
      console.error("Could not delete offer:", error);
      toast.error(error.response?.data?.message || "Could not delete this offer.");
    } finally {
      setDeletingId(null);
    }
  };

  if (offers === null) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 shadow-sm">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-primary" />
        <p className="font-bold text-gray-500">Loading offers...</p>
      </div>
    );
  }

  const activeCount = offers.filter((offer) => getStatusLabel(offer) === "Active").length;
  const inactiveCount = offers.length - activeCount;
  const headerOfferCount = offers.filter((offer) => offer.status === "active" && offer.show_in_header).length;
  const stats = [
    { label: "Total offers", value: offers.length, sub: "All promotions", Icon: Tag, color: "orange" },
    { label: "Live now", value: activeCount, sub: "Currently active", Icon: BadgeCheck, color: "emerald" },
    { label: "Inactive", value: inactiveCount, sub: "Not currently active", Icon: CircleAlert, color: "amber" },
    { label: "Header offers", value: headerOfferCount, sub: "Selected for website", Icon: ShoppingBag, color: "rose" },
  ];

  const renderOfferCard = (offer) => {
    const Icon = OFFER_ICONS[offer.icon] || Tag;
    const isActive = offer.status === "active";
    return (
      <article key={offer.id} className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-primary-dark">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-slate-800">{offer.title}</h3>
                <p className="mt-1 text-[10px] font-semibold text-slate-400">Offer ID #{offer.id}</p>
              </div>
              <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${isActive ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}>
                {getStatusLabel(offer)}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <span className="inline-flex rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-extrabold text-amber-800">{Number(offer.offer_percentage)}% OFF</span>
        </div>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={Boolean(offer.show_in_header)}
            disabled={updatingHeaderIds.has(offer.id)}
            onChange={(event) => updateHeaderVisibility(offer, event.target.checked)}
            aria-label={`Show ${offer.title} in website header`}
            className="h-4 w-4 rounded border-slate-300 accent-primary disabled:cursor-wait disabled:opacity-50"
          />
          Show in website header
          {updatingHeaderIds.has(offer.id) && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-label="Saving header visibility" />}
        </label>
        <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{offer.description || "No description provided."}</p>
        <div className="mt-auto flex justify-end gap-1 border-t border-gray-100 pt-2">
          <button type="button" onClick={() => setDialog({ mode: "view", offer })} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary-dark" aria-label={`View offer ${offer.title}`}><Eye className="h-4 w-4" /></button>
          <button type="button" onClick={() => openForm(offer)} className="rounded-lg p-2 text-slate-500 transition hover:bg-orange-50 hover:text-primary-dark" aria-label={`Edit offer ${offer.title}`}><Pencil className="h-4 w-4" /></button>
          <button type="button" onClick={() => deleteOffer(offer)} disabled={deletingId === offer.id} className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50" aria-label={`Delete offer ${offer.title}`}>
            {deletingId === offer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen animate-in slide-in-from-bottom-4 space-y-6 pb-20 font-sans duration-700">
      <section aria-label="Offer summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, sub, Icon, color }) => (
          <article key={label} className={`group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)] ${
            color === "orange" ? "border-orange-100/80 hover:border-orange-200" : color === "emerald" ? "border-emerald-100/80 hover:border-emerald-200" : color === "amber" ? "border-amber-100/80 hover:border-amber-200" : "border-rose-100/80 hover:border-rose-200"
          }`}>
            <div className={`absolute inset-y-4 left-0 w-1 rounded-r-full ${
              color === "orange" ? "bg-gradient-to-b from-primary-light to-primary-dark" : color === "emerald" ? "bg-gradient-to-b from-emerald-400 to-emerald-600" : color === "amber" ? "bg-gradient-to-b from-amber-400 to-amber-600" : "bg-gradient-to-b from-rose-400 to-pink-500"
            }`} />
            <span className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white shadow-lg ${
              color === "orange" ? "bg-gradient-to-br from-primary to-primary-dark shadow-orange-200/70" : color === "emerald" ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-200/70" : color === "amber" ? "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-200/70" : "bg-gradient-to-br from-rose-400 to-pink-500 shadow-rose-200/70"
            }`}><Icon className="h-5 w-5" /></span>
            <div className="relative z-10">
              <p className="mb-1 text-xs font-bold tracking-wide text-secondary-light">{label}</p>
              <p className="mb-1 text-3xl font-black leading-none text-secondary-dark">{value}</p>
              <p className="text-[10px] font-medium text-stone-500">{sub}</p>
            </div>
            <Icon className={`pointer-events-none absolute -right-1 bottom-1 h-[60px] w-[60px] ${
              color === "orange" ? "text-orange-300/20" : color === "emerald" ? "text-emerald-300/20" : color === "amber" ? "text-amber-300/20" : "text-rose-300/20"
            }`} />
          </article>
        ))}
      </section>

      <section aria-label="Search and filter offers" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="group relative block w-full max-w-md flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title or offer ID..." aria-label="Search offers" className="w-full rounded-xl border border-gray-100 bg-gray-50 py-2.5 pl-11 pr-4 text-sm font-medium text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-orange-100" />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter offers by status" className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600 outline-none focus:border-primary">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm" role="group" aria-label="Offer view">
            <button type="button" onClick={() => setViewMode("table")} aria-label="Table view" aria-pressed={viewMode === "table"} className={`rounded-lg p-2 transition-all ${viewMode === "table" ? "bg-orange-100 text-primary-dark" : "text-gray-400 hover:text-slate-600"}`}><List className="h-4 w-4" /></button>
            <button type="button" onClick={() => setViewMode("cards")} aria-label="Card view" aria-pressed={viewMode === "cards"} className={`rounded-lg p-2 transition-all ${viewMode === "cards" ? "bg-orange-100 text-primary-dark" : "text-gray-400 hover:text-slate-600"}`}><LayoutGrid className="h-4 w-4" /></button>
          </div>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={dialog?.mode === "create"}
            onClick={(event) => {
              event.preventDefault();
              openForm();
            }}
            className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-primary to-primary-dark px-5 py-3 text-sm font-bold text-white shadow-md shadow-orange-200 transition-all hover:from-secondary-light hover:to-secondary-dark active:scale-95"
          >
            <Plus className="h-4 w-4" />Add offer
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {filteredOffers.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-primary"><Tag className="h-6 w-6" /></span>
            <h3 className="mt-4 font-bold text-slate-900">{offers.length ? "No matching offers" : "Your next big offer starts here"}</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">{offers.length ? "Try changing the search or status filter." : "Create a promotion to start highlighting your best deals."}</p>
            {!offers.length && <button type="button" aria-haspopup="dialog" onClick={() => openForm()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" />Create first offer</button>}
          </div>
        ) : viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-secondary-dark bg-gradient-to-r from-secondary-dark to-secondary-light">
                  {["S No.", "Offer", "Discount", "Status", "Show in Header", "Actions"].map((heading) => <th key={heading} className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-[#FCD34D]">{heading}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOffers.map((offer, index) => {
                  const Icon = OFFER_ICONS[offer.icon] || Tag;
                  return (
                    <tr key={offer.id} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-5 py-4 text-sm font-semibold text-slate-500">{index + 1}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-primary-dark"><Icon className="h-5 w-5" /></span>
                          <div className="min-w-0"><p className="max-w-xs truncate text-sm font-bold text-slate-900">{offer.title}</p><p className="mt-1 max-w-xs truncate text-xs text-slate-400">{offer.description}</p></div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="inline-flex rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-extrabold text-amber-800">{Number(offer.offer_percentage)}% OFF</span></td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${offer.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{getStatusLabel(offer)}</span></td>
                      <td className="px-5 py-4">
                        <label className="inline-flex min-h-8 min-w-8 cursor-pointer items-center justify-center" title={offer.show_in_header ? "Shown in website header" : "Hidden from website header"}>
                          <input type="checkbox" checked={Boolean(offer.show_in_header)} disabled={updatingHeaderIds.has(offer.id)} onChange={(event) => updateHeaderVisibility(offer, event.target.checked)} aria-label={`Show ${offer.title} in website header`} className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-primary disabled:cursor-wait disabled:opacity-50" />
                          {updatingHeaderIds.has(offer.id) && <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-primary" aria-label="Saving header visibility" />}
                        </label>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setDialog({ mode: "view", offer })} title="View offer" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary-dark"><Eye className="h-4 w-4" /></button>
                          <button type="button" onClick={() => openForm(offer)} title="Edit offer" className="rounded-lg p-2 text-slate-500 transition hover:bg-orange-50 hover:text-primary-dark"><Pencil className="h-4 w-4" /></button>
                          <button type="button" onClick={() => deleteOffer(offer)} disabled={deletingId === offer.id} title="Delete offer" className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50">{deletingId === offer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredOffers.map(renderOfferCard)}
          </div>
        )}
      </section>

      {dialog && createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md" style={{ zIndex: 9999 }} onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setDialog(null);
        }}>
          <section className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl animate-in zoom-in-95 duration-200" role="dialog" aria-modal="true" aria-labelledby="offer-dialog-title">
            <header className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white p-5 text-slate-800 sm:p-6">
              <div>
                <h2 id="offer-dialog-title" className="text-xl font-black uppercase tracking-tight sm:text-2xl">{dialog.mode === "view" ? dialog.offer.title : dialog.mode === "edit" ? "Edit Offer" : "Create New Offer"}</h2>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{dialog.mode === "view" ? "Offer details and visibility" : "Manage offer details and visibility"}</p>
              </div>
              <button type="button" onClick={() => setDialog(null)} disabled={saving} className="rounded-xl p-2.5 text-gray-400 transition hover:bg-gray-100 hover:text-slate-700 disabled:opacity-50" aria-label="Close dialog"><X className="h-5 w-5" /></button>
            </header>

            {dialog.mode === "view" ? (
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
                <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 p-5">
                  {(() => { const Icon = OFFER_ICONS[dialog.offer.icon] || Tag; return <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary-dark shadow-sm"><Icon className="h-6 w-6" /></span>; })()}
                  <div><p className="text-2xl font-black text-secondary-dark">{Number(dialog.offer.offer_percentage)}% OFF</p><p className="mt-1 text-sm text-slate-500">Offer ID #{dialog.offer.id}</p></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</p><p className="mt-2 font-bold text-slate-800">{getStatusLabel(dialog.offer)}</p></div>
                  <div className="rounded-xl border border-slate-100 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Website header</p><p className="mt-2 font-bold text-slate-800">{dialog.offer.show_in_header ? "Shown when active" : "Hidden"}</p></div>
                </div>
                <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Description</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{dialog.offer.description || "No description provided."}</p></div>
                <div className="flex justify-end"><button type="button" onClick={() => openForm(dialog.offer)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-4 py-2.5 text-sm font-bold text-white"><Pencil className="h-4 w-4" />Edit offer</button></div>
              </div>
            ) : (
              <form onSubmit={saveOffer} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">Offer ID</span>
                    <input readOnly value={dialog.mode === "edit" ? dialog.offer.id : "Generated automatically"} className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-500 outline-none" />
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-xl border border-orange-100 bg-orange-50/60 px-4 py-3 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={Boolean(form.show_in_header)} onChange={(event) => setForm((current) => ({ ...current, show_in_header: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 accent-primary focus:ring-2 focus:ring-orange-500" />
                    Show on Website Header
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-700">Offer title *</span>
                      <input required maxLength={160} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Mega Shopping Festival" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-orange-500/20" />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-sm font-semibold text-slate-700">Discount percentage *</span>
                      <div className="relative">
                        <input required type="number" min="0" max="100" step="0.01" value={form.offer_percentage} onChange={(event) => setForm((current) => ({ ...current, offer_percentage: event.target.value }))} placeholder="10" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-orange-500/20" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
                      </div>
                    </label>
                    <label>
                      <span className="mb-1.5 block text-sm font-semibold text-slate-700">Offer icon</span>
                      <select value={form.icon} onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-orange-500/20">
                        {Object.keys(OFFER_ICONS).map((icon) => <option key={icon} value={icon}>{icon}</option>)}
                      </select>
                      <span className="mt-2 inline-flex items-center gap-2 text-xs text-slate-500">{(() => { const Icon = OFFER_ICONS[form.icon]; return <Icon className="h-4 w-4 text-primary" />; })()}Preview</span>
                    </label>
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-700">Description</span>
                      <textarea maxLength={5000} rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Explain what makes this offer special..." className="w-full resize-y rounded-xl border border-gray-200 px-4 py-2.5 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-orange-500/20" />
                      <span className="mt-1 block text-right text-xs text-slate-400">{form.description.length}/5000</span>
                    </label>
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-700">Offer status</span>
                      <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-orange-500/20">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </label>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50/80 p-4 sm:flex-row sm:items-center sm:justify-end">
                  {dialog.mode === "edit" && <div className="mr-auto self-center text-xs font-semibold text-slate-400">Offer ID #{dialog.offer.id}</div>}
                  <button type="button" onClick={() => setDialog(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 py-2.5 text-sm font-bold text-white transition hover:from-secondary-light hover:to-secondary-dark disabled:cursor-not-allowed disabled:opacity-60">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {saving ? "Saving..." : dialog.mode === "edit" ? "Save changes" : "Create offer"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>,
        document.body,
      )}
    </div>
  );
}

export default Offers;
