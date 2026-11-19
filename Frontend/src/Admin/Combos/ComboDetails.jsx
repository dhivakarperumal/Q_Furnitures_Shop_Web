import { Link } from "react-router-dom";
import { PackageX } from "lucide-react";

function ComboDetails() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-600">
          <PackageX size={28} />
        </div>
        <h1 className="mt-5 text-xl font-bold text-slate-900">Combos feature removed</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          The combos table and combo management page are no longer available.
        </p>
        <Link
          to="/admin/products/all"
          className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark"
        >
          Go to All Products
        </Link>
      </div>
    </div>
  );
}

export default ComboDetails;