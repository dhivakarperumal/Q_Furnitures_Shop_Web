import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Camera,
  Check,
  Clock3,
  CreditCard,
  Home,
  KeyRound,
  LoaderCircle,
  LogOut,
  MapPin,
  PackageCheck,
  ShoppingBag,
  UserRound,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api";
import { AuthContext } from "../PrivateRouter/AuthContext";
import { resolveMediaUrl } from "../utils/media";
import PageContainer from "./CommenComponents/PageContainer";

const inputClass =
  "mt-1 w-full rounded-lg border border-[#ddd5cd] bg-white px-4 py-2.5 text-sm text-[#351d0e] outline-none transition placeholder:text-[#a99a8a] focus:border-primary focus:ring-4 focus:ring-orange-100";

const tabs = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "orders", label: "Orders", icon: PackageCheck },
  { id: "password", label: "Set Password", icon: KeyRound },
];

const accountHeroImage = resolveMediaUrl("/uploads/banners/1a4fd15f-b369-42f2-9d40-47fcb5d305a2.png");
const MAX_BIRTH_DATE = new Date().toISOString().slice(0, 10);

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

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function statusClass(status) {
  if (status === "Delivered") return "bg-emerald-50 text-emerald-700";
  if (status === "Cancelled") return "bg-red-50 text-red-700";
  if (status === "Shipping") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-800";
}

function getOrderAddress(order) {
  const address = order.shipping_address && typeof order.shipping_address === "object"
    ? order.shipping_address
    : order;
  return {
    customer_name: address.customer_name || order.customer_name || "",
    customer_phone: address.customer_phone || order.customer_phone || "",
    street_address: address.street_address || address.address || "",
    city: address.city || "",
    district: address.district || "",
    state: address.state || "",
    country: address.country || "",
    zip_code: address.zip_code || "",
  };
}

function Account() {
  const { user, updateUser, logout } = useContext(AuthContext);
  const photoInputRef = useRef(null);
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
  const [profileLoading, setProfileLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [ordersError, setOrdersError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileFormError, setProfileFormError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [reloadProfile, setReloadProfile] = useState(0);
  const [reloadOrders, setReloadOrders] = useState(0);
  const userId = user?.id;
  const userProfileImage = user?.profile_image;

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

  const addresses = useMemo(() => {
    const uniqueAddresses = new Map();
    orders.forEach((order) => {
      const address = getOrderAddress(order);
      if (!address.street_address) return;
      const key = [
        address.street_address,
        address.city,
        address.district,
        address.state,
        address.country,
        address.zip_code,
      ].map((part) => String(part).trim().toLowerCase().replace(/\s+/g, " ")).join("|");
      if (!uniqueAddresses.has(key)) uniqueAddresses.set(key, address);
    });
    return [...uniqueAddresses.values()];
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
    if (passwords.newPassword.length < 8 || passwords.newPassword.length > 72) {
      setPasswordError("Password must be between 8 and 72 characters.");
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
    <main className="min-h-[65vh] bg-[#fffaf5] text-[#351d0e]">
      <section className="relative isolate min-h-[130px] overflow-hidden bg-[#f3e5d7] sm:min-h-[160px]">
        <img src={accountHeroImage} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#fff8f0] via-[#fff8f0]/95 to-[#fff8f0]/10" />
        <PageContainer>
          <div className="flex min-h-[130px] items-center py-5 sm:min-h-[160px]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#806d5d]">Your Q Furnitures account</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                My <span className="text-[#ef7412]">Account</span>
              </h1>
              <p className="mt-1 text-sm text-[#594333]">Manage your profile, addresses, orders and account settings.</p>
            </div>
          </div>
        </PageContainer>
      </section>

      <PageContainer>
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 py-3 text-xs text-[#725d4b]">
          <Link to="/" className="inline-flex items-center gap-1.5 hover:text-[#e87500]">
            <Home size={14} /> Home
          </Link>
          <span className="text-[#e87500]">›</span>
          <span aria-current="page">My Account</span>
        </nav>

        <div className="grid gap-4 pb-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-5 lg:pb-10">
          <aside className="h-fit overflow-hidden rounded-2xl border border-[#f1e7dd] bg-[#fff7ef] p-3 shadow-sm sm:p-4">
            <div className="flex items-center gap-3 px-2 py-2 sm:py-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f5dfc8] text-lg font-bold text-[#a34720]">
                {profile.profile_image ? (
                  <img src={resolveMediaUrl(profile.profile_image)} alt="" className="h-full w-full object-cover" />
                ) : initials || <UserRound size={25} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold">{displayName}</span>
                <span className="mt-0.5 block truncate text-xs text-[#725d4b]">{profile.email || user?.email}</span>
              </span>
            </div>
            <nav aria-label="Account sections" role="tablist" className="mt-3 flex gap-1 overflow-x-auto lg:flex-col">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  id={`account-tab-${id}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  aria-controls={`account-panel-${id}`}
                  onClick={() => setActiveTab(id)}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-left text-xs font-bold transition sm:text-sm lg:w-full ${
                    activeTab === id
                      ? "border-[#f07816] bg-[#ffe8cf] text-[#351d0e]"
                      : "border-transparent text-[#5b4839] hover:bg-white/70"
                  }`}
                >
                  <Icon size={18} className="shrink-0 text-[#a34720]" />
                  {label}
                  {id === "orders" && !ordersLoading && !ordersError && (
                    <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] text-[#8b735e]">{orders.length}</span>
                  )}
                </button>
              ))}
            </nav>
            <div className="mt-3 border-t border-[#e7d8c8] pt-2">
              <button
                type="button"
                onClick={logout}
                className="inline-flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold text-[#5b4839] transition hover:bg-white/70 hover:text-[#a34720] sm:text-sm"
              >
                <LogOut size={18} className="text-[#e87500]" />
                Logout
              </button>
            </div>
          </aside>

          <section
            id={`account-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`account-tab-${activeTab}`}
            className="min-h-[320px] rounded-2xl border border-[#eee4d8] bg-white p-5 shadow-[0_8px_24px_rgba(53,29,14,0.06)] sm:p-6 lg:p-7"
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
                    <p className="text-sm text-[#806d5d]">Choose a strong password to protect your account.</p>
                  </div>
                </div>
                <form onSubmit={changePassword} className="max-w-xl space-y-5">
                  <label className="block text-sm font-semibold">
                    Current password
                    <input
                      className={inputClass}
                      type="password"
                      autoComplete="current-password"
                      value={passwords.currentPassword}
                      onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="block text-sm font-semibold">
                    New password
                    <input
                      className={inputClass}
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={72}
                      value={passwords.newPassword}
                      onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))}
                      required
                    />
                    <span className="mt-1 block text-xs font-normal text-[#8b735e]">Use 8–72 characters.</span>
                  </label>
                  <label className="block text-sm font-semibold">
                    Confirm new password
                    <input
                      className={inputClass}
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={72}
                      value={passwords.confirmPassword}
                      onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))}
                      required
                    />
                  </label>
                  {passwordError && <p role="alert" className="text-sm text-red-700">{passwordError}</p>}
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60"
                  >
                    {passwordSaving ? <LoaderCircle size={17} className="animate-spin" /> : <KeyRound size={17} />}
                    {passwordSaving ? "Updating..." : "Update password"}
                  </button>
                </form>
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
                  </div>
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
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <article key={order.order_id || order.id} className="rounded-xl border border-[#eee4d8] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-[#8b735e]">Order number</p>
                            <h3 className="mt-0.5 font-bold">{order.order_id || `ORD${String(order.id).padStart(4, "0")}`}</h3>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(order.status)}`}>
                            {order.status || "Order Placed"}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#725d4b]">
                          <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} />{formatDate(order.created_at)}</span>
                          <span className="inline-flex items-center gap-1.5"><CreditCard size={14} />{order.payment_method || "Payment not specified"}</span>
                          <span className="inline-flex items-center gap-1.5"><Clock3 size={14} />{Array.isArray(order.items) ? order.items.length : 0} item(s)</span>
                        </div>
                        {Array.isArray(order.items) && order.items.length > 0 && (
                          <p className="mt-3 line-clamp-2 text-sm text-[#725d4b]">
                            {order.items.map((item) => `${item.product_name || item.name || "Furniture"} × ${item.quantity}`).join(" · ")}
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between border-t border-[#eee4d8] pt-3">
                          <span className="text-xs font-semibold text-[#806d5d]">Order total</span>
                          <span className="font-bold">{formatAmount(order.total_amount)}</span>
                        </div>
                      </article>
                    ))}
                    <Link to="/ordersmain" className="inline-flex text-sm font-bold text-[#a34720] hover:underline">
                      View full order details
                    </Link>
                  </div>
                )}
              </>
            )}

            {activeTab === "addresses" && (
              <>
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff0df] text-[#e87500]">
                    <MapPin size={21} />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold">Saved Addresses</h2>
                    <p className="text-sm text-[#806d5d]">Delivery addresses from your previous orders.</p>
                  </div>
                </div>
                {ordersLoading ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-[#806d5d]">
                    <LoaderCircle size={18} className="animate-spin" /> Loading your addresses...
                  </div>
                ) : ordersError ? (
                  <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <span>{ordersError}</span>
                    <button type="button" onClick={() => setReloadOrders((count) => count + 1)} className="font-bold underline">Try again</button>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d9c4aa] px-5 py-12 text-center">
                    <MapPin className="mx-auto text-[#a34720]" size={34} />
                    <h3 className="mt-3 font-bold">No saved addresses yet</h3>
                    <p className="mx-auto mt-1 max-w-md text-sm text-[#806d5d]">
                      Add a delivery address at checkout. It will be available here after you place your order.
                    </p>
                    <Link to="/shop" className="mt-4 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary-dark">
                      Shop furniture
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {addresses.map((address, index) => (
                      <article key={`${address.street_address}-${address.zip_code}-${index}`} className="rounded-xl border border-[#eee4d8] p-4">
                        <div className="flex items-center gap-2">
                          <MapPin size={17} className="shrink-0 text-[#e87500]" />
                          <h3 className="font-bold">{address.customer_name || `Address ${index + 1}`}</h3>
                        </div>
                        <p className="mt-2 pl-6 text-sm leading-6 text-[#725d4b]">
                          {[
                            address.street_address,
                            address.city,
                            address.district,
                            address.state,
                            address.zip_code,
                            address.country,
                          ].filter(Boolean).join(", ")}
                        </p>
                        {address.customer_phone && <p className="mt-2 pl-6 text-xs text-[#806d5d]">{address.customer_phone}</p>}
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </PageContainer>
    </main>
  );
}

export default Account;
