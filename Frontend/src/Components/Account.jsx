import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  CheckCircle2,
  ArrowRight,
  CalendarDays,
  LayoutGrid,
  Building2,
  Eye,
  EyeOff,
  Home,
  KeyRound,
  Layers,
  LoaderCircle,
  LogOut,
  MapPin,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  ShoppingBag,
  Truck,
  Trash2,
  UserRound,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api";
import { AuthContext } from "../PrivateRouter/AuthContext";
import { resolveMediaUrl } from "../utils/media";
import { INDIAN_STATES, INDIAN_UNION_TERRITORIES } from "../utils/indianStates";
import PageContainer from "./CommenComponents/PageContainer";
import PageHeader from "./CommenComponents/PageHeader";
import OrderDetailsModal from "./OrderDetailsModal";

const inputClass =
  "mt-1 w-full rounded-lg border border-[#ddd5cd] bg-white px-4 py-2.5 text-sm text-[#351d0e] outline-none transition placeholder:text-[#a99a8a] focus:border-primary focus:ring-4 focus:ring-orange-100";

const tabs = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "orders", label: "Orders", icon: PackageCheck },
  { id: "password", label: "Set Password", icon: KeyRound },
  { id: "logout", label: "Logout", icon: LogOut },
];

const accountHeroImage = resolveMediaUrl("/uploads/banners/1a4fd15f-b369-42f2-9d40-47fcb5d305a2.png");
const MAX_BIRTH_DATE = new Date().toISOString().slice(0, 10);
const ORDER_FILTERS = [
  { label: "All Orders", icon: LayoutGrid },
  { label: "Processing", icon: RefreshCw },
  { label: "Shipped", icon: Truck },
  { label: "Delivered", icon: CheckCircle2 },
  { label: "Cancelled", icon: XCircle },
];
const PASSWORD_REQUIREMENTS = [
  { label: "At least 8 characters", test: (value) => value.length >= 8 },
  { label: "One uppercase letter", test: (value) => /[A-Z]/.test(value) },
  { label: "One number", test: (value) => /\d/.test(value) },
  { label: "One special character", test: (value) => /[^A-Za-z0-9]/.test(value) },
  { label: "No more than 72 characters", test: (value) => value.length > 0 && value.length <= 72 },
];

function dateInputValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function formatAmount(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function statusClass(status) {
  if (status === "Delivered") return "bg-emerald-50 text-emerald-700";
  if (status === "Cancelled") return "bg-red-50 text-red-700";
  if (status === "Out for Delivery") return "bg-cyan-50 text-cyan-700";
  if (status === "Shipping" || status === "Shipped") return "bg-amber-50 text-amber-700";
  if (status === "Packing") return "bg-indigo-50 text-indigo-700";
  if (status === "Order Placed") return "bg-blue-50 text-blue-700";
  return "bg-gray-50 text-gray-700";
}

function orderFilterGroup(status) {
  if (status === "Delivered" || status === "Cancelled") return status;
  if (status === "Shipping" || status === "Shipped" || status === "Out for Delivery") return "Shipped";
  return "Processing";
}

function Account() {
  const { user, updateUser, logout } = useContext(AuthContext);
  const photoInputRef = useRef(null);
  const addressModalRef = useRef(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState({
    name: user?.name || user?.username || "",
    email: user?.email || "",
    phone: user?.phone || "",
    date_of_birth: dateInputValue(user?.date_of_birth),
    profile_image: user?.profile_image || "",
  });
  const [savedProfile, setSavedProfile] = useState({
    name: user?.name || user?.username || "",
    email: user?.email || "",
    phone: user?.phone || "",
    date_of_birth: dateInputValue(user?.date_of_birth),
    profile_image: user?.profile_image || "",
  });
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedOrderFilter, setSelectedOrderFilter] = useState("All Orders");
  const [profileLoading, setProfileLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [ordersError, setOrdersError] = useState("");
  const [addressesError, setAddressesError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressActionId, setAddressActionId] = useState(null);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [addressFormError, setAddressFormError] = useState("");
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressDraft, setAddressDraft] = useState({
    label: "Home",
    customer_name: user?.name || user?.username || "",
    customer_phone: user?.phone || "",
    street_address: "",
    city: "",
    district: "",
    state: "",
    country: "India",
    zip_code: "",
    is_default: false,
  });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [profileFormError, setProfileFormError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [reloadProfile, setReloadProfile] = useState(0);
  const [reloadOrders, setReloadOrders] = useState(0);
  const [reloadAddresses, setReloadAddresses] = useState(0);
  const userId = user?.id;
  const userProfileImage = user?.profile_image;
  const closeOrderDetails = useCallback(() => setSelectedOrder(null), []);

  useEffect(() => {
    if (!addressFormOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    addressModalRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [addressFormOpen]);

  useEffect(() => {
    if (!addressFormOpen || addressSaving) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setAddressFormOpen(false);
        setAddressFormError("");
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [addressFormOpen, addressSaving]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setProfileLoading(true);
      setProfileError("");
      try {
        const { data } = await api.get("/users/me");
        if (active) {
          const nextProfile = {
            name: data.name || data.username || "",
            email: data.email || "",
            phone: data.phone || "",
            date_of_birth: dateInputValue(data.date_of_birth),
            profile_image: data.profile_image || userProfileImage || "",
          };
          setProfile(nextProfile);
          setSavedProfile(nextProfile);
        }
      } catch (error) {
        console.error("Could not load account profile:", error);
        if (active) {
          setProfileError(error.response?.data?.message || "Could not load your profile. Please try again.");
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [userId, userProfileImage, reloadProfile]);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setOrdersLoading(true);
      setOrdersError("");
      try {
        const { data } = await api.get("/orders/mine");
        if (!Array.isArray(data)) throw new Error("The server returned an invalid order list.");
        if (active) setOrders(data);
      } catch (error) {
        console.error("Could not load account orders:", error);
        if (active) {
          setOrdersError(error.response?.data?.message || "Could not load your orders. Please try again.");
        }
      } finally {
        if (active) setOrdersLoading(false);
      }
    }

    loadOrders();
    return () => {
      active = false;
    };
  }, [user?.id, reloadOrders]);

  useEffect(() => {
    let active = true;

    async function loadAddresses() {
      setAddressesLoading(true);
      setAddressesError("");
      try {
        const { data } = await api.get("/users/me/addresses");
        if (!Array.isArray(data)) throw new Error("The server returned an invalid address list.");
        if (active) setAddresses(data);
      } catch (error) {
        console.error("Could not load account addresses:", error);
        if (active) {
          setAddressesError(error.response?.data?.message || "Could not load your saved addresses. Please try again.");
        }
      } finally {
        if (active) setAddressesLoading(false);
      }
    }

    loadAddresses();
    return () => {
      active = false;
    };
  }, [user?.id, reloadAddresses]);

  const visibleOrders = useMemo(() => orders.filter(
    (order) => selectedOrderFilter === "All Orders" || orderFilterGroup(order.status) === selectedOrderFilter,
  ), [orders, selectedOrderFilter]);
  const orderCounts = useMemo(() => {
    const counts = {
      "All Orders": orders.length,
      Processing: 0,
      Shipped: 0,
      Delivered: 0,
      Cancelled: 0,
    };
    orders.forEach((order) => {
      counts[orderFilterGroup(order.status)] += 1;
    });
    return counts;
  }, [orders]);

  async function saveProfile(event) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileFormError("");
    try {
      const { data } = await api.put("/users/me", profile);
      const nextProfile = {
        name: data.user.name || data.user.username || "",
        email: data.user.email || "",
        phone: data.user.phone || "",
        date_of_birth: dateInputValue(data.user.date_of_birth),
        profile_image: data.user.profile_image || profile.profile_image || "",
      };
      setProfile(nextProfile);
      setSavedProfile(nextProfile);
      updateUser(data.user);
      toast.success("Profile updated.");
    } catch (error) {
      const message = error.response?.data?.message || "Could not update your profile.";
      setProfileFormError(message);
      toast.error(message);
    } finally {
      setProfileSaving(false);
    }
  }

  function cancelProfileChanges() {
    setProfile(savedProfile);
    setProfileFormError("");
  }

  function startNewAddress() {
    setEditingAddressId(null);
    setAddressFormError("");
    setAddressDraft({
      label: "Home",
      customer_name: profile.name || user?.name || user?.username || "",
      customer_phone: profile.phone || user?.phone || "",
      street_address: "",
      city: "",
      district: "",
      state: "",
      country: "India",
      zip_code: "",
      is_default: addresses.length === 0,
    });
    setAddressFormOpen(true);
  }

  function startEditAddress(address) {
    setEditingAddressId(address.id);
    setAddressFormError("");
    setAddressDraft({
      label: address.label || "Home",
      customer_name: address.customer_name || "",
      customer_phone: address.customer_phone || "",
      street_address: address.street_address || "",
      city: address.city || "",
      district: address.district || "",
      state: address.state || "",
      country: address.country || "India",
      zip_code: address.zip_code || "",
      is_default: Boolean(Number(address.is_default)),
    });
    setAddressFormOpen(true);
  }

  async function saveAddress(event) {
    event.preventDefault();
    setAddressSaving(true);
    setAddressFormError("");
    try {
      const request = editingAddressId
        ? api.put(`/users/me/addresses/${editingAddressId}`, addressDraft)
        : api.post("/users/me/addresses", addressDraft);
      await request;
      setAddressFormOpen(false);
      setEditingAddressId(null);
      setReloadAddresses((count) => count + 1);
      toast.success(editingAddressId ? "Address updated." : "Address saved.");
    } catch (error) {
      const message = error.response?.data?.message || "Could not save your address.";
      setAddressFormError(message);
      toast.error(message);
    } finally {
      setAddressSaving(false);
    }
  }

  async function makeDefaultAddress(id) {
    setAddressActionId(id);
    try {
      await api.put(`/users/me/addresses/${id}/default`);
      setReloadAddresses((count) => count + 1);
      toast.success("Default address updated.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update the default address.");
    } finally {
      setAddressActionId(null);
    }
  }

  async function deleteAddress(address) {
    if (!window.confirm(`Delete the ${address.label || "saved"} address?`)) return;
    setAddressActionId(address.id);
    try {
      await api.delete(`/users/me/addresses/${address.id}`);
      setReloadAddresses((count) => count + 1);
      toast.success("Address deleted.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete the address.");
    } finally {
      setAddressActionId(null);
    }
  }

  async function uploadProfilePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile photo must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    setPhotoUploading(true);
    try {
      const { data } = await api.post("/uploads/profile-image", formData);
      updateUser(data.user);
      const nextProfile = {
        ...savedProfile,
        profile_image: data.user.profile_image || data.url || "",
      };
      setProfile((current) => ({
        ...current,
        profile_image: nextProfile.profile_image,
      }));
      setSavedProfile((current) => ({ ...current, profile_image: nextProfile.profile_image }));
      toast.success("Profile photo updated.");
    } catch (error) {
      console.error("Could not update account photo:", error);
      toast.error(error.response?.data?.message || "Could not update your profile photo.");
    } finally {
      setPhotoUploading(false);
      event.target.value = "";
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setPasswordError("");
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }
    if (
      passwords.newPassword.length > 72
      || PASSWORD_REQUIREMENTS.some((requirement) => !requirement.test(passwords.newPassword))
    ) {
      setPasswordError("Meet all password requirements before continuing.");
      return;
    }

    setPasswordSaving(true);
    try {
      await api.put("/users/me/password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password updated.");
    } catch (error) {
      const message = error.response?.data?.message || "Could not update your password.";
      setPasswordError(message);
      toast.error(message);
    } finally {
      setPasswordSaving(false);
    }
  }

  const displayName = profile.name || user?.name || user?.username || "there";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <>
      <PageHeader title="My Account" />
      <main className="min-h-[65vh] bg-[linear-gradient(180deg,#fffaf5_0%,#fff7ef_100%)] text-[#351d0e]">
        <PageContainer>
        <div className="grid gap-5 py-7 sm:py-9 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6 lg:py-12">
          <aside className="h-fit overflow-hidden rounded-2xl border border-[#f1e7dd] bg-white p-3 shadow-[0_10px_30px_rgba(53,29,14,0.07)] sm:p-4 lg:sticky lg:top-28 lg:self-start">
            <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-[#fff1e2] to-[#fffaf5] px-3 py-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f5dfc8] text-lg font-bold text-[#a34720] ring-2 ring-white shadow-sm">
                {profile.profile_image ? (
                  <img src={resolveMediaUrl(profile.profile_image)} alt="" className="h-full w-full object-cover" />
                ) : initials || <UserRound size={25} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold">{displayName}</span>
                <span className="mt-0.5 block truncate text-xs text-[#725d4b]">{profile.email || user?.email}</span>
              </span>
            </div>
            <nav aria-label="Account sections" role="tablist" className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  id={`account-tab-${id}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  aria-controls={`account-panel-${id}`}
                  onClick={() => setActiveTab(id)}
                  className={`inline-flex min-h-11 w-full min-w-0 items-center gap-2 rounded-xl px-2.5 py-2.5 text-left text-[11px] font-bold transition sm:gap-3 sm:px-3 sm:text-sm ${
                    activeTab === id
                      ? "bg-[#fff0df] text-[#351d0e] shadow-sm ring-1 ring-inset ring-[#f6d2b2]"
                      : "text-[#5b4839] hover:bg-[#fffaf5]"
                  }`}
                >
                  <Icon size={18} className="shrink-0 text-[#a34720]" />
                  <span className="min-w-0 break-words">{label}</span>
                  {id === "orders" && !ordersLoading && !ordersError && (
                    <span className="ml-auto shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] text-[#8b735e]">{orders.length}</span>
                  )}
                </button>
              ))}
            </nav>
          </aside>

          <section
            id={`account-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`account-tab-${activeTab}`}
            className="min-h-[320px] rounded-2xl border border-[#eee4d8] bg-white p-5 shadow-[0_12px_32px_rgba(53,29,14,0.07)] sm:p-7 lg:p-8"
          >
            {activeTab === "profile" && (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-extrabold">Profile</h2>
                  <span className="mt-1 block h-0.5 w-10 rounded-full bg-[#f07816]" />
                  <p className="mt-1 text-sm text-[#806d5d]">Update your personal information and keep your account details up to date.</p>
                </div>
                {profileError && (
                  <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <span>{profileError}</span>
                    <button type="button" onClick={() => setReloadProfile((count) => count + 1)} className="font-bold underline">Try again</button>
                  </div>
                )}
                {profileLoading ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-[#806d5d]">
                    <LoaderCircle size={18} className="animate-spin" /> Loading your profile...
                  </div>
                ) : (
                  <form onSubmit={saveProfile}>
                    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_160px]">
                      <div className="grid content-start gap-x-5 gap-y-4 sm:grid-cols-2">
                        <label className="block text-xs font-bold">
                          Full Name <span className="text-red-600">*</span>
                          <input
                            className={inputClass}
                            type="text"
                            name="name"
                            value={profile.name}
                            onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                            autoComplete="name"
                            minLength={2}
                            maxLength={120}
                            required
                          />
                        </label>
                        <label className="block text-xs font-bold">
                          Email Address <span className="text-red-600">*</span>
                          <input
                            className={inputClass}
                            type="email"
                            name="email"
                            value={profile.email}
                            onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
                            autoComplete="email"
                            maxLength={191}
                            required
                          />
                        </label>
                        <label className="block text-xs font-bold">
                          Phone Number
                          <input
                            className={inputClass}
                            type="tel"
                            name="phone"
                            value={profile.phone}
                            onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
                            autoComplete="tel"
                            maxLength={32}
                          />
                        </label>
                        <label className="block text-xs font-bold">
                          Date of Birth
                          <input
                            className={inputClass}
                            type="date"
                            name="date_of_birth"
                            value={profile.date_of_birth}
                            max={MAX_BIRTH_DATE}
                            onChange={(event) => setProfile((current) => ({ ...current, date_of_birth: event.target.value }))}
                          />
                        </label>
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <div className="relative">
                          <span className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-[#f5dfc8] text-3xl font-bold text-[#a34720]">
                            {profile.profile_image ? (
                              <img src={resolveMediaUrl(profile.profile_image)} alt={`${displayName}'s profile`} className="h-full w-full object-cover" />
                            ) : initials || <UserRound size={38} />}
                          </span>
                          <button
                            type="button"
                            onClick={() => photoInputRef.current?.click()}
                            disabled={photoUploading}
                            aria-label="Change profile photo"
                            className="absolute bottom-1 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-60"
                          >
                            {photoUploading ? <LoaderCircle size={15} className="animate-spin" /> : <Camera size={15} />}
                          </button>
                        </div>
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={uploadProfilePhoto}
                          className="sr-only"
                          aria-label="Upload a profile photo"
                        />
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={photoUploading}
                          className="inline-flex items-center gap-2 rounded-lg border border-[#edc9a9] px-4 py-2 text-xs font-bold text-[#5b3821] transition hover:bg-[#fff5eb] disabled:opacity-60"
                        >
                          <Upload size={14} />
                          {photoUploading ? "Uploading..." : "Change Photo"}
                        </button>
                        <p className="text-[10px] text-[#8b735e]">JPG, PNG or WebP up to 5 MB</p>
                      </div>
                    </div>

                    {profileFormError && <p role="alert" className="mt-4 text-sm text-red-700">{profileFormError}</p>}
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#f07816] to-[#df5d00] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
                      >
                        {profileSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
                        {profileSaving ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelProfileChanges}
                        disabled={profileSaving || photoUploading}
                        className="rounded-lg border border-[#edc9a9] px-5 py-2.5 text-xs font-bold text-[#5b3821] transition hover:bg-[#fff5eb] disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            {activeTab === "password" && (
              <>
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff0df] text-[#e87500]">
                    <KeyRound size={21} />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold">Set Password</h2>
                    <p className="text-sm text-[#806d5d]">Create a strong password to keep your account secure.</p>
                  </div>
                </div>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(230px,0.85fr)]">
                  <form onSubmit={changePassword} className="space-y-4">
                    {[
                      { key: "currentPassword", label: "Current password", autoComplete: "current-password", visibilityKey: "current" },
                      { key: "newPassword", label: "New password", autoComplete: "new-password", visibilityKey: "new" },
                      { key: "confirmPassword", label: "Confirm new password", autoComplete: "new-password", visibilityKey: "confirm" },
                    ].map(({ key, label, autoComplete, visibilityKey }) => (
                      <label key={key} className="block text-sm font-semibold">
                        {label}
                        <span className="relative block">
                          <input
                            className={`${inputClass} pr-12`}
                            type={showPasswords[visibilityKey] ? "text" : "password"}
                            autoComplete={autoComplete}
                            minLength={key === "currentPassword" ? undefined : 8}
                            maxLength={key === "currentPassword" ? undefined : 72}
                            value={passwords[key]}
                            onChange={(event) => setPasswords((current) => ({ ...current, [key]: event.target.value }))}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords((current) => ({
                              ...current,
                              [visibilityKey]: !current[visibilityKey],
                            }))}
                            aria-label={`${showPasswords[visibilityKey] ? "Hide" : "Show"} ${label.toLowerCase()}`}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b735e] hover:text-[#a34720]"
                          >
                            {showPasswords[visibilityKey] ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        </span>
                      </label>
                    ))}
                    {passwordError && <p role="alert" className="text-sm text-red-700">{passwordError}</p>}
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f07816] to-[#df5d00] px-5 py-3 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
                    >
                      {passwordSaving ? <LoaderCircle size={17} className="animate-spin" /> : <KeyRound size={17} />}
                      {passwordSaving ? "Updating..." : "Update password"}
                    </button>
                  </form>

                  <aside className="h-fit rounded-xl border border-[#f1e7dd] bg-[#fffaf5] p-4">
                    <h3 className="font-bold">Password requirements</h3>
                    <p className="mt-1 text-xs text-[#806d5d]">Your password must include:</p>
                    <ul className="mt-4 space-y-3">
                      {PASSWORD_REQUIREMENTS.map(({ label, test }) => {
                        const met = test(passwords.newPassword);
                        return (
                          <li key={label} className={`flex items-center gap-2 text-sm ${met ? "text-emerald-700" : "text-[#806d5d]"}`}>
                            <CheckCircle2 size={17} className={met ? "text-emerald-600" : "text-[#c8b9aa]"} />
                            {label}
                          </li>
                        );
                      })}
                    </ul>
                  </aside>
                </div>
              </>
            )}

            {activeTab === "orders" && (
              <>
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff0df] text-[#e87500]">
                    <PackageCheck size={21} />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold">Your Orders</h2>
                    <p className="text-sm text-[#806d5d]">Check the status and summary of your recent orders.</p>
                    <span aria-hidden="true" className="mt-2 block h-[3px] w-24 rounded-full bg-[#f07816]" />
                  </div>
                </div>
                <div role="tablist" aria-label="Filter orders" className="mb-5 flex flex-wrap items-center gap-2 border-b border-[#eee4d8] pb-2 sm:flex-nowrap sm:overflow-x-auto">
                  {ORDER_FILTERS.map(({ label, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      role="tab"
                      aria-selected={selectedOrderFilter === label}
                      onClick={() => setSelectedOrderFilter(label)}
                      className={`inline-flex shrink-0 items-center gap-1 rounded-xl border px-1.5 py-2 text-[10px] font-bold transition xl:px-2.5 xl:py-2.5 xl:text-xs ${
                        selectedOrderFilter === label
                          ? "border-[#f07816] bg-[#f07816] text-white shadow-sm"
                          : "border-[#f1e7dd] bg-[#fff7ef] text-[#351d0e] shadow-[0_2px_5px_rgba(53,29,14,0.06)] hover:border-[#edc9a9] hover:bg-[#fff0df]"
                      }`}
                    >
                      <Icon size={14} className="shrink-0" />
                      <span>{label} ({orderCounts[label]})</span>
                    </button>
                  ))}
                  <span aria-hidden="true" className="hidden h-px min-w-4 flex-1 bg-[#f07816] sm:block" />
                </div>
                {ordersLoading ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-[#806d5d]">
                    <LoaderCircle size={18} className="animate-spin" /> Loading your orders...
                  </div>
                ) : ordersError ? (
                  <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <span>{ordersError}</span>
                    <button type="button" onClick={() => setReloadOrders((count) => count + 1)} className="font-bold underline">Try again</button>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d9c4aa] px-5 py-12 text-center">
                    <ShoppingBag className="mx-auto text-[#a34720]" size={34} />
                    <h3 className="mt-3 font-bold">No orders yet</h3>
                    <p className="mt-1 text-sm text-[#806d5d]">Your furniture orders will appear here.</p>
                    <Link to="/shop" className="mt-4 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary-dark">
                      Browse furniture
                    </Link>
                  </div>
                ) : visibleOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d9c4aa] px-5 py-10 text-center">
                    <PackageCheck className="mx-auto text-[#a34720]" size={32} />
                    <h3 className="mt-3 font-bold">No {selectedOrderFilter.toLowerCase()} orders</h3>
                    <p className="mt-1 text-sm text-[#806d5d]">Choose another filter to see more of your orders.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {visibleOrders.map((order) => {
                      const firstItem = Array.isArray(order.items) ? order.items[0] : null;
                      const status = order.status || "Order Placed";
                      const orderNumber = order.order_id || `ORD${String(order.id).padStart(4, "0")}`;
                      return (
                        <article
                          key={orderNumber}
                          className="grid min-h-[210px] min-w-0 grid-cols-[88px_minmax(0,1fr)] gap-3 rounded-[20px] border border-[#eee6dd] bg-white p-3 shadow-[0_8px_22px_rgba(53,29,14,0.06)] transition hover:-translate-y-0.5 hover:border-[#edc9a9] hover:shadow-[0_12px_28px_rgba(53,29,14,0.09)] sm:min-h-[180px] sm:grid-cols-[110px_minmax(0,1fr)_145px] sm:gap-4 sm:p-4"
                        >
                          <div className="flex h-[88px] items-center justify-center overflow-hidden rounded-[14px] border border-[#eee7df] bg-[#fbf8f4] p-2 shadow-sm sm:h-full sm:min-h-[148px]">
                            {firstItem?.image ? (
                              <img
                                src={resolveMediaUrl(firstItem.image)}
                                alt={firstItem.product_name || firstItem.name || "Ordered furniture"}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <PackageCheck size={25} className="text-[#a34720]" />
                            )}
                          </div>
                          <div className="flex min-w-0 flex-col justify-center">
                            <span className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-xl bg-[#fff0df] px-2.5 py-2 text-xs font-extrabold text-[#a34720]">
                              <CalendarDays size={14} className="shrink-0" />
                              <span className="truncate">{orderNumber}</span>
                            </span>
                            <h3 className="mt-3 line-clamp-2 text-[15px] font-extrabold leading-snug text-[#351d0e] sm:text-[17px]">
                              {firstItem?.product_name || firstItem?.name || "Furniture order"}
                              {Number(firstItem?.quantity) > 1 ? ` × ${firstItem.quantity}` : ""}
                            </h3>
                            {Array.isArray(order.items) && order.items.length > 1 && (
                              <p className="mt-2 inline-flex max-w-full items-center gap-1.5 text-xs font-semibold leading-tight text-[#806d5d]">
                                <Layers size={14} className="shrink-0" />
                                <span className="min-w-0 truncate">+ {order.items.length - 1} more item(s)</span>
                              </p>
                            )}
                          </div>
                          <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_52px] items-center gap-3 border-t border-[#eee4d8] pt-3 sm:col-span-1 sm:grid-cols-1 sm:border-l sm:border-t-0 sm:border-[#eee4d8] sm:px-3 sm:pt-0">
                            <div className="min-w-0">
                              <span className={`inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-extrabold ${statusClass(status)}`}>
                                <PackageCheck size={15} className="shrink-0" />
                                <span className="truncate">{status}</span>
                              </span>
                              <div className="mt-3">
                                <p className="text-xs leading-tight text-[#806d5d]">Total Amount</p>
                                <p className="mt-1 text-base font-extrabold leading-tight text-[#351d0e] sm:text-lg">
                                  {formatAmount(order.total_amount)}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              aria-label={`View details for order ${orderNumber}`}
                              className="flex h-12 w-12 items-center justify-center justify-self-end rounded-full border-2 border-[#f07816] text-[#f07816] transition hover:bg-[#f07816] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e87500] sm:row-start-1 sm:self-start"
                            >
                              <ArrowRight size={23} />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {activeTab === "addresses" && (
              <>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff0df] text-[#e87500]">
                      <MapPin size={21} />
                    </span>
                    <div>
                      <h2 className="text-xl font-bold">Saved Addresses</h2>
                      <p className="text-sm text-[#806d5d]">Manage where your furniture orders are delivered.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={startNewAddress}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#f07816] to-[#df5d00] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:brightness-105"
                  >
                    <Plus size={16} /> Add New Address
                  </button>
                </div>

                {addressFormOpen && (
                  <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-[#21140d]/55 p-3 backdrop-blur-sm sm:p-6"
                    onClick={(event) => {
                      if (event.target === event.currentTarget && !addressSaving) {
                        setAddressFormOpen(false);
                        setAddressFormError("");
                      }
                    }}
                  >
                    <section
                      ref={addressModalRef}
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="address-dialog-title"
                      tabIndex={-1}
                      className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl outline-none"
                    >
                      <div className="flex items-center justify-between gap-4 border-b border-[#f1e7dd] bg-gradient-to-r from-[#fff5eb] to-white px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff0df] text-[#e87500]">
                            <MapPin size={21} />
                          </span>
                          <div>
                            <h3 id="address-dialog-title" className="text-lg font-extrabold text-[#351d0e]">
                              {editingAddressId ? "Edit Address" : "Add New Address"}
                            </h3>
                            <p className="mt-0.5 text-xs text-[#806d5d]">Enter the delivery details for this address.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAddressFormOpen(false);
                            setAddressFormError("");
                          }}
                          disabled={addressSaving}
                          aria-label="Close address form"
                          className="rounded-lg p-2 text-[#806d5d] transition hover:bg-[#f5e9dd] hover:text-[#351d0e] disabled:opacity-50"
                        >
                          <X size={19} />
                        </button>
                      </div>

                      <form onSubmit={saveAddress} className="flex min-h-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                            <label className="block text-xs font-bold">
                              Address label
                              <input
                                className={inputClass}
                                value={addressDraft.label}
                                maxLength={40}
                                onChange={(event) => setAddressDraft((current) => ({ ...current, label: event.target.value }))}
                                placeholder="Home, Office..."
                                required
                              />
                            </label>
                            <label className="block text-xs font-bold">
                              Full name
                              <input
                                className={inputClass}
                                value={addressDraft.customer_name}
                                maxLength={120}
                                onChange={(event) => setAddressDraft((current) => ({ ...current, customer_name: event.target.value }))}
                                autoComplete="name"
                                required
                              />
                            </label>
                            <label className="block text-xs font-bold">
                              Phone number
                              <input
                                className={inputClass}
                                type="tel"
                                value={addressDraft.customer_phone}
                                maxLength={32}
                                onChange={(event) => setAddressDraft((current) => ({ ...current, customer_phone: event.target.value }))}
                                autoComplete="tel"
                                required
                              />
                            </label>
                            <label className="block text-xs font-bold sm:col-span-2">
                              Street address
                              <input
                                className={inputClass}
                                value={addressDraft.street_address}
                                maxLength={255}
                                onChange={(event) => setAddressDraft((current) => ({ ...current, street_address: event.target.value }))}
                                autoComplete="street-address"
                                required
                              />
                            </label>
                            <label className="block text-xs font-bold">
                              City
                              <input
                                className={inputClass}
                                value={addressDraft.city}
                                maxLength={191}
                                onChange={(event) => setAddressDraft((current) => ({ ...current, city: event.target.value }))}
                                autoComplete="address-level2"
                                required
                              />
                            </label>
                            <label className="block text-xs font-bold">
                              District <span className="font-normal text-[#8b735e]">(optional)</span>
                              <input
                                className={inputClass}
                                value={addressDraft.district}
                                maxLength={191}
                                onChange={(event) => setAddressDraft((current) => ({ ...current, district: event.target.value }))}
                              />
                            </label>
                            <label className="block text-xs font-bold">
                              State
                              <select
                                className={inputClass}
                                value={addressDraft.state}
                                onChange={(event) => setAddressDraft((current) => ({ ...current, state: event.target.value }))}
                                autoComplete="address-level1"
                                required
                              >
                                <option value="" disabled>Select a state or union territory</option>
                                <optgroup label="States">
                                  {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                                </optgroup>
                                <optgroup label="Union territories">
                                  {INDIAN_UNION_TERRITORIES.map((state) => <option key={state} value={state}>{state}</option>)}
                                </optgroup>
                              </select>
                            </label>
                            <label className="block text-xs font-bold">
                              Country
                              <input
                                className={inputClass}
                                value={addressDraft.country}
                                maxLength={191}
                                onChange={(event) => setAddressDraft((current) => ({ ...current, country: event.target.value }))}
                                autoComplete="country-name"
                                required
                              />
                            </label>
                            <label className="block text-xs font-bold">
                              PIN code
                              <input
                                className={inputClass}
                                value={addressDraft.zip_code}
                                maxLength={32}
                                onChange={(event) => setAddressDraft((current) => ({ ...current, zip_code: event.target.value }))}
                                autoComplete="postal-code"
                                required
                              />
                            </label>
                            <label className="flex items-center gap-2 self-end pb-2 text-xs font-semibold text-[#5b4839]">
                              <input
                                type="checkbox"
                                checked={addressDraft.is_default}
                                onChange={(event) => setAddressDraft((current) => ({ ...current, is_default: event.target.checked }))}
                                className="h-4 w-4 accent-[#e87500]"
                              />
                              Set as default address
                            </label>
                          </div>
                          {addressFormError && <p role="alert" className="mt-3 text-sm text-red-700">{addressFormError}</p>}
                        </div>

                        <div className="flex flex-wrap justify-end gap-2 border-t border-[#f1e7dd] bg-[#fffdfa] px-5 py-4 sm:px-6">
                          <button
                            type="button"
                            onClick={() => {
                              setAddressFormOpen(false);
                              setAddressFormError("");
                            }}
                            disabled={addressSaving}
                            className="rounded-lg border border-[#edc9a9] px-4 py-2.5 text-xs font-bold text-[#5b3821] transition hover:bg-white disabled:opacity-60"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={addressSaving}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-white transition hover:bg-primary-dark disabled:opacity-60"
                          >
                            {addressSaving ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}
                            {addressSaving ? "Saving..." : "Save Address"}
                          </button>
                        </div>
                      </form>
                    </section>
                  </div>
                )}

                {addressesError ? (
                  <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <span>{addressesError}</span>
                    <button type="button" onClick={() => setReloadAddresses((count) => count + 1)} className="font-bold underline">Try again</button>
                  </div>
                ) : addressesLoading ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-[#806d5d]">
                    <LoaderCircle size={18} className="animate-spin" /> Loading your addresses...
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d9c4aa] px-5 py-12 text-center">
                    <MapPin className="mx-auto text-[#a34720]" size={34} />
                    <h3 className="mt-3 font-bold">No saved addresses yet</h3>
                    <p className="mx-auto mt-1 max-w-md text-sm text-[#806d5d]">
                      Add an address to save your delivery details for future orders.
                    </p>
                    <button
                      type="button"
                      onClick={startNewAddress}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary-dark"
                    >
                      <Plus size={16} /> Add an address
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {addresses.map((address) => {
                      const AddressIcon = address.label?.toLowerCase() === "home" ? Home : Building2;
                      const isDefault = Boolean(Number(address.is_default));
                      return (
                        <article key={address.id} className="rounded-xl border border-[#eee4d8] p-4 transition hover:border-[#edc9a9]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fff0df] text-[#a34720]">
                                <AddressIcon size={18} />
                              </span>
                              <div className="min-w-0">
                                <h3 className="truncate font-bold">{address.label || "Address"}</h3>
                                {isDefault && (
                                  <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                    Default
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => startEditAddress(address)}
                                aria-label={`Edit ${address.label || "address"}`}
                                className="rounded-md p-2 text-[#806d5d] hover:bg-[#fff0df] hover:text-[#a34720]"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteAddress(address)}
                                disabled={addressActionId === address.id}
                                aria-label={`Delete ${address.label || "address"}`}
                                className="rounded-md p-2 text-[#806d5d] hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                              >
                                {addressActionId === address.id ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />}
                              </button>
                            </div>
                          </div>
                          <p className="mt-3 text-sm font-semibold">{address.customer_name}</p>
                          <p className="mt-1 text-sm leading-6 text-[#725d4b]">
                            {[address.street_address, address.city, address.district, address.state, address.zip_code, address.country]
                              .filter(Boolean).join(", ")}
                          </p>
                          <p className="mt-2 text-xs text-[#806d5d]">{address.customer_phone}</p>
                          {!isDefault && (
                            <button
                              type="button"
                              onClick={() => makeDefaultAddress(address.id)}
                              disabled={addressActionId === address.id}
                              className="mt-3 text-xs font-bold text-[#a34720] hover:underline disabled:opacity-50"
                            >
                              Set as default
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {activeTab === "logout" && (
              <div className="flex min-h-[300px] flex-col items-center justify-center py-8 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#fff0df] text-[#e87500]">
                  <LogOut size={28} />
                </span>
                <h2 className="mt-5 text-2xl font-extrabold">Sign out of your account?</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#806d5d]">
                  You can sign back in anytime to view your profile, saved addresses, and orders.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={logout}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#f07816] to-[#df5d00] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-105"
                  >
                    <LogOut size={16} /> Yes, Log Out
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("profile")}
                    className="rounded-lg border border-[#edc9a9] px-5 py-3 text-sm font-bold text-[#5b3821] transition hover:bg-[#fff5eb]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
        </PageContainer>
      </main>
      {selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={closeOrderDetails} />}
    </>
  );
}

export default Account;
