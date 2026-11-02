import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../PrivateRouter/AuthContext";
import api from "../../../api";
import { toast } from "react-hot-toast";
import { resolveMediaUrl } from "../../../utils/media";

export default function PersonalInfo() {

  const { user, updateUser } = useContext(AuthContext);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    role: ""
  });

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || ""
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
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
      const updatedUser = { ...user, ...response.data.user };
      updateUser(updatedUser);
      toast.success("Profile photo updated.");
    } catch (error) {
      console.error("Profile image upload failed:", error);
      toast.error(error.response?.data?.message || "Failed to upload profile photo.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleUpdate = async () => {
    // Support both id and _id field names
    const userId = user?.id || user?._id;
    if (!userId) {
      toast.error("User not found. Please log in again.");
      return;
    }
    try {
      const res = await api.put(`/auth/profile/${userId}`, {
        username: form.username,
        email: form.email,
        phone: form.phone
      });

      // Update AuthContext + localStorage so UI reflects new data immediately
      const updatedUser = { ...user, ...res.data.user };
      updateUser(updatedUser);

      toast.success("Profile updated successfully!");

    } catch (err) {
      console.error("Update error:", err);
      toast.error(err.response?.data?.message || "Failed to update profile");
    }
  };


  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">

      <h2 className="text-2xl font-semibold text-gray-800 mb-8">
        Personal Information
      </h2>

      <div className="flex items-center gap-5 mb-8">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center text-2xl font-semibold text-gray-500">
          {user?.profile_image ? (
            <img src={resolveMediaUrl(user.profile_image)} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            (user?.username || "U").charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <label className={`inline-flex cursor-pointer items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${uploadingImage ? "pointer-events-none opacity-60" : ""}`}>
            {uploadingImage ? "Uploading..." : "Change profile photo"}
            <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleProfileImageUpload} disabled={uploadingImage} className="sr-only" />
          </label>
          <p className="mt-1 text-xs text-gray-500">JPG, PNG, GIF or WEBP. Maximum 5 MB.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Username */}
        <div>
          <label className="text-sm text-gray-600 font-medium">
            Username
          </label>

          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            className="w-full mt-2 border border-gray-200 rounded-lg px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        {/* Role */}
        {/* <div>
          <label className="text-sm text-gray-600 font-medium">
            Role
          </label>

          <input
            type="text"
            name="role"
            value={form.role}
            disabled
            className="w-full mt-2 border border-primary bg-gray-100 rounded-lg px-4 py-3"
          />
        </div> */}

        {/* Email */}
        <div>
          <label className="text-sm text-gray-600 font-medium">
            Email
          </label>

          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="w-full mt-2 border border-gray-200 rounded-lg px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

        {/* Phone */}
        <div className="md:col-span-2">
          <label className="text-sm text-gray-600 font-medium">
            Phone
          </label>

          <input
            type="text"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full mt-2 border border-gray-200 rounded-lg px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>

      </div>

      <div className="flex justify-end mt-8">
        <button
          onClick={handleUpdate}
          className="bg-primary hover:bg-primary-light text-white px-6 py-3 rounded-lg font-medium transition shadow-sm"
        >
          Save Changes
        </button>
      </div>

    </div>
  );
}