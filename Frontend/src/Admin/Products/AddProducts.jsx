import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    ArrowDown, ArrowLeft, ArrowUp, Box, Check, ChevronDown, CircleDollarSign,
    ClipboardList, ImagePlus, Layers3, LoaderCircle, PackageCheck, Plus,
    RotateCcw, Save, ShieldCheck, Sparkles, Trash2, Truck, UploadCloud,
    X
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api";
import { resolveMediaUrl } from "../../utils/media";

const categoriesFallback = [
    { name: "Living Room Furniture", subcategory: ["Sofa", "L Shape Sofa", "Recliner", "TV Unit", "Coffee Table"] },
    { name: "Bedroom Furniture", subcategory: ["Bed", "Wardrobe", "Dressing Table", "Bedside Table", "Mattress"] },
    { name: "Dining Room Furniture", subcategory: ["Dining Table", "Dining Chair", "Dining Set", "Buffet Cabinet"] },
    { name: "Office Furniture", subcategory: ["Office Chair", "Office Desk", "Computer Table", "Filing Cabinet"] },
    { name: "Kitchen Furniture", subcategory: ["Kitchen Cabinet", "Kitchen Island", "Kitchen Rack"] },
    { name: "Kids Furniture", subcategory: ["Kids Bed", "Study Table", "Kids Chair", "Kids Wardrobe"] },
    { name: "Outdoor Furniture", subcategory: ["Garden Chair", "Garden Table", "Outdoor Sofa", "Swing Chair"] },
    { name: "Storage Furniture", subcategory: ["Bookshelf", "Shoe Cabinet", "Storage Cabinet", "Drawer Unit"] },
    { name: "Study Room Furniture", subcategory: ["Study Table", "Study Chair", "Bookshelf"] },
    { name: "Home Decor Furniture", subcategory: ["Accent Chair", "Ottoman", "Console Table"] },
];

const initialForm = {
    name: "", product_code: "", category: "", subcategory: "", brand: "", model_number: "",
    description: "", tags: "", product_type: "Standard", featured: false,
    trending_product: false, offer_product: false, status: "Active",
    mrp: "", offer_type: "Percentage", offer: "", offer_price: "0",
    material_type: "", wood_type: "", colour: "", finish_type: "",
    height: "", width: "", depth: "", weight: "", seating_capacity: "", doors: "",
    drawers: "", mattress_size: "", warranty_period: "", country_of_origin: "India",
    total_stock: "0", warehouse: "", package_length: "", package_width: "", package_height: "",
    delivery_available: true, delivery_charges: "", free_delivery: false,
    estimated_delivery_days: "", assembly_required: false, installation_available: false,
    return_policy: "", video_url: "", customization_enabled: false, customization_title: "",
    customization_description: "", rating: "5",
};

const initialVariant = () => ({
    color: "", size: "", material: "", sku: "", mrp: "", offer_type: "Percentage",
    offer: "", selling_price: "", stock: "0", image: "",
});

const initialCustomization = () => ({
    name: "", type: "Dropdown Selection", options: "", additionalPrice: "0", required: false,
});

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";
const selectClass = `${inputClass} cursor-pointer`;
const labelClass = "mb-1.5 block text-xs font-semibold tracking-wide text-slate-600";
const iconButtonClass = "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40";

function Field({ label, name, value, onChange, type = "text", placeholder, required = false, min, max, step, prefix, suffix, ...props }) {
    return (
        <label className="block min-w-0">
            <span className={labelClass}>{label}{required && <span className="ml-1 text-rose-500">*</span>}</span>
            <span className="relative block">
                <input
                    className={`${inputClass} ${prefix ? "pl-8" : ""} ${suffix ? "pr-14" : ""}`}
                    name={name}
                    value={value ?? ""}
                    onChange={onChange}
                    type={type}
                    placeholder={placeholder}
                    required={required}
                    min={min}
                    max={max}
                    step={step}
                    {...props}
                />
                {prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">{prefix}</span>}
                {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">{suffix}</span>}
            </span>
        </label>
    );
}

function SelectField({ label, name, value, onChange, options, required = false, disabled = false }) {
    return (
        <label className="block min-w-0">
            <span className={labelClass}>{label}{required && <span className="ml-1 text-rose-500">*</span>}</span>
            <span className="relative block">
                <select className={`${selectClass} appearance-none pr-9 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`} name={name} value={value ?? ""} onChange={onChange} required={required} disabled={disabled}>
                    {options.map((option) => {
                        const item = typeof option === "string" ? { label: option, value: option } : option;
                        return <option key={item.value} value={item.value}>{item.label}</option>;
                    })}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </span>
        </label>
    );
}

function Toggle({ label, description, checked, onChange }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
            <div>
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
            </div>
            <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-orange-500" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-[22px]" : "left-0.5"}`} />
            </button>
        </div>
    );
}

function SectionCard({ id, title, description, icon: Icon, children, action }) {
    return (
        <section id={id} className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(27,39,51,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Icon size={19} /></span>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
                        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
                    </div>
                </div>
                {action}
            </div>
            <div className="space-y-5 p-5 sm:p-6">{children}</div>
        </section>
    );
}

const AddProducts = () => {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [categories, setCategories] = useState(categoriesFallback);
    const [form, setForm] = useState(initialForm);
    const [variants, setVariants] = useState([]);
    const [images, setImages] = useState([]);
    const [imageRoles, setImageRoles] = useState([]);
    const [mainImageIndex, setMainImageIndex] = useState(0);
    const [customizations, setCustomizations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [skuError, setSkuError] = useState("");

    const currentCategory = categories.find((item) => item.name === form.category);
    const subcategories = currentCategory?.subcategory || currentCategory?.subcategories || [];
    const calculatedOfferPrice = useMemo(() => {
        const mrp = Number(form.mrp) || 0;
        const offer = Number(form.offer) || 0;
        if (form.offer_type === "Percentage") return Math.max(0, mrp * (1 - offer / 100));
        return Math.max(0, mrp - offer);
    }, [form.mrp, form.offer, form.offer_type]);
    const stockState = Number(form.total_stock) <= 0 ? "Out of stock" : Number(form.total_stock) <= 5 ? "Low stock" : "In stock";

    useEffect(() => {
        let isMounted = true;
        const loadProduct = async () => {
            try {
                const requests = [api.get("/categories")];
                if (isEdit) requests.push(api.get(`/products/${id}`));
                else requests.push(Promise.resolve(null));
                const [categoryResponse, productResponse] = await Promise.all(requests);
                if (!isMounted) return;
                const loadedCategories = Array.isArray(categoryResponse.data) && categoryResponse.data.length
                    ? categoryResponse.data
                    : categoriesFallback;
                setCategories(loadedCategories);

                if (isEdit && productResponse) {
                    const product = productResponse.data;
                    const specifications = product.specifications || {};
                    const shipping = product.shipping || {};
                    setForm((previous) => ({
                        ...previous,
                        ...product,
                        product_code: product.product_code || "",
                        brand: product.brand || "",
                        model_number: product.model_number || "",
                        material_type: product.material_type || specifications.materialType || product.material || "",
                        wood_type: product.wood_type || specifications.woodType || "",
                        colour: product.colour || specifications.colour || "",
                        finish_type: product.finish_type || specifications.finishType || "",
                        height: product.height || specifications.height || "",
                        width: product.width || specifications.width || "",
                        depth: product.depth || specifications.depth || "",
                        weight: product.weight || specifications.weight || "",
                        seating_capacity: product.seating_capacity || specifications.seatingCapacity || "",
                        doors: product.doors || specifications.doors || "",
                        drawers: product.drawers || specifications.drawers || "",
                        mattress_size: product.mattress_size || specifications.mattressSize || "",
                        warranty_period: product.warranty_period || specifications.warrantyPeriod || "",
                        country_of_origin: product.country_of_origin || specifications.countryOfOrigin || "India",
                        package_length: product.package_length || shipping.packageLength || "",
                        package_width: product.package_width || shipping.packageWidth || "",
                        package_height: product.package_height || shipping.packageHeight || "",
                        delivery_available: product.delivery_available ?? shipping.deliveryAvailable ?? true,
                        delivery_charges: product.delivery_charges || shipping.deliveryCharges || "",
                        free_delivery: product.free_delivery ?? shipping.freeDelivery ?? false,
                        estimated_delivery_days: product.estimated_delivery_days || shipping.estimatedDeliveryDays || "",
                        assembly_required: product.assembly_required ?? shipping.assemblyRequired ?? false,
                        installation_available: product.installation_available ?? shipping.installationAvailable ?? false,
                        return_policy: product.return_policy || shipping.returnPolicy || "",
                        total_stock: String(product.total_stock ?? 0),
                        offer_type: product.offer_type || "Percentage",
                        offer: String(product.offer ?? ""),
                        rating: String(product.rating ?? "5"),
                        customization_enabled: Boolean(product.customization_enabled),
                    }));
                    const parsedVariants = Array.isArray(product.variants)
                        ? product.variants
                        : typeof product.variants === "string" ? JSON.parse(product.variants || "[]") : [];
                    setVariants(parsedVariants.map((variant) => ({
                        ...initialVariant(),
                        ...variant,
                        color: variant.color || variant.colorName || "",
                        stock: String(variant.stock ?? Object.values(variant.sizesStock || {}).reduce((sum, qty) => sum + (Number(qty) || 0), 0)),
                        image: variant.image || variant.images?.[0] || "",
                    })));
                    setImages(Array.isArray(product.images) ? product.images : []);
                    setImageRoles(Array.isArray(product.image_roles) ? product.image_roles : (product.images || []).map(() => "Product view"));
                    setMainImageIndex(Math.max(0, Number(product.main_image_index) || 0));
                    setCustomizations(Array.isArray(product.customizations) ? product.customizations : []);
                } else if (loadedCategories.length) {
                    const firstCategory = loadedCategories[0];
                    setForm((previous) => ({
                        ...previous,
                        category: firstCategory.name,
                        subcategory: "",
                        product_code: productResponse?.data?.latestCode || "",
                    }));
                }
            } catch (error) {
                console.error("Product form initialization failed:", error);
                toast.error(error.response?.data?.message || "Could not load product form data.");
            } finally {
                if (isMounted) setFetching(false);
            }
        };
        loadProduct();
        return () => { isMounted = false; };
    }, [id, isEdit]);

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setForm((previous) => ({ ...previous, [name]: type === "checkbox" ? checked : value }));
        if (name === "product_code") setSkuError("");
    };

    const generateSku = async () => {
        try {
            const response = await api.get("/products/latest-code");
            const suggested = response.data?.latestCode;
            setForm((previous) => ({
                ...previous,
                product_code: suggested || `QF-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
            }));
            setSkuError("");
        } catch (error) {
            console.error("SKU generation failed:", error);
            setForm((previous) => ({
                ...previous,
                product_code: `QF-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
            }));
            toast.error("Could not retrieve the next SKU; a unique suggestion was generated locally.");
        }
    };

    const validateSku = async () => {
        const sku = form.product_code.trim();
        if (!sku) {
            setSkuError("");
            return true;
        }
        try {
            const response = await api.get("/products", { params: { search: sku, page: 1, limit: 100 } });
            const products = Array.isArray(response.data) ? response.data : response.data?.products || [];
            const duplicate = products.find((product) =>
                String(product.product_code || "").trim().toLowerCase() === sku.toLowerCase()
                && String(product.id) !== String(id || ""),
            );
            setSkuError(duplicate ? "This SKU is already in use." : "");
            if (duplicate) toast.error("That product SKU already exists. Please use another one.");
            return !duplicate;
        } catch (error) {
            console.error("SKU validation failed:", error);
            setSkuError("SKU could not be validated. Try again before saving.");
            toast.error("Could not validate the SKU. Please try again.");
            return false;
        }
    };

    const addVariant = () => setVariants((previous) => [...previous, initialVariant()]);
    const updateVariant = (index, key, value) => setVariants((previous) => previous.map((item, i) => i === index ? { ...item, [key]: value } : item));
    const removeVariant = (index) => setVariants((previous) => previous.filter((_, i) => i !== index));

    const addFiles = async (fileList) => {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        const acceptedFiles = files.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
        if (acceptedFiles.length !== files.length) toast.error("Only JPG, PNG, and WEBP images are supported.");
        if (!acceptedFiles.length) return;
        const remaining = Math.max(0, 10 - images.length);
        const batch = acceptedFiles.slice(0, remaining);
        if (batch.length < acceptedFiles.length) toast.error("A product can have up to 10 gallery images.");
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
                        if (event.total) setUploadProgress(Math.round(((completed + event.loaded / event.total * chunk.length) / batch.length) * 100));
                    },
                });
                const uploaded = response.data?.images || [];
                if (!uploaded.length) throw new Error("The upload completed without returning image URLs.");
                setImages((previous) => [...previous, ...uploaded]);
                setImageRoles((previous) => [...previous, ...uploaded.map(() => "Product view")]);
                completed += chunk.length;
                setUploadProgress(Math.round((completed / batch.length) * 100));
            }
            toast.success(`${batch.length} image${batch.length === 1 ? "" : "s"} uploaded.`);
        } catch (error) {
            console.error("Product image upload failed:", error);
            toast.error(error.response?.data?.message || error.message || "Image upload failed.");
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const removeImage = (index) => {
        setImages((previous) => previous.filter((_, i) => i !== index));
        setImageRoles((previous) => previous.filter((_, i) => i !== index));
        setMainImageIndex((previous) => previous === index ? 0 : previous > index ? previous - 1 : previous);
    };

    const moveImage = (index, direction) => {
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= images.length) return;
        const nextImages = [...images];
        const nextRoles = [...imageRoles];
        [nextImages[index], nextImages[nextIndex]] = [nextImages[nextIndex], nextImages[index]];
        [nextRoles[index], nextRoles[nextIndex]] = [nextRoles[nextIndex], nextRoles[index]];
        setImages(nextImages);
        setImageRoles(nextRoles);
        if (mainImageIndex === index) setMainImageIndex(nextIndex);
        else if (mainImageIndex === nextIndex) setMainImageIndex(index);
    };

    const saveProduct = async (event, asDraft = false) => {
        event?.preventDefault();
        if (!form.name.trim() || !form.category || !form.mrp || Number(form.mrp) <= 0) {
            toast.error("Add a product name, category, and valid MRP to continue.");
            return;
        }
        if (Number(form.offer) < 0 || (form.offer_type === "Percentage" && Number(form.offer) > 100)) {
            toast.error("Enter a valid offer value.");
            return;
        }
        if (Number(form.rating) < 1 || Number(form.rating) > 5) {
            toast.error("Product rating must be between 1 and 5.");
            return;
        }
        if (!(await validateSku())) return;

        setLoading(true);
        const productData = {
            ...form,
            status: asDraft ? "Draft" : form.status,
            mrp: String(form.mrp),
            offer: String(form.offer || "0"),
            offer_price: calculatedOfferPrice.toFixed(2),
            selling_price: calculatedOfferPrice.toFixed(2),
            selling_price_mode: "auto",
            product_code: form.product_code.trim(),
            total_stock: String(form.total_stock || "0"),
            rating: Number(form.rating).toFixed(1),
            material: form.material_type,
            variants,
            images,
            image_roles: imageRoles,
            main_image_index: mainImageIndex,
            specifications: {
                materialType: form.material_type, woodType: form.wood_type, colour: form.colour,
                finishType: form.finish_type, height: form.height, width: form.width, depth: form.depth,
                weight: form.weight, seatingCapacity: form.seating_capacity, doors: form.doors,
                drawers: form.drawers, mattressSize: form.mattress_size,
                warrantyPeriod: form.warranty_period, countryOfOrigin: form.country_of_origin,
            },
            shipping: {
                packageLength: form.package_length, packageWidth: form.package_width,
                packageHeight: form.package_height, deliveryAvailable: form.delivery_available,
                deliveryCharges: form.delivery_charges, freeDelivery: form.free_delivery,
                estimatedDeliveryDays: form.estimated_delivery_days, assemblyRequired: form.assembly_required,
                installationAvailable: form.installation_available, returnPolicy: form.return_policy,
            },
            customizations,
        };
        try {
            if (isEdit) {
                await api.put(`/products/${id}`, productData);
                toast.success(asDraft ? "Product saved as draft." : "Product updated successfully.");
            } else {
                await api.post("/products", productData);
                toast.success(asDraft ? "Product saved as draft." : "Product created successfully.");
            }
            setTimeout(() => navigate("/admin/products/all"), 900);
        } catch (error) {
            console.error("Product save failed:", error);
            const message = error.response?.data?.message || "Could not save product. Please try again.";
            toast.error(message);
            if (/sku|product code|duplicate/i.test(message)) setSkuError("This SKU is already in use.");
            setLoading(false);
        }
    };

    const resetForm = () => {
        if (!window.confirm("Reset all product details? This cannot be undone.")) return;
        setForm({ ...initialForm, category: categories[0]?.name || "" });
        setVariants([]);
        setImages([]);
        setImageRoles([]);
        setMainImageIndex(0);
        setCustomizations([]);
        setSkuError("");
    };

    const updateCustomization = (index, key, value) => setCustomizations((previous) => previous.map((item, i) => i === index ? { ...item, [key]: value } : item));

    if (fetching) {
        return <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm font-medium text-slate-500"><LoaderCircle size={20} className="animate-spin text-orange-500" /> Loading product details…</div>;
    }

    return (
        <div className="mx-auto max-w-[1440px] space-y-6 pb-24">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <Link to="/admin/products/all" className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-orange-700"><ArrowLeft size={15} /> Back to products</Link>
                    <div className="flex items-center gap-3">
                        <span className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 sm:flex"><PackageCheck size={23} /></span>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{isEdit ? "Edit product" : "Add new product"}</h1>
                            <p className="mt-1 text-sm text-slate-500">Build a complete product listing for your furniture collection.</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm sm:self-auto">
                    <span className={`h-2 w-2 rounded-full ${form.status === "Active" ? "bg-emerald-500" : form.status === "Draft" ? "bg-amber-400" : "bg-slate-400"}`} />
                    {form.status}
                </div>
            </div>

            <nav aria-label="Product form sections" className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                {[
                    ["#basic", "Basics"], ["#pricing", "Pricing"], ["#specifications", "Specifications"],
                    ["#variants", "Variants"], ["#gallery", "Gallery"], ["#shipping", "Delivery"],
                    ["#customization", "Customization"],
                ].map(([href, label]) => <a key={href} href={href} className="whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-orange-50 hover:text-orange-700">{label}</a>)}
            </nav>

            <form onSubmit={saveProduct} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="space-y-5">
                    <SectionCard id="basic" title="Basic information" description="Give your product a clear identity." icon={Layers3}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Product name" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Aria solid wood king bed" required />
                            <div>
                                <span className={labelClass}>Product SKU / code</span>
                                <div className="flex gap-2">
                                    <input className={`${inputClass} ${skuError ? "border-rose-400 focus:border-rose-400 focus:ring-rose-100" : ""}`} name="product_code" value={form.product_code} onChange={handleChange} onBlur={validateSku} placeholder="QF-2026-0001" />
                                    <button type="button" onClick={generateSku} className="shrink-0 rounded-xl border border-orange-200 bg-orange-50 px-3 text-xs font-semibold text-orange-700 transition hover:bg-orange-100">Auto-generate</button>
                                </div>
                                {skuError && <p className="mt-1 text-xs text-rose-600">{skuError}</p>}
                            </div>
                            <SelectField label="Category" name="category" value={form.category} onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value, subcategory: "" }))} options={[{ value: "", label: "Select a category" }, ...categories.map((category) => category.name)]} required />
                            <SelectField label="Subcategory" name="subcategory" value={form.subcategory} onChange={handleChange} options={[{ value: "", label: "Select a subcategory" }, ...subcategories]} disabled={!subcategories.length} />
                            <Field label="Brand name" name="brand" value={form.brand} onChange={handleChange} placeholder="Brand or collection" />
                            <Field label="Model number" name="model_number" value={form.model_number} onChange={handleChange} placeholder="Optional model reference" />
                            <SelectField label="Product type" name="product_type" value={form.product_type} onChange={handleChange} options={["Standard", "Variable Product"]} />
                            <SelectField label="Product status" name="status" value={form.status} onChange={handleChange} options={["Active", "Inactive", "Draft"]} />
                            <Field label="Product rating (1–5)" name="rating" value={form.rating} onChange={handleChange} type="number" min="1" max="5" step="0.1" required />
                            <Field label="Product tags" name="tags" value={form.tags} onChange={handleChange} placeholder="solid wood, modern, living room — separate with commas" />
                        </div>
                        <label className="block">
                            <span className={labelClass}>Full product escription</span>
                            <textarea className={`${inputClass} min-h-28 resize-y`} name="description" value={form.description} onChange={handleChange} placeholder="Describe the materials, craftsmanship, comfort, and care details…" rows={4} />
                        </label>
                        <div className="grid gap-3 md:grid-cols-3">
                            <Toggle label="Featured product" description="Highlight in featured collections." checked={form.featured} onChange={(checked) => setForm((previous) => ({ ...previous, featured: checked }))} />
                            <Toggle label="Trending product" description="Highlight in trending products." checked={form.trending_product} onChange={(checked) => setForm((previous) => ({ ...previous, trending_product: checked }))} />
                            <Toggle label="Offer product" description="Mark as a promotional offer." checked={form.offer_product} onChange={(checked) => setForm((previous) => ({ ...previous, offer_product: checked }))} />
                        </div>
                    </SectionCard>

                    <SectionCard id="pricing" title="Pricing" description="Set your list price and offer details." icon={CircleDollarSign}>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Field label="MRP" name="mrp" value={form.mrp} onChange={handleChange} type="number" min="0" step="0.01" placeholder="20000" prefix="₹" required />
                            <SelectField label="Offer type" name="offer_type" value={form.offer_type} onChange={handleChange} options={["Percentage", "Fixed Amount"]} />
                            <Field label={form.offer_type === "Percentage" ? "Offer (%)" : "Offer amount (₹)"} name="offer" value={form.offer} onChange={handleChange} type="number" min="0" max={form.offer_type === "Percentage" ? "100" : undefined} step="0.01" placeholder="10" prefix={form.offer_type === "Fixed Amount" ? "₹" : undefined} suffix={form.offer_type === "Percentage" ? "%" : undefined} />
                            <Field label="Offer price" name="offer_price" value={calculatedOfferPrice.toFixed(2)} readOnly type="number" prefix="₹" />
                        </div>
                    </SectionCard>

                    <SectionCard id="specifications" title="Furniture specifications" description="Add dimensions, material, and construction details." icon={ClipboardList}>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <SelectField label="Material type" name="material_type" value={form.material_type} onChange={handleChange} options={[{ value: "", label: "Select material" }, "Solid Wood", "Engineered Wood", "Plywood", "Metal", "Plastic", "Glass", "Upholstered"]} />
                            <SelectField label="Wood type" name="wood_type" value={form.wood_type} onChange={handleChange} options={[{ value: "", label: "Select wood" }, "Teak", "Sheesham", "Mango", "Oak", "Acacia", "Pine", "Other"]} />
                            <Field label="Furniture colour" name="colour" value={form.colour} onChange={handleChange} placeholder="e.g. Natural teak" />
                            <SelectField label="Finish type" name="finish_type" value={form.finish_type} onChange={handleChange} options={[{ value: "", label: "Select finish" }, "Matte", "Glossy", "Natural Polish", "Laminate"]} />
                            <Field label="Height" name="height" value={form.height} onChange={handleChange} type="number" min="0" step="0.1" suffix="cm" />
                            <Field label="Width" name="width" value={form.width} onChange={handleChange} type="number" min="0" step="0.1" suffix="cm" />
                            <Field label="Depth" name="depth" value={form.depth} onChange={handleChange} type="number" min="0" step="0.1" suffix="cm" />
                            <Field label="Product weight" name="weight" value={form.weight} onChange={handleChange} type="number" min="0" step="0.1" suffix="kg" />
                            <Field label="Seating capacity" name="seating_capacity" value={form.seating_capacity} onChange={handleChange} type="number" min="0" />
                            <Field label="Number of doors" name="doors" value={form.doors} onChange={handleChange} type="number" min="0" />
                            <Field label="Number of drawers" name="drawers" value={form.drawers} onChange={handleChange} type="number" min="0" />
                            <Field label="Mattress size" name="mattress_size" value={form.mattress_size} onChange={handleChange} placeholder="King / Queen / Single" />
                            <Field label="Warranty period" name="warranty_period" value={form.warranty_period} onChange={handleChange} placeholder="e.g. 3 years" />
                            <Field label="Country of origin" name="country_of_origin" value={form.country_of_origin} onChange={handleChange} />
                        </div>
                    </SectionCard>

                    <SectionCard id="variants" title="Product variants" description="Offer different colours, sizes, and materials." icon={Box} action={<button type="button" onClick={addVariant} className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-700"><Plus size={14} /> Add variant</button>}>
                        {!variants.length && <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center"><p className="text-sm font-semibold text-slate-700">No variants added</p><p className="mt-1 text-xs text-slate-500">Create colour or size options customers can choose.</p></div>}
                        <div className="space-y-4">
                            {variants.map((variant, index) => (
                                <div key={index} className="rounded-xl border border-slate-200 p-4">
                                    <div className="mb-4 flex items-center justify-between">
                                        <p className="text-sm font-bold text-slate-800">Variant {index + 1}</p>
                                        <button type="button" aria-label={`Remove variant ${index + 1}`} onClick={() => removeVariant(index)} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700"><Trash2 size={14} /> Remove</button>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                        <Field label="Colour" value={variant.color} onChange={(event) => updateVariant(index, "color", event.target.value)} placeholder="Walnut brown" />
                                        <Field label="Size" value={variant.size} onChange={(event) => updateVariant(index, "size", event.target.value)} placeholder="King / 3-seater" />
                                        <Field label="Material" value={variant.material} onChange={(event) => updateVariant(index, "material", event.target.value)} placeholder="Teak wood" />
                                        <Field label="Variant SKU" value={variant.sku} onChange={(event) => updateVariant(index, "sku", event.target.value)} placeholder="QF-ARIA-WAL-K" />
                                        <Field label="MRP" value={variant.mrp} onChange={(event) => updateVariant(index, "mrp", event.target.value)} type="number" min="0" step="0.01" />
                                        <SelectField label="Offer type" value={variant.offer_type} onChange={(event) => updateVariant(index, "offer_type", event.target.value)} options={["Percentage", "Fixed Amount"]} />
                                        <Field label="Offer" value={variant.offer} onChange={(event) => updateVariant(index, "offer", event.target.value)} type="number" min="0" />
                                        <Field label="Selling price" value={variant.selling_price} onChange={(event) => updateVariant(index, "selling_price", event.target.value)} type="number" min="0" step="0.01" />
                                        <Field label="Stock quantity" value={variant.stock} onChange={(event) => updateVariant(index, "stock", event.target.value)} type="number" min="0" />
                                        <Field label="Variant image URL" value={variant.image} onChange={(event) => updateVariant(index, "image", event.target.value)} placeholder="Optional uploaded image URL" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SectionCard>

                    <SectionCard id="inventory" title="Inventory management" description="Track stock and warehouse availability." icon={PackageCheck}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Available stock quantity" name="total_stock" value={form.total_stock} onChange={handleChange} type="number" min="0" />
                            <Field label="Warehouse / store location" name="warehouse" value={form.warehouse} onChange={handleChange} placeholder="e.g. Chennai central warehouse" />
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <span className="text-sm font-medium text-slate-600">Current inventory status</span>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${stockState === "In stock" ? "bg-emerald-100 text-emerald-700" : stockState === "Low stock" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>{stockState}</span>
                        </div>
                    </SectionCard>

                    <SectionCard id="gallery" title="Product images & gallery" description="Upload up to 10 JPG, PNG, or WEBP images." icon={ImagePlus}>
                        <input ref={fileInputRef} className="hidden" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple onChange={(event) => addFiles(event.target.files)} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }} disabled={uploading} className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/40 px-4 py-8 text-center transition hover:border-orange-400 hover:bg-orange-50 disabled:opacity-60">
                            {uploading ? <LoaderCircle size={24} className="animate-spin text-orange-600" /> : <UploadCloud size={25} className="text-orange-600" />}
                            <span className="mt-2 text-sm font-semibold text-slate-800">{uploading ? `Uploading images… ${uploadProgress}%` : "Drop images here or browse files"}</span>
                            <span className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP · up to 10 images</span>
                            {uploading && <span className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-orange-100"><span className="block h-full rounded-full bg-orange-500 transition-all" style={{ width: `${uploadProgress}%` }} /></span>}
                        </button>
                        {images.length > 0 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {images.map((image, index) => (
                                <div key={`${image}-${index}`} className={`overflow-hidden rounded-xl border ${mainImageIndex === index ? "border-orange-400 ring-2 ring-orange-100" : "border-slate-200"}`}>
                                    <div className="group relative aspect-[4/3] bg-slate-100">
                                        <img src={resolveMediaUrl(image)} alt={`Furniture product view ${index + 1}`} className="h-full w-full object-cover" />
                                        <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow">{mainImageIndex === index ? "Main image" : `Image ${index + 1}`}</span>
                                        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                                            <button type="button" aria-label="Move image up" onClick={() => moveImage(index, -1)} className={iconButtonClass} disabled={index === 0}><ArrowUp size={14} /></button>
                                            <button type="button" aria-label="Move image down" onClick={() => moveImage(index, 1)} className={iconButtonClass} disabled={index === images.length - 1}><ArrowDown size={14} /></button>
                                            <button type="button" aria-label="Remove image" onClick={() => removeImage(index)} className={`${iconButtonClass} hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600`}><X size={14} /></button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-2.5">
                                        <select aria-label={`Image ${index + 1} view`} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700" value={imageRoles[index] || "Product view"} onChange={(event) => setImageRoles((previous) => previous.map((role, i) => i === index ? event.target.value : role))}>
                                            {["Product view", "Front view", "Side view", "Back view", "Lifestyle image"].map((role) => <option key={role}>{role}</option>)}
                                        </select>
                                        <button type="button" onClick={() => setMainImageIndex(index)} className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${mainImageIndex === index ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{mainImageIndex === index ? <span className="inline-flex items-center gap-1"><Check size={12} /> Main</span> : "Set main"}</button>
                                    </div>
                                </div>
                            ))}
                        </div>}
                        <Field label="Product video URL (optional)" name="video_url" value={form.video_url} onChange={handleChange} placeholder="https://…" />
                    </SectionCard>

                    <SectionCard id="shipping" title="Delivery & shipping" description="Set delivery preferences and package details." icon={Truck}>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Field label="Package length" name="package_length" value={form.package_length} onChange={handleChange} type="number" min="0" suffix="cm" />
                            <Field label="Package width" name="package_width" value={form.package_width} onChange={handleChange} type="number" min="0" suffix="cm" />
                            <Field label="Package height" name="package_height" value={form.package_height} onChange={handleChange} type="number" min="0" suffix="cm" />
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <Toggle label="Delivery available" checked={form.delivery_available} onChange={(checked) => setForm((previous) => ({ ...previous, delivery_available: checked }))} />
                            <Toggle label="Free delivery" checked={form.free_delivery} onChange={(checked) => setForm((previous) => ({ ...previous, free_delivery: checked }))} />
                            <Toggle label="Assembly required" checked={form.assembly_required} onChange={(checked) => setForm((previous) => ({ ...previous, assembly_required: checked }))} />
                            <Toggle label="Installation available" checked={form.installation_available} onChange={(checked) => setForm((previous) => ({ ...previous, installation_available: checked }))} />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Delivery charges" name="delivery_charges" value={form.delivery_charges} onChange={handleChange} type="number" min="0" suffix="₹" disabled={form.free_delivery} />
                            <Field label="Estimated delivery days" name="estimated_delivery_days" value={form.estimated_delivery_days} onChange={handleChange} type="number" min="0" suffix="days" />
                        </div>
                        <label className="block">
                            <span className={labelClass}>Return policy</span>
                            <textarea className={`${inputClass} min-h-20 resize-y`} name="return_policy" value={form.return_policy} onChange={handleChange} placeholder="Add the return window and product condition requirements…" rows={3} />
                        </label>
                    </SectionCard>

                    <SectionCard id="customization" title="Customization options" description="Let customers configure this product before adding it to cart." icon={Sparkles}>
                        <Toggle label="Enable product customization" description="Customization is available on the product details page when enabled." checked={form.customization_enabled} onChange={(checked) => setForm((previous) => ({ ...previous, customization_enabled: checked }))} />
                        {form.customization_enabled && <>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Customization title" name="customization_title" value={form.customization_title} onChange={handleChange} placeholder="Make it yours" />
                                <Field label="Customization description" name="customization_description" value={form.customization_description} onChange={handleChange} placeholder="Choose your preferred finish and size" />
                            </div>
                            <div className="flex justify-end"><button type="button" onClick={() => setCustomizations((previous) => [...previous, initialCustomization()])} className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100"><Plus size={14} /> Add customization option</button></div>
                            {!customizations.length && <p className="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">Add an option such as fabric, wood type, colour, size, or engraving.</p>}
                            {customizations.map((option, index) => <div key={index} className="space-y-3 rounded-xl border border-slate-200 p-4">
                                <div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-800">Option {index + 1}</p><button type="button" onClick={() => setCustomizations((previous) => previous.filter((_, i) => i !== index))} className="text-xs font-semibold text-rose-600 hover:text-rose-700"><Trash2 size={14} className="inline" /> Remove</button></div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <Field label="Customization option name" value={option.name} onChange={(event) => updateCustomization(index, "name", event.target.value)} placeholder="Select sofa fabric" />
                                    <SelectField label="Customization type" value={option.type} onChange={(event) => updateCustomization(index, "type", event.target.value)} options={["Text Input", "Dropdown Selection", "Radio Button", "Checkbox", "Colour Selection", "Size Selection", "Image Selection"]} />
                                    <Field label="Available options (comma-separated)" value={option.options} onChange={(event) => updateCustomization(index, "options", event.target.value)} placeholder="Natural oak, Walnut, White" />
                                    <Field label="Additional customization price" value={option.additionalPrice} onChange={(event) => updateCustomization(index, "additionalPrice", event.target.value)} type="number" min="0" step="0.01" suffix="₹" />
                                </div>
                                <Toggle label="Required selection" description="Customers must select this option before adding to cart." checked={Boolean(option.required)} onChange={(checked) => updateCustomization(index, "required", checked)} />
                            </div>)}
                            <div className="rounded-xl bg-orange-50 px-4 py-3 text-xs leading-5 text-orange-800">Paid option prices are stored with the product configuration for the storefront/cart to apply to the selected choices.</div>
                        </>}
                    </SectionCard>

                </div>

                <aside className="space-y-4 xl:sticky xl:top-5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(27,39,51,0.04)]">
                        <h2 className="text-sm font-bold text-slate-900">Listing overview</h2>
                        <p className="mt-1 truncate text-sm text-slate-500">{form.name || "New furniture product"}</p>
                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between gap-3"><span className="text-slate-500">SKU</span><span className="truncate font-semibold text-slate-700">{form.product_code || "Not set"}</span></div>
                            <div className="flex justify-between gap-3"><span className="text-slate-500">Category</span><span className="truncate font-semibold text-slate-700">{form.category || "Not selected"}</span></div>
                            <div className="flex justify-between gap-3"><span className="text-slate-500">Inventory</span><span className="font-semibold text-slate-700">{form.total_stock || "0"} · {stockState}</span></div>
                            <div className="flex justify-between gap-3"><span className="text-slate-500">Images</span><span className="font-semibold text-slate-700">{images.length} uploaded</span></div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(27,39,51,0.04)]">
                        <div className="mb-4 flex items-center gap-2"><ShieldCheck size={17} className="text-emerald-600" /><h2 className="text-sm font-bold text-slate-900">Ready to publish?</h2></div>
                        <p className="text-xs leading-5 text-slate-500">Complete the required fields, check pricing, then save this listing. You can update it at any time.</p>
                        <div className="mt-5 grid gap-2">
                            <button type="submit" disabled={loading || uploading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60">
                                {loading ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}{loading ? "Saving…" : isEdit ? "Update product" : "Save product"}
                            </button>
                            <button type="button" disabled={loading || uploading} onClick={(event) => saveProduct(event, true)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">Save as draft</button>
                            <button type="button" disabled={loading || uploading} onClick={resetForm} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-60"><RotateCcw size={14} /> Reset form</button>
                            <button type="button" disabled={loading || uploading} onClick={() => navigate(-1)} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"><X size={14} /> Cancel</button>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"><Check size={15} className="mt-0.5 shrink-0" /> Variant and customization settings are saved with the product.</div>
                </aside>
            </form>
        </div>
    );
};

export default AddProducts;
