import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, LoaderCircle, PackagePlus, Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api";

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function Combos() {
  const [combos, setCombos] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCombos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/combos", {
        params: { page: 1, limit: 100, search: search.trim() },
      });
      if (!Array.isArray(data?.combos)) throw new Error("The combos response did not contain a combo list.");
      setCombos(data.combos);
    } catch (requestError) {
      console.error("Combo list request failed:", requestError);
      setError(requestError.response?.data?.message || requestError.message || "Could not load combos.");
    } finally {
      setLoading(false);
    }
  }, [search]);

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
      toast.success("Combo deleted.");
      await loadCombos();
    } catch (requestError) {
      console.error("Combo deletion failed:", requestError);
      toast.error(requestError.response?.data?.message || "Could not delete this combo.");
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-white p-5 sm:flex-row sm:items-center sm:p-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-700">Separate combo catalog</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Combo management</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Create and manage furniture bundles in their own catalog and database table.</p>
        </div>
        <Link to="/admin/combos/add" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700">
          <PackagePlus size={18} /> Add combo
        </Link>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:px-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Combos</h2>
            <p className="mt-1 text-xs text-slate-500">{combos.length} shown · kept separate from All Products</p>
          </div>
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">Search combos</span>
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search combo name or code…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin text-orange-500" /> Loading combos…</div>
        ) : error ? (
          <div role="alert" className="m-5 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
        ) : combos.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-bold">Combo</th>
                  <th className="px-4 py-3 font-bold">Category</th>
                  <th className="px-4 py-3 font-bold">Included products</th>
                  <th className="px-4 py-3 font-bold">Combo price</th>
                  <th className="px-4 py-3 font-bold">Stock</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {combos.map((combo) => (
                  <tr key={combo.id} className="transition hover:bg-orange-50/30">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{combo.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{combo.combo_code || combo.product_code || "No code"}{combo.legacy_product_id ? " · migrated" : ""}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{combo.category}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{Array.isArray(combo.combo_items) ? combo.combo_items.length : 0} products</td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-bold text-slate-900">{formatPrice(combo.selling_price || combo.offer_price)}</p>
                      {Number(combo.mrp) > Number(combo.selling_price || combo.offer_price) && <p className="text-xs text-slate-400 line-through">{formatPrice(combo.mrp)}</p>}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-700">{Number(combo.total_stock) || 0}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${combo.status === "Active" ? "bg-emerald-50 text-emerald-700" : combo.status === "Draft" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{combo.status}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Link to={`/admin/combos/edit/${combo.id}`} aria-label={`Edit ${combo.name}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700">
                          <Pencil size={15} />
                        </Link>
                        {combo.legacy_product_id ? (
                          <span title="Legacy product row preserved" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-100 text-slate-300">
                            <ArrowUpRight size={15} />
                          </span>
                        ) : (
                          <button type="button" aria-label={`Delete ${combo.name}`} onClick={() => deleteCombo(combo)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-16 text-center">
            <PackagePlus size={30} className="mx-auto text-orange-400" />
            <h3 className="mt-3 text-base font-semibold text-slate-800">No combos found</h3>
            <p className="mt-1 text-sm text-slate-500">Add your first bundle; it will be stored separately from products.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Combos;
