import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../PrivateRouter/AuthContext";
import api from "../../api";
import { toast, Toaster } from "react-hot-toast";
import { resolveMediaUrl } from "../../utils/media";
import {
    FiMail,
    FiPhone,
    FiMapPin,
    FiShield,
    FiCamera,
    FiCheck,
    FiKey,
    FiLock,
    FiX,
    FiEdit2,
    FiUser,
    FiCalendar,
    FiLoader
} from "react-icons/fi";

const Profile = () => {
    const { user, login } = useContext(AuthContext);

    const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPwd, setChangingPwd] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [currentPwd, setCurrentPwd] = useState("");
    const [newPwd, setNewPwd] = useState("");
    const [confirmPwd, setConfirmPwd] = useState("");

    const [profileData, setProfileData] = useState({
        username: "",
        name: "",
        email: "",
        phone: "",
        street_address: "",
        city: "",
        district: "",
        state: "",
        country: "India",
        zip_code: "",
        role: "",
        created_at: "",
        profile_image: ""
    });

    // Fetch full profile from API
    const fetchProfile = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/auth/profile/${user?.id}`);
            setProfileData({
                username: res.data.username || "",
                name: res.data.name || "",
                email: res.data.email || "",
                phone: res.data.phone || "",
                street_address: res.data.street_address || "",
                city: res.data.city || "",
                district: res.data.district || "",
                state: res.data.state || "",
                country: res.data.country || "India",
                zip_code: res.data.zip_code || "",
                role: res.data.role || "",
                created_at: res.data.created_at || "",
                profile_image: res.data.profile_image || user?.profile_image || ""
            });
        } catch (err) {
            console.error("Failed to load profile:", err);
            // Fallback to local user data
            setProfileData({
                username: user?.username || "",
                name: user?.name || "",
                email: user?.email || "",
                phone: user?.phone || "",
                street_address: "",
                city: "",
                district: "",
                state: "",
                country: "India",
                zip_code: "",
                role: user?.role || "",
                created_at: "",
                profile_image: user?.profile_image || ""
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) fetchProfile();
    }, [user?.id]);

    const openPwdModal = () => setIsPwdModalOpen(true);
    const openEditModal = () => setIsEditModalOpen(true);

    const closePwdModal = () => {
        setIsPwdModalOpen(false);
        setCurrentPwd("");
        setNewPwd("");
        setConfirmPwd("");
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
    };

    const handleProfileImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Profile image is too large. Maximum size is 5 MB.");
            e.target.value = "";
            return;
        }

        const uploadData = new FormData();
        uploadData.append("image", file);
        setUploadingImage(true);
        try {
            const response = await api.post("/uploads/profile-image", uploadData);
            const token = localStorage.getItem("token");
            login({ ...user, ...response.data.user }, token);
            setProfileData((previous) => ({
                ...previous,
                profile_image: response.data.user.profile_image || response.data.url
            }));
            toast.success("Profile photo updated.");
        } catch (error) {
            console.error("Profile image upload failed:", error);
            toast.error(error.response?.data?.message || "Failed to upload profile photo.");
        } finally {
            setUploadingImage(false);
            e.target.value = "";
        }
    };

    // Save profile to DB
    const handleProfileUpdate = async () => {
        if (!profileData.username.trim()) {
            toast.error("Username is required");
            return;
        }
        if (!profileData.email.trim()) {
            toast.error("Email is required");
            return;
        }

        try {
            setSaving(true);
            const res = await api.put(`/auth/profile/${user?.id}`, {
                username: profileData.username,
                name: profileData.name,
                email: profileData.email,
                phone: profileData.phone,
                street_address: profileData.street_address,
                city: profileData.city,
                district: profileData.district,
                state: profileData.state,
                country: profileData.country,
                zip_code: profileData.zip_code
            });

            // Update local storage & context with new data
            const updatedUser = res.data.user;
            const token = localStorage.getItem("token");
            login({ ...user, ...updatedUser }, token);

            toast.success("Profile updated successfully");
            closeEditModal();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    // Change password via API
    const handlePwdChange = async () => {
        if (!currentPwd.trim()) {
            toast.error("Enter your current password");
            return;
        }
        if (newPwd.length < 6) {
            toast.error("New password must be at least 6 characters");
            return;
        }
        if (newPwd !== confirmPwd) {
            toast.error("New passwords do not match");
            return;
        }

        try {
            setChangingPwd(true);
            await api.put(`/auth/profile/${user?.id}/password`, {
                currentPassword: currentPwd,
                newPassword: newPwd
            });

            toast.success("Password changed successfully");
            closePwdModal();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to change password");
        } finally {
            setChangingPwd(false);
        }
    };

    const locationDisplay = [profileData.city, profileData.state, profileData.country]
        .filter(Boolean)
        .join(", ") || "Not set";

    const memberSince = profileData.created_at
        ? new Date(profileData.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
        : "";
    const profileInitials = (profileData.name || profileData.username || "User")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <FiLoader className="animate-spin text-4xl text-blue-500" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8">

            {/* Profile Card */}
            <div className="px-4 md:px-8">
                <div className="bg-white rounded-[2.5rem] shadow-2xl p-6 md:p-10 border border-gray-100">

                    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-10 border-b border-gray-200 pb-10">

                        {/* Avatar */}
                        <div className="relative group">
                            <label className={`relative block w-40 h-40 rounded-[2.25rem] bg-[#DFF1C9] ring-8 ring-white shadow-xl overflow-hidden ${uploadingImage ? "cursor-wait" : "cursor-pointer"}`}>
                                {profileData.profile_image ? (
                                    <img src={resolveMediaUrl(profileData.profile_image)} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="w-full h-full flex items-center justify-center text-6xl font-light tracking-tight text-slate-950">{profileInitials}</span>
                                )}
                                <span className="absolute inset-0 bg-black/35 flex flex-col gap-1 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                    <FiCamera className="text-2xl" />
                                    <span className="text-xs font-semibold">{uploadingImage ? "Uploading..." : "Change photo"}</span>
                                </span>
                                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleProfileImageUpload} disabled={uploadingImage} className="sr-only" />
                            </label>
                        </div>

                        {/* User Info */}
                        <div className="text-center md:text-left space-y-2 flex-1">

                            <div className="flex items-center gap-3 justify-center md:justify-start">
                                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-slate-900">
                                    {profileData.name || profileData.username || "User"}
                                </h1>

                                <button
                                    onClick={openEditModal}
                                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    <FiEdit2 />
                                </button>
                            </div>

                            <p className="text-gray-400 font-medium">
                                @{profileData.username} • {profileData.role || "Admin"}
                            </p>

                            <div className="flex flex-wrap gap-4 mt-4 justify-center md:justify-start">
                                <span className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                    <FiMapPin className="text-blue-500" />
                                    {locationDisplay}
                                </span>

                                <span className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                    <FiShield className="text-emerald-500" />
                                    Identity Verified
                                </span>

                                {memberSince && (
                                    <span className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                        <FiCalendar className="text-purple-500" />
                                        Joined {memberSince}
                                    </span>
                                )}
                            </div>

                        </div>

                        {/* Change Password */}
                        <button
                            onClick={openPwdModal}
                            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-7 py-4 rounded-xl font-bold transition-colors whitespace-nowrap"
                        >
                            <FiLock />
                            Change Password
                        </button>

                    </div>

                    {/* Account Info */}
                    <div className="grid md:grid-cols-2 gap-6 mt-8">

                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                <FiUser className="text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Username</p>
                                <p className="font-bold text-slate-700">{profileData.username || "–"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                <FiMail className="text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Email</p>
                                <p className="font-bold text-slate-700">{profileData.email || "–"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                <FiPhone className="text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Phone</p>
                                <p className="font-bold text-slate-700">{profileData.phone || "Not set"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                <FiMapPin className="text-blue-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Location</p>
                                <p className="font-bold text-slate-700">{locationDisplay}</p>
                            </div>
                        </div>

                    </div>

                </div>
            </div>


            {/* EDIT PROFILE MODAL */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex h-screen w-screen items-center justify-center bg-black/40 p-4 backdrop-blur-md">

                    <div className="bg-white p-6 rounded-2xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto">

                        <button
                            onClick={closeEditModal}
                            className="absolute top-3 right-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <FiX />
                        </button>

                        <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                            <FiEdit2 className="text-blue-500" />
                            Edit Profile
                        </h2>

                        <div className="space-y-4">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">Username *</label>
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        value={profileData.username}
                                        onChange={(e) =>
                                            setProfileData({ ...profileData, username: e.target.value })
                                        }
                                        className="w-full border border-gray-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={profileData.name}
                                        onChange={(e) =>
                                            setProfileData({ ...profileData, name: e.target.value })
                                        }
                                        className="w-full border border-gray-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Email *</label>
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={profileData.email}
                                    onChange={(e) =>
                                        setProfileData({ ...profileData, email: e.target.value })
                                    }
                                    className="w-full border border-gray-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Phone</label>
                                <input
                                    type="text"
                                    placeholder="Phone number"
                                    value={profileData.phone}
                                    onChange={(e) =>
                                        setProfileData({ ...profileData, phone: e.target.value })
                                    }
                                    className="w-full border border-gray-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>


                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Address</p>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Street Address</label>
                                <input
                                    type="text"
                                    placeholder="Street address"
                                    value={profileData.street_address}
                                    onChange={(e) =>
                                        setProfileData({ ...profileData, street_address: e.target.value })
                                    }
                                    className="w-full border border-gray-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">City</label>
                                    <input
                                        type="text"
                                        placeholder="City"
                                        value={profileData.city}
                                        onChange={(e) =>
                                            setProfileData({ ...profileData, city: e.target.value })
                                        }
                                        className="w-full border border-gray-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">District</label>
                                    <input
                                        type="text"
                                        placeholder="District"
                                        value={profileData.district}
                                        onChange={(e) =>
                                            setProfileData({ ...profileData, district: e.target.value })
                                        }
                                        className="w-full border border-gray-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">State</label>
                                    <input
                                        type="text"
                                        placeholder="State"
                                        value={profileData.state}
                                        onChange={(e) =>
                                            setProfileData({ ...profileData, state: e.target.value })
                                        }
                                        className="w-full border border-gray-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">Country</label>
                                    <input
                                        type="text"
                                        placeholder="Country"
                                        value={profileData.country}
                                        onChange={(e) =>
                                            setProfileData({ ...profileData, country: e.target.value })
                                        }
                                        className="w-full border border-gray-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">ZIP Code</label>
                                    <input
                                        type="text"
                                        placeholder="ZIP"
                                        value={profileData.zip_code}
                                        onChange={(e) =>
                                            setProfileData({ ...profileData, zip_code: e.target.value })
                                        }
                                        className="w-full border border-gray-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleProfileUpdate}
                                disabled={saving}
                                className="w-full bg-primary hover:bg-primary-dark disabled:bg-primary/60 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <FiLoader className="animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <FiCheck />
                                        Save Changes
                                    </>
                                )}
                            </button>

                        </div>

                    </div>

                </div>
            )}


            {/* PASSWORD MODAL */}
            {isPwdModalOpen && (
                <div className="fixed inset-0 z-[100] flex h-screen w-screen items-center justify-center bg-black/40 p-4 backdrop-blur-md">

                    <div className="bg-white p-6 rounded-2xl w-full max-w-md relative">

                        <button
                            onClick={closePwdModal}
                            className="absolute top-3 right-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <FiX />
                        </button>

                        <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                            <FiLock className="text-blue-500" />
                            Change Password
                        </h2>

                        <div className="space-y-4">

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Current Password</label>
                                <input
                                    type="password"
                                    placeholder="Enter current password"
                                    value={currentPwd}
                                    onChange={(e) => setCurrentPwd(e.target.value)}
                                    className="w-full border border-gray-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">New Password</label>
                                <input
                                    type="password"
                                    placeholder="Minimum 6 characters"
                                    value={newPwd}
                                    onChange={(e) => setNewPwd(e.target.value)}
                                    className="w-full border border-gray-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Confirm Password</label>
                                <input
                                    type="password"
                                    placeholder="Re-enter new password"
                                    value={confirmPwd}
                                    onChange={(e) => setConfirmPwd(e.target.value)}
                                    className="w-full border border-gray-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>

                            <button
                                onClick={handlePwdChange}
                                disabled={changingPwd}
                                className="w-full bg-primary hover:bg-primary-dark disabled:bg-primary/60 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                {changingPwd ? (
                                    <>
                                        <FiLoader className="animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <FiKey />
                                        Update Password
                                    </>
                                )}
                            </button>

                        </div>

                    </div>

                </div>
            )}

            <Toaster position="top-right" />
        </div>
    );
};

export default Profile;
