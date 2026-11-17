import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, LoaderCircle, Plus, Save, Trash2, UploadCloud } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../api";
import { resolveMediaUrl } from "../../utils/media";
import ComboBuilder from "./ComboBuilder";

const categoriesFallback = [
  { name: "Living Room Furniture", subcategory: ["Sofa", "TV Unit", "Coffee Table"] },
  { name: "Bedroom Furniture", subcategory: ["Bed", "Wardrobe", "Bedside Table"] },
  { name: "Dining Room Furniture", subcategory: ["Dining Table", "Dining Chair"] },
  { name: "Office Furniture", subcategory: ["Office Chair", "Office Desk"] },
];

const initialForm = {
  name: "",
  combo_code: "",
  category: "",
  subcategory: "",
  brand: "",
  description: "",
  status: "Active",
  featured: false,
  trending_product: false,
  offer_product: true,
  offer_type: "Percentage",
  offer: "0",
  offer_price: "0",
  offer_price_mode: "auto",
  warranty_period: "",
  offer_start_date: "",
  offer_end_date: "",
  delivery_available: true,
  free_delivery: false,
  delivery_charges: "",
  estimated_delivery_days: "",
  return_policy: "",
  rating: "5",
};

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100";
const labelClass = "mb-1.5 block text-xs font-semibold tracking-wide text-slate-600";

function Field({ label, name, value, onChange, type = "text", placeholder, required = false, ...props }) {
  return (
    <label className="block min-w-0">
      <span className={labelClass}>{label}{required && <span className="ml-1 text-rose-500">*</span>}</span>
      <input
        className={inputClass}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        required={required}
        {...props}
      />
    </label>
  );
}

function ComboSection({ title, description, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </div>
      <div className="space-y-5 p-5 sm:p-6">{children}</div>
    </section>
  );
}

function AddCombo() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState(categoriesFallback);
  const [comboItems, setComboItems] = useState([]);
  const [specifications, setSpecifications] = useState([{ name: "", value: "" }]);
  const [summary, setSummary] = useState({ originalTotal: 0, availableComboStock: 0, resolvedCount: 0 });
  const [images, setImages] = useState([]);
  const [imageRoles, setImageRoles] = useState([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const subcategories = useMemo(() => {
    const category = categories.find((item) => item.name === form.category);
    return category?.subcategory || category?.subcategories || [];
  }, [categories, form.category]);

  useEffect(() => {
    let active = true;
    const loadForm = async () => {
      try {
        const [categoryResponse, comboResponse, codeResponse] = await Promise.all([
          api.get("/categories"),
          isEdit ? api.get(`/combos/${id}`) : Promise.resolve(null),
          isEdit ? Promise.resolve(null) : api.get("/combos/latest-code"),
        ]);
        if (!active) return;
        const loadedCategories = Array.isArray(categoryResponse.data) && categoryResponse.data.length
          ? categoryResponse.data
          : categoriesFallback;
        setCategories(loadedCategories);

        if (comboResponse) {
          const combo = comboResponse.data;
          setForm((previous) => ({
            ...previous,
            ...combo,
            combo_code: combo.combo_code || combo.product_code || "",
            offer: String(combo.offer ?? 0),
            offer_price: String(combo.offer_price ?? 0),
            offer_price_mode: combo.offer_price_mode || "auto",
            rating: String(combo.rating ?? 5),
          }));
          setComboItems(Array.isArray(combo.combo_items) ? combo.combo_items : []);
          setSpecifications(Array.isArray(combo.specifications) && combo.specifications.length
            ? combo.specifications.map((specification) => ({
              name: String(specification.name || ""),
              value: String(specification.value || ""),
            }))
            : [{ name: "", value: "" }]);
          setImages(Array.isArray(combo.images) ? combo.images : []);
          setImageRoles(Array.isArray(combo.image_roles) ? combo.image_roles : (combo.images || []).map(() => "Combo view"));
          setMainImageIndex(Math.max(0, Number(combo.main_image_index) || 0));
        } else {
          setForm((previous) => ({
            ...previous,
            category: loadedCategories[0]?.name || "",
            combo_code: codeResponse.data?.latestCode || "",
          }));
        }
      } catch (error) {
        console.error("Combo form initialization failed:", error);
        toast.error(error.response?.data?.message || "Could not load combo form data.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadForm();
    return () => { active = false; };
  }, [id, isEdit]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({ ...previous, [name]: type === "checkbox" ? checked : value }));
  };

  const uploadImages = async (fileList) => {
    const files = Array.from(fileList || []);
    const validFiles = files.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
    if (validFiles.length !== files.length) toast.error("Only JPG, PNG, and WEBP images are supported.");
    const batch = validFiles.slice(0, Math.max(0, 10 - images.length));
    if (batch.length < validFiles.length) toast.error("A combo can have up to 10 gallery images.");
    if (!batch.length) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      let completed = 0;
      for (let offset = 0; offset < batch.length; offset += 5) {
        const chunk = batch.slice(offset, offset + 5);
        const payload = new FormData();
        chunk.forEach((file) => payload.append("images", file));
        const response = await api.post("/products/upload", payload, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (event) => {
            if (event.total) {
              setUploadProgress(Math.round(((completed + (event.loaded / event.total) * chunk.length) / batch.length) * 100));
            }
          },
        });
        const uploaded = response.data?.images || [];
        if (!uploaded.length) throw new Error("The upload completed without returning image URLs.");
        setImages((previous) => [...previous, ...uploaded]);
        setImageRoles((previous) => [...previous, ...uploaded.map(() => "Combo view")]);
        completed += chunk.length;
        setUploadProgress(Math.round((completed / batch.length) * 100));
      }
      toast.success(`${batch.length} combo image${batch.length === 1 ? "" : "s"} uploaded.`);
    } catch (error) {
      console.error("Combo image upload failed:", error);
      toast.error(error.response?.data?.message || error.message || "Combo image upload failed.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveCombo = async (event, asDraft = false) => {
    event.preventDefault();
    if (!form.name.trim() || !form.category) {
      toast.error("Add a combo name and category to continue.");
      return;
    }
    if (comboItems.length < 2 || summary.resolvedCount !== comboItems.length || summary.originalTotal <= 0) {
      toast.error("Add at least two valid products to the combo.");
      return;
    }
    if (form.offer_type === "Percentage" && (Number(form.offer) < 0 || Number(form.offer) > 100)) {
      toast.error("Enter a percentage discount between 0 and 100.");
      return;
    }
    if (form.offer_start_date && form.offer_end_date && form.offer_end_date < form.offer_start_date) {
      toast.error("Combo offer end date must be on or after the start date.");
      return;
    }
    const enteredSpecifications = specifications.filter(({ name, value }) => name.trim() || value.trim());
    if (enteredSpecifications.some(({ name, value }) => !name.trim() || !value.trim())) {
      toast.error("Add both a name and a value for each specification.");
      return;
    }

    const automaticPrice = Math.max(
      0,
      form.offer_type === "Percentage"
        ? summary.originalTotal * (1 - (Number(form.offer) || 0) / 100)
        : summary.originalTotal - (Number(form.offer) || 0),
    );
    const offerPrice = form.offer_price_mode === "manual"
      ? Number(form.offer_price) || 0
      : automaticPrice;
    if (offerPrice > summary.originalTotal) {
      toast.error("Final combo price cannot exceed the original total.");
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      status: asDraft ? "Draft" : form.status,
      combo_code: form.combo_code.trim(),
      product_code: form.combo_code.trim(),
      mrp: summary.originalTotal,
      offer_price: offerPrice,
      selling_price: offerPrice,
      total_stock: summary.availableComboStock,
      rating: Number(form.rating) || 5,
      combo_items: comboItems,
      specifications: enteredSpecifications.map(({ name, value }) => ({ name: name.trim(), value: value.trim() })),
      images,
      image_roles: imageRoles,
      main_image_index: mainImageIndex,
    };
    try {
      if (isEdit) {
        await api.put(`/combos/${id}`, payload);
        toast.success(asDraft ? "Combo saved as draft." : "Combo updated successfully.");
      } else {
        await api.post("/combos", payload);
        toast.success(asDraft ? "Combo saved as draft." : "Combo created successfully.");
      }
      navigate("/admin/combos");
    } catch (error) {
      console.error("Combo save failed:", error);
      toast.error(error.response?.data?.message || "Could not save combo. Please try again.");
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm font-medium text-slate-500"><LoaderCircle size={20} className="animate-spin text-orange-500" /> Loading combo details…</div>;
  }

  return (
    <div className="mx-auto max-w-[1440px] pb-24">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Link to="/admin/combos" aria-label="Back to combos" className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-orange-200 hover:text-orange-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{isEdit ? "Edit combo" : "Add combo"}</h1>
            <p className="mt-1 text-sm text-slate-500">Build and manage bundles separately from your product catalog.</p>
          </div>
        </div>
        <span className="rounded-full border border-orange-100 bg-orange-50 px-3.5 py-2 text-xs font-bold text-orange-700">{form.status}</span>
      </div>

      <form onSubmit={saveCombo} className="space-y-5">
        <div className="grid items-start gap-5 md:grid-cols-2">
          <div className="min-w-0 space-y-5">
            <ComboSection title="Combo information" description="Combo records are saved separately from products.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Combo name" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Living room essentials" required />
                <Field label="Combo SKU / code · Auto-generated" name="combo_code" value={form.combo_code} onChange={handleChange} placeholder="Generated automatically when saved" readOnly />
                <label className="block min-w-0">
                  <span className={labelClass}>Category <span className="text-rose-500">*</span></span>
                  <select className={inputClass} name="category" value={form.category} onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value, subcategory: "" }))} required>
                    <option value="">Select a category</option>
                    {categories.map((category) => <option key={category.id || category.name} value={category.name}>{category.name}</option>)}
                  </select>
                </label>
                <label className="block min-w-0">
                  <span className={labelClass}>Subcategory</span>
                  <select className={inputClass} name="subcategory" value={form.subcategory} onChange={handleChange} disabled={!subcategories.length}>
                    <option value="">Select a subcategory</option>
                    {subcategories.map((subcategory) => <option key={subcategory} value={subcategory}>{subcategory}</option>)}
                  </select>
                </label>
                <Field label="Brand" name="brand" value={form.brand} onChange={handleChange} placeholder="Brand or collection" />
                <label className="block min-w-0">
                  <span className={labelClass}>Status</span>
                  <select className={inputClass} name="status" value={form.status} onChange={handleChange}>
                    {["Active", "Inactive", "Draft"].map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <Field label="Rating" name="rating" value={form.rating} onChange={handleChange} type="number" min="1" max="5" step="0.1" />
              </div>
              <label className="block">
                <span className={labelClass}>Combo description</span>
                <textarea className={`${inputClass} min-h-28 resize-y`} name="description" value={form.description} onChange={handleChange} rows={4} placeholder="Describe the included products and bundle value…" />
              </label>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["featured", "Featured combo"],
                  ["trending_product", "Trending combo"],
                  ["offer_product", "Combo offer"],
                ].map(([name, label]) => (
                  <label key={name} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    {label}
                    <input type="checkbox" name={name} checked={Boolean(form[name])} onChange={handleChange} className="h-4 w-4 accent-orange-600" />
                  </label>
                ))}
              </div>
            </ComboSection>

            <ComboSection title="Specifications" description="Add one or more details for this combo.">
              <div className="space-y-3">
                {specifications.map((specification, index) => (
                  <div key={index} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <Field
                      label="Specification name"
                      value={specification.name}
                      onChange={(event) => setSpecifications((previous) => previous.map((item, current) => (
                        current === index ? { ...item, name: event.target.value } : item
                      )))}
                      placeholder="e.g. Material"
                    />
                    <Field
                      label="Value"
                      value={specification.value}
                      onChange={(event) => setSpecifications((previous) => previous.map((item, current) => (
                        current === index ? { ...item, value: event.target.value } : item
                      )))}
                      placeholder="e.g. Solid wood"
                    />
                    <button
                      type="button"
                      onClick={() => setSpecifications((previous) => previous.filter((_, current) => current !== index))}
                      aria-label={`Remove specification ${index + 1}`}
                      className="mb-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 text-rose-600 transition hover:bg-rose-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSpecifications((previous) => [...previous, { name: "", value: "" }])}
                className="inline-flex items-center gap-2 rounded-xl border border-orange-200 px-3.5 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
              >
                <Plus size={16} /> Add specification
              </button>
            </ComboSection>

            <ComboSection title="Images and delivery" description="Upload combo imagery and configure delivery details.">
              <input ref={fileInputRef} className="hidden" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple onChange={(event) => uploadImages(event.target.files)} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/40 px-4 py-7 text-center transition hover:border-orange-400 disabled:opacity-60">
                {uploading ? <LoaderCircle size={24} className="animate-spin text-orange-600" /> : <UploadCloud size={24} className="text-orange-600" />}
                <span className="mt-2 text-sm font-semibold text-slate-800">{uploading ? `Uploading… ${uploadProgress}%` : "Upload combo images"}</span>
                <span className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP · up to 10 images</span>
                {uploading && <span className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-orange-100"><span className="block h-full bg-orange-500" style={{ width: `${uploadProgress}%` }} /></span>}
              </button>
              {images.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {images.map((image, index) => (
                    <div key={`${image}-${index}`} className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <img src={resolveMediaUrl(image)} alt={`Combo image ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
                      <div className="flex items-center justify-between gap-2 p-2">
                        <button type="button" onClick={() => setMainImageIndex(index)} className={`inline-flex items-center gap-1 text-xs font-semibold ${mainImageIndex === index ? "text-orange-700" : "text-slate-500"}`}>
                          <ImagePlus size={14} /> {mainImageIndex === index ? "Main image" : "Set main"}
                        </button>
                        <button type="button" onClick={() => {
                          setImages((previous) => previous.filter((_, current) => current !== index));
                          setImageRoles((previous) => previous.filter((_, current) => current !== index));
                          setMainImageIndex((previous) => previous === index ? 0 : previous > index ? previous - 1 : previous);
                        }} aria-label={`Remove image ${index + 1}`} className="text-rose-600 hover:text-rose-700">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Warranty" name="warranty_period" value={form.warranty_period} onChange={handleChange} placeholder="e.g. 3 years" />
                <Field label="Estimated delivery days" name="estimated_delivery_days" value={form.estimated_delivery_days} onChange={handleChange} type="number" min="0" />
                <Field label="Delivery charges" name="delivery_charges" value={form.delivery_charges} onChange={handleChange} type="number" min="0" step="0.01" />
              </div>
              <div className="flex flex-wrap gap-5">
                {[
                  ["delivery_available", "Delivery available"],
                  ["free_delivery", "Free delivery"],
                ].map(([name, label]) => (
                  <label key={name} className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" name={name} checked={Boolean(form[name])} onChange={handleChange} className="h-4 w-4 accent-orange-600" />
                    {label}
                  </label>
                ))}
              </div>
            </ComboSection>
          </div>

          <div className="min-w-0">
            <ComboSection title="Products and pricing" description="Choose existing catalog products, variants and quantities.">
              <ComboBuilder
                items={comboItems}
                onChange={setComboItems}
                onSummaryChange={setSummary}
                form={form}
                onFormChange={(name, value) => setForm((previous) => ({ ...previous, [name]: value }))}
                categories={categories}
              />
            </ComboSection>
          </div>
        </div>

        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <p className="text-xs text-slate-500">Combo stock is recalculated from selected component availability.</p>
          <div className="flex gap-2">
            <button type="button" onClick={(event) => saveCombo(event, true)} disabled={saving || uploading} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              Save draft
            </button>
            <button type="submit" disabled={saving || uploading} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50">
              {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
              {isEdit ? "Update combo" : "Save combo"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default AddCombo;
