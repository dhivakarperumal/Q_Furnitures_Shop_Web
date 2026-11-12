import React, { useState, useEffect, useCallback } from "react";
import api from "../../api";
import {
    FiSearch,
    FiFilter,
    FiUserPlus,
    FiEye,
    FiEdit2,
    FiTrash2,
    FiMail,
    FiPhone,
    FiCalendar,
    FiUserX,
    FiX,
    FiGrid,
    FiList
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import { resolveMediaUrl } from "../../utils/media";


const deriveUserStatus = (user) => {
    if (user?.status) {
        return String(user.status).toLowerCase() === "inactive" ? "Inactive" : "Active";
    }
    return "Active";
};

const Users = ({ initialTab = "All" }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [selectedTab, setSelectedTab] = useState(initialTab);
    const [selectedRole, setSelectedRole] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState("table"); // "table" | "card"

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Update tab when initialTab prop changes
    useEffect(() => {
        setSelectedTab(initialTab);
    }, [initialTab]);

    // ---- Modal State for Registering/Editing User ----
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingUser, setViewingUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editUserId, setEditUserId] = useState(null);
    const [formData, setFormData] = useState({
        username: "",
        name: "",
        email: "",
        phone: "",
        role: "user",
        password: ""
    });
    const [submitLoading, setSubmitLoading] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        try {
            const response = await api.get("/auth/users");
            if (!Array.isArray(response.data)) {
                throw new Error("The customer list response was invalid.");
            }
            const fetchedUsers = response.data.map((u) => ({
                id: u.id || u.user_id,
                name: u.name || u.username,
                email: u.email,
                phone: u.phone || "",
                role: u.role ? u.role.toLowerCase() : 'user',
                status: deriveUserStatus(u),
                joined: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A',
                rawCreated_at: u.created_at,
                avatar: u.profile_image
                    ? resolveMediaUrl(u.profile_image)
                    : ""
            }));
            setUsers(fetchedUsers);
        } catch (error) {
            console.error("Failed to fetch users:", error);
            const message = error.response?.data?.message || error.message || "Could not load customer accounts.";
            setLoadError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSaveUser = async () => {
        if (!formData.username || !formData.email) return;
        if (!isEditing && !formData.password) return;

        setSubmitLoading(true);
        try {
            if (isEditing) {
                await api.put(`/auth/users/${editUserId}`, { ...formData, role: formData.role.toLowerCase() });
                toast.success("User updated successfully!");
            } else {
                await api.post("/auth/register", { ...formData, role: formData.role.toLowerCase() });
                toast.success("User registered successfully!");
            }
            setIsModalOpen(false);
            setFormData({ username: "", name: "", email: "", phone: "", role: "user", password: "" });
            setIsEditing(false);
            setEditUserId(null);
            fetchUsers();
        } catch (error) {
            console.error("Operation failed:", error);
            toast.error(error.response?.data?.message || "Operation failed");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
        try {
            await api.delete(`/auth/users/${id}`);
            toast.success("User eliminated from system.");
            fetchUsers();
        } catch (error) {
            toast.error("Failed to delete user");
        }
    };

    const handleQuickRoleUpdate = async (id, newRole, user) => {
        try {
            const payload = {
                username: user.username || user.name,
                name: user.name,
                email: user.email,
                phone: user.phone || ""
            };
            await api.put(`/auth/users/${id}`, { ...payload, role: newRole.toLowerCase() });
            toast.success(`Role updated to ${newRole.toLowerCase()}`);
            fetchUsers();
        } catch (error) {
            toast.error("Failed to update role");
        }
    };

    const openEditModal = (user) => {
        setFormData({
            username: user.username || user.name,
            name: user.name,
            email: user.email,
            phone: user.phone || "",
            role: user.role,
            password: "" // Don't show password on edit
        });
        setEditUserId(user.id);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const getRoleStyle = (role) => {
        const normalizedRole = role ? role.toLowerCase() : "";
        if (normalizedRole.includes("admin")) return "bg-slate-900 text-white shadow-sm";
        if (normalizedRole.includes("manager")) return "bg-indigo-50 text-indigo-600 border border-indigo-100";
        if (normalizedRole.includes("dealer")) return "bg-amber-50 text-amber-600 border border-amber-100";
        return "bg-emerald-50 text-emerald-600 border border-emerald-100"; // User / Customer
    };

    const isToday = (dateString) => {
        if (!dateString || dateString === 'N/A') return false;
        const date = new Date(dateString);
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesTab = selectedTab === "All" || (selectedTab === "New" && isToday(user.rawCreated_at));
        const matchesRole = selectedRole === "all" || (user.role && user.role.toLowerCase() === selectedRole.toLowerCase());

        return matchesSearch && matchesTab && matchesRole;
    });

    const newUsersCount = users.filter(u => isToday(u.rawCreated_at)).length;

    // Pagination Logic
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const pageCount = Math.max(1, totalPages);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedTab, selectedRole]);

    // Computed Stats from real data
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'Active').length;
    const inactiveUsers = users.filter(u => u.status === 'Inactive').length;
    const adminUsers = users.filter(u => u.role === 'admin').length;
    const adminPct = totalUsers ? Math.round((adminUsers / totalUsers) * 100) : 0;

    return (
        <div className="min-h-full pb-8 font-sans">
            <div className="mx-auto max-w-[1600px] space-y-6 px-1 py-2 sm:px-2">
           

                {/* Stat Cards */}
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
                    <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-orange-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
                        <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-orange-400 to-orange-700" />
                        <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-800 text-white shadow-lg shadow-orange-200/70 transition-transform duration-200 group-hover:scale-105">
                            <FiUserPlus size={22} />
                        </div>
                        <div className="relative z-10">
                            <p className="mb-1 text-xs font-bold tracking-wide text-orange-800">Total accounts</p>
                            <h3 className="mb-1 text-3xl font-black leading-none text-slate-900">{totalUsers.toLocaleString()}</h3>
                            <p className="text-[10px] font-medium text-stone-500">All registered users</p>
                        </div>
                        <FiUserPlus className="pointer-events-none absolute -right-1 bottom-1 text-orange-300/20" size={60} />
                    </div>
                    <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-emerald-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
                        <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
                        <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-200/70 transition-transform duration-200 group-hover:scale-105">
                            <FiUserPlus size={22} />
                        </div>
                        <div className="relative z-10">
                            <p className="mb-1 text-xs font-bold tracking-wide text-emerald-800">Active</p>
                            <h3 className="mb-1 text-3xl font-black leading-none text-slate-900">{activeUsers.toLocaleString()}</h3>
                            <p className="text-[10px] font-medium text-stone-500">Accounts in good standing</p>
                        </div>
                        <FiUserPlus className="pointer-events-none absolute -right-1 bottom-1 text-emerald-300/20" size={60} />
                    </div>
                    <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-amber-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-amber-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
                        <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-amber-400 to-amber-600" />
                        <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-200/70 transition-transform duration-200 group-hover:scale-105">
                            <FiUserX size={22} />
                        </div>
                        <div className="relative z-10">
                            <p className="mb-1 text-xs font-bold tracking-wide text-amber-800">Inactive</p>
                            <h3 className="mb-1 text-3xl font-black leading-none text-slate-900">{inactiveUsers.toLocaleString()}</h3>
                            <p className="text-[10px] font-medium text-stone-500">Accounts needing review</p>
                        </div>
                        <FiUserX className="pointer-events-none absolute -right-1 bottom-1 text-amber-300/20" size={60} />
                    </div>
                    <div className="group relative flex min-h-24 items-center gap-4 overflow-hidden rounded-xl border border-orange-100/80 bg-white/95 px-5 py-4 shadow-[0_8px_24px_rgba(74,46,25,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_14px_30px_rgba(74,46,25,0.14)]">
                        <div className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-gradient-to-b from-orange-400 to-orange-700" />
                        <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-800 text-white shadow-lg shadow-orange-200/70 transition-transform duration-200 group-hover:scale-105">
                            <FiUserPlus size={22} />
                        </div>
                        <div className="relative z-10">
                            <p className="mb-1 text-xs font-bold tracking-wide text-orange-800">Administrators</p>
                            <h3 className="mb-1 text-3xl font-black leading-none text-slate-900">{adminUsers.toLocaleString()}</h3>
                            <p className="text-[10px] font-medium text-stone-500">{adminPct}% of all accounts</p>
                        </div>
                        <FiUserPlus className="pointer-events-none absolute -right-1 bottom-1 text-orange-300/20" size={60} />
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                        <div className="relative w-full sm:w-72">
                            <input
                                type="text"
                                placeholder="Search by name, email, phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                            />
                            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                        <div className="flex items-center rounded-xl bg-slate-100 p-1">
                            {[
                                { label: "All", count: totalUsers },
                                { label: "New today", count: newUsersCount },
                            ].map((tab) => (
                                <button
                                    key={tab.label}
                                    type="button"
                                    onClick={() => setSelectedTab(tab.label === "New today" ? "New" : "All")}
                                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${selectedTab === (tab.label === "New today" ? "New" : "All") ? "bg-white text-orange-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                                >
                                    {tab.label} <span className="ml-1 text-[10px] opacity-70">{tab.count}</span>
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="w-40 appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                            >
                                <option value="all">All roles</option>
                                <option value="customer">Customer</option>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="dealer">Dealer</option>
                            </select>
                            <FiFilter className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                            <button
                                type="button"
                                onClick={() => setViewMode("table")}
                                className={`rounded-lg p-2 transition-colors ${viewMode === "table" ? "bg-white text-orange-700 shadow-sm" : "text-slate-500 hover:text-orange-700"}`}
                                aria-label="Table mode"
                            >
                                <FiList size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("card")}
                                className={`rounded-lg p-2 transition-colors ${viewMode === "card" ? "bg-white text-orange-700 shadow-sm" : "text-slate-500 hover:text-orange-700"}`}
                                aria-label="Card mode"
                            >
                                <FiGrid size={16} />
                            </button>
                        </div>
                        <button
                            onClick={() => { setIsEditing(false); setFormData({ username: "", name: "", email: "", phone: "", role: "user", password: "" }); setIsModalOpen(true); }}
                            className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 active:scale-[0.98]"
                        >
                            <FiUserPlus size={16} /> Add customer
                        </button>
                    </div>
                </div>

                {/* Table / Card View */}
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                    {viewMode === "table" ? (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-[#3B1A0B] to-[#6B3212] text-[11px] font-bold uppercase tracking-wider text-amber-200">
                                            <th className="w-12 px-5 py-4"><input type="checkbox" className="rounded border-white/70 text-orange-500 focus:ring-orange-400" aria-label="Select all customers" /></th>
                                            <th className="px-6 py-4">Customer ID</th>
                                            <th className="px-6 py-4">Customer</th>
                                            <th className="px-6 py-4">Email</th>
                                            <th className="px-6 py-4">Role</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4">Joined Date</th>
                                            <th className="px-6 py-4 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan="8" className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
                                                    Loading customers...
                                                </td>
                                            </tr>
                                        ) : loadError ? (
                                            <tr>
                                                <td colSpan="8" className="px-6 py-12 text-center">
                                                    <p className="text-sm font-semibold text-rose-600">{loadError}</p>
                                                    <button type="button" onClick={fetchUsers} className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100">Try again</button>
                                                </td>
                                            </tr>
                                        ) : currentItems.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="px-6 py-12 text-center text-sm font-semibold text-slate-400">
                                                    No customers found.
                                                </td>
                                            </tr>
                                        ) : (
                                            currentItems.map((user, idx) => (
                                                    <tr key={user.id} className="border-b border-slate-100 transition-colors hover:bg-orange-50/40">
                                                        <td className="px-6 py-4">
                                                            <input type="checkbox" className="rounded border-slate-300 text-orange-600 focus:ring-orange-400" />
                                                        </td>
                                                        <td className="px-6 py-4 text-[13px] font-bold text-orange-700">
                                                            CUS{1000 + (parseInt(user.id) || idx + 1)}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                                                                    {(user.name || "?").trim().charAt(0).toUpperCase()}
                                                                    {user.avatar && <img src={user.avatar} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(event) => event.currentTarget.remove()} />}
                                                                </div>
                                                                <div>
                                                                    <div className="text-[13px] font-bold text-slate-800">{user.name}</div>
                                                                    <div className="mt-0.5 text-[11px] font-medium text-slate-400">{user.phone || "No phone provided"}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-[13px] font-medium text-slate-600">{user.email}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                                                user.role === 'admin' ? 'bg-slate-100 text-slate-700' :
                                                                user.role === 'manager' ? 'bg-indigo-50 text-indigo-600' :
                                                                user.role === 'dealer' ? 'bg-amber-50 text-amber-700' :
                                                                'bg-orange-50 text-orange-700'
                                                            }`}>
                                                                {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                {user.status || 'Active'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-[12px] font-semibold text-slate-700">{user.joined}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setViewingUser(user)}
                                                                    aria-label={`View ${user.name}`}
                                                                    title="View customer"
                                                                    className="rounded-lg border border-slate-200 p-1.5 text-orange-700 shadow-sm transition-colors hover:bg-orange-50"
                                                                >
                                                                    <FiEye size={14} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openEditModal(user)}
                                                                    aria-label={`Edit ${user.name}`}
                                                                    title="Edit customer"
                                                                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
                                                                >
                                                                    <FiEdit2 size={14} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteUser(user.id)}
                                                                    aria-label={`Delete ${user.name}`}
                                                                    title="Delete customer"
                                                                    className="rounded-lg border border-slate-200 p-1.5 text-rose-600 shadow-sm transition-colors hover:bg-rose-50"
                                                                >
                                                                    <FiTrash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {loading ? (
                                <div className="col-span-full px-6 py-12 text-center text-sm font-semibold text-slate-400">
                                    Loading customers...
                                </div>
                            ) : loadError ? (
                                <div className="col-span-full px-6 py-12 text-center">
                                    <p className="text-sm font-semibold text-rose-600">{loadError}</p>
                                    <button type="button" onClick={fetchUsers} className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100">Try again</button>
                                </div>
                            ) : currentItems.length === 0 ? (
                                <div className="col-span-full px-6 py-12 text-center text-sm font-semibold text-slate-400">
                                    No customers found.
                                </div>
                            ) : (
                                currentItems.map((user, idx) => (
                                    <article key={user.id} className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                                        <div className="mb-4 flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-orange-50 text-sm font-bold text-orange-700">
                                                    {(user.name || "?").trim().charAt(0).toUpperCase()}
                                                    {user.avatar && <img src={user.avatar} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(event) => event.currentTarget.remove()} />}
                                                </div>
                                                <h3 className="min-w-0 truncate text-sm font-bold text-slate-800">{user.name}</h3>
                                            </div>
                                            <span className="shrink-0 rounded bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                                CUS{1000 + (parseInt(user.id) || idx + 1)}
                                            </span>
                                        </div>

                                        <div className="mb-4 flex-1">
                                            <div className="mb-4 flex min-w-0 items-center gap-2 text-xs text-gray-500">
                                                <FiMail size={13} className="shrink-0 text-orange-600" />
                                                <span className="truncate">{user.email}</span>
                                            </div>
                                            <div className="mb-4 flex items-center gap-2 text-xs text-gray-500">
                                                <FiCalendar size={13} className="shrink-0 text-orange-600" />
                                                Joined {user.joined}
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <p className="text-[10px] font-medium text-gray-400">Role</p>
                                                    <p className="mt-0.5 text-xs font-bold capitalize text-gray-800">{user.role || "User"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-medium text-gray-400">Status</p>
                                                    <span className={`mt-0.5 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${user.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}>
                                                        {user.status || "Active"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-auto flex shrink-0 items-center gap-2 border-t border-gray-50 pt-4">
                                            <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-xs text-gray-500">
                                                <FiPhone size={12} className="shrink-0" />
                                                {user.phone || "No phone provided"}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setViewingUser(user)}
                                                aria-label={`View ${user.name}`}
                                                title="View customer"
                                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-orange-700 transition-colors hover:bg-orange-50"
                                            >
                                                <FiEye size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(user)}
                                                aria-label={`Edit ${user.name}`}
                                                title="Edit customer"
                                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-slate-600 transition-colors hover:bg-slate-50"
                                            >
                                                <FiEdit2 size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteUser(user.id)}
                                                aria-label={`Delete ${user.name}`}
                                                title="Delete customer"
                                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-rose-600 transition-colors hover:bg-rose-50"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    </article>
                                    ))
                            )}
                        </div>
                    )}

                    {/* Pagination */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-5 py-4">
                        <p className="text-[13px] font-medium text-slate-500">
                            Showing {filteredUsers.length ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, filteredUsers.length)} of {filteredUsers.length} accounts
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-500">
                                10 per page
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 shadow-sm transition hover:bg-orange-50 disabled:opacity-40"
                                >
                                    &lt;
                                </button>
                                {[...Array(Math.min(pageCount, 3))].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-semibold shadow-sm ${currentPage === i + 1 ? 'border border-orange-600 bg-orange-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-orange-50'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                {pageCount > 3 && <span className="flex h-8 w-8 items-center justify-center text-slate-400">...</span>}
                                {totalPages > 3 && (
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg border text-[13px] font-semibold shadow-sm ${currentPage === totalPages ? "border-orange-600 bg-orange-600 text-white" : "border-slate-200 text-slate-600 hover:bg-orange-50"}`}
                                    >
                                        {totalPages}
                                    </button>
                                )}
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pageCount))}
                                    disabled={currentPage === pageCount}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 shadow-sm transition hover:bg-orange-50 disabled:opacity-40"
                                >
                                    &gt;
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add/Edit User Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                        <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'Update customer' : 'Add customer'}</h2>
                                    <p className="mt-1 text-xs text-slate-500">{isEditing ? `Update account ${editUserId}` : 'Create a customer account'}</p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    aria-label="Close dialog"
                                    className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                >
                                    <FiX className="text-xl" />
                                </button>
                            </div>

                            <div className="space-y-4 overflow-y-auto p-6">
                                <div>
                                    <label className="mb-2 block text-xs font-semibold text-slate-600">Username *</label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        placeholder="e.g. johndoe"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-semibold text-slate-600">Full name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Priya Sharma"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-semibold text-slate-600">Email address *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="priya.sharma@gmail.com"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-semibold text-slate-600">Phone number</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="+91 98765 43210"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                    />
                                </div>
                                {!isEditing && (
                                    <div>
                                        <label className="mb-2 block text-xs font-semibold text-slate-600">Password *</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="••••••••"
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                        />
                                    </div>
                                )}

                            </div>

                            <div className="flex shrink-0 gap-3 border-t border-slate-100 p-6">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveUser}
                                    disabled={submitLoading || !formData.username || !formData.email}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                    {submitLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : isEditing ? 'Update Customer' : 'Register Customer'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {viewingUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                            <div className="flex items-start justify-between border-b border-slate-100 p-6">
                                <div className="flex items-center gap-3">
                                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-orange-50 text-sm font-bold text-orange-700">
                                        {(viewingUser.name || "?").trim().charAt(0).toUpperCase()}
                                        {viewingUser.avatar && <img src={viewingUser.avatar} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(event) => event.currentTarget.remove()} />}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">{viewingUser.name}</h2>
                                        <p className="text-xs text-slate-500">Customer account details</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setViewingUser(null)}
                                    aria-label="Close customer details"
                                    className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                >
                                    <FiX className="text-xl" />
                                </button>
                            </div>
                            <dl className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
                                <div className="min-w-0">
                                    <dt className="text-xs font-medium text-slate-500">Email</dt>
                                    <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{viewingUser.email}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-slate-500">Phone</dt>
                                    <dd className="mt-1 text-sm font-semibold text-slate-800">{viewingUser.phone || "No phone provided"}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-slate-500">Role</dt>
                                    <dd className="mt-1 text-sm font-semibold capitalize text-slate-800">{viewingUser.role || "User"}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-slate-500">Status</dt>
                                    <dd className="mt-1 text-sm font-semibold text-slate-800">{viewingUser.status || "Active"}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs font-medium text-slate-500">Joined</dt>
                                    <dd className="mt-1 text-sm font-semibold text-slate-800">{viewingUser.joined}</dd>
                                </div>
                            </dl>
                            <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        openEditModal(viewingUser);
                                        setViewingUser(null);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                                >
                                    <FiEdit2 size={14} /> Edit customer
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Users;
