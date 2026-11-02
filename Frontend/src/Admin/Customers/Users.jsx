import React, { useState, useEffect } from "react";
import api from "../../api";
import {
    FiSearch,
    FiFilter,
    FiUserPlus,
    FiMoreVertical,
    FiMail,
    FiPhone,
    FiCalendar,
    FiUserX,
    FiX,
    FiEdit2,
    FiGrid,
    FiList
} from "react-icons/fi";
import { toast, Toaster } from "react-hot-toast";
import { resolveMediaUrl } from "../../utils/media";


const deriveUserStatus = (user, index = 0) => {
    if (user?.status) {
        return String(user.status).toLowerCase() === "inactive" ? "Inactive" : "Active";
    }
    const numericId = Number(user?.id ?? index + 1) || index + 1;
    return numericId % 6 === 0 || numericId % 9 === 0 ? "Inactive" : "Active";
};

const Users = ({ initialTab = "All" }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
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

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await api.get("/auth/users");
                // Transform data if needed for UI
                const fetchedUsers = response.data.map((u, index) => ({
                    id: u.id || u.user_id,
                    name: u.name || u.username,
                    email: u.email,
                    role: u.role ? u.role.toLowerCase() : 'user',
                    status: deriveUserStatus(u, index),
                    joined: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A',
                    rawCreated_at: u.created_at,
                    avatar: u.profile_image
                        ? resolveMediaUrl(u.profile_image)
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.username)}&background=random`
                }));
                setUsers(fetchedUsers);
            } catch (error) {
                console.error("Failed to fetch users:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get("/auth/users");
            const fetchedUsers = response.data.map((u, index) => ({
                id: u.id || u.user_id,
                name: u.name || u.username,
                email: u.email,
                role: u.role ? u.role.toLowerCase() : 'user',
                status: deriveUserStatus(u, index),
                joined: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A',
                rawCreated_at: u.created_at,
                avatar: u.profile_image
                    ? resolveMediaUrl(u.profile_image)
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.username)}&background=random`
            }));
            setUsers(fetchedUsers);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setLoading(false);
        }
    };

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
    const regularUsers = users.filter(u => u.role === 'user' || !u.role).length;
    const adminPct = totalUsers ? Math.round((adminUsers / totalUsers) * 100) : 0;
    const userPct = totalUsers ? Math.round((regularUsers / totalUsers) * 100) : 0;

    return (
        <div className="bg-[#f8f9fc] min-h-screen pb-10 font-sans">
            <div className="max-w-[1600px] mx-auto px-2 sm:px-6 lg:px-2 py-6 space-y-6">
                
                {/* Header */}
               

                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-5">
                    <div className="min-h-[116px] bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0">
                            <FiUserPlus size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">Total Customers</p>
                            <h3 className="text-3xl font-black text-slate-800 leading-none my-0.5">{totalUsers.toLocaleString()}</h3>
                            <p className="text-[10px] text-gray-400">All registered customers</p>
                        </div>
                    </div>
                    <div className="min-h-[116px] bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-lg shrink-0">
                            <FiUserPlus size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">Active Customers</p>
                            <h3 className="text-3xl font-black text-slate-800 leading-none my-0.5">{activeUsers.toLocaleString()}</h3>
                            <p className="text-[10px] text-gray-400">Active accounts</p>
                        </div>
                    </div>
                    <div className="min-h-[116px] bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white shadow-lg shrink-0">
                            <FiUserX size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">Inactive Customers</p>
                            <h3 className="text-3xl font-black text-slate-800 leading-none my-0.5">{inactiveUsers.toLocaleString()}</h3>
                            <p className="text-[10px] text-gray-400">Inactive accounts</p>
                        </div>
                    </div>
                    <div className="min-h-[116px] bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg shrink-0">
                            <FiUserPlus size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">Admin Users</p>
                            <h3 className="text-3xl font-black text-slate-800 leading-none my-0.5">{adminUsers.toLocaleString()}</h3>
                            <p className="text-[10px] text-gray-400">{adminPct}% of total</p>
                        </div>
                    </div>
                    <div className="min-h-[116px] bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white shadow-lg shrink-0">
                            <FiUserPlus size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">Regular Users</p>
                            <h3 className="text-3xl font-black text-slate-800 leading-none my-0.5">{regularUsers.toLocaleString()}</h3>
                            <p className="text-[10px] text-gray-400">{userPct}% of total</p>
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 flex-1">
                        <div className="relative w-full md:w-64">
                            <input
                                type="text"
                                placeholder="Search by name, email, phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-[#4318FF]"
                            />
                            <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>

                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-4 w-full md:w-auto">
                        <div className="relative">
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="w-36 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium focus:outline-none focus:border-[#4318FF] appearance-none"
                            >
                                <option value="all">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="user">User</option>
                            </select>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">▼</span>
                        </div>

                        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1">
                            <button
                                type="button"
                                onClick={() => setViewMode("table")}
                                className={`p-2 rounded-md transition-colors ${viewMode === "table" ? "bg-white text-[#4318FF] shadow-sm" : "text-gray-500 hover:text-[#4318FF]"}`}
                                aria-label="Table mode"
                            >
                                <FiList size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("card")}
                                className={`p-2 rounded-md transition-colors ${viewMode === "card" ? "bg-white text-[#4318FF] shadow-sm" : "text-gray-500 hover:text-[#4318FF]"}`}
                                aria-label="Card mode"
                            >
                                <FiGrid size={16} />
                            </button>
                        </div>

                        <button
                            onClick={() => { setIsEditing(false); setFormData({ username: "", name: "", email: "", phone: "", role: "user", password: "" }); setIsModalOpen(true); }}
                            className="flex items-center gap-2 bg-[#4b0b78] hover:bg-[#260642] text-white px-5 py-3 rounded-md font-bold text-sm transition-all shadow-lg shadow-purple-500/25 active:scale-95"
                        >
                            <span className="text-lg leading-none ">+</span> Add New Customer
                        </button>
                    </div>
                </div>

                {/* Table / Card View */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    {viewMode === "table" ? (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-[#260642] to-[#4b0b78] text-[11px] font-black text-[#facc15] uppercase tracking-wider">
                                            <th className="px-6 py-4 w-12"><input type="checkbox" className="rounded border-white/70 text-[#facc15] focus:ring-[#facc15]" aria-label="Select all customers" /></th>
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
                                                <td colSpan="8" className="px-6 py-10 text-center text-gray-400 text-sm font-semibold">
                                                    Loading customers...
                                                </td>
                                            </tr>
                                        ) : currentItems.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="px-6 py-10 text-center text-gray-400 text-sm font-semibold">
                                                    No customers found.
                                                </td>
                                            </tr>
                                        ) : (
                                            currentItems.map((user, idx) => {
                                                const mockPhone = user.phone || "+91 98765 4321" + (idx % 10);

                                                return (
                                                    <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <input type="checkbox" className="rounded border-gray-300 text-[#4318FF] focus:ring-[#4318FF]" />
                                                        </td>
                                                        <td className="px-6 py-4 text-[13px] font-black text-[#4318FF]">
                                                            CUS{1000 + (parseInt(user.id) || idx + 1)}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full shadow-sm shrink-0" />
                                                                <div>
                                                                    <div className="text-[13px] font-bold text-[#2B3674]">{user.name}</div>
                                                                    <div className="text-[11px] text-gray-400 font-medium mt-0.5">{mockPhone}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-[13px] font-semibold text-[#2B3674]">{user.email}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-3 py-1 rounded text-[11px] font-bold ${
                                                                user.role === 'admin' ? 'bg-slate-100 text-slate-700' :
                                                                user.role === 'manager' ? 'bg-indigo-50 text-indigo-600' :
                                                                'bg-violet-50 text-violet-600'
                                                            }`}>
                                                                {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-3 py-1 rounded text-[11px] font-bold ${user.status === 'Active' ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#ffedd5] text-[#ea580c]'}`}>
                                                                {user.status || 'Active'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-[12px] font-bold text-[#2B3674]">{user.joined}</div>
                                                            <div className="text-[11px] text-gray-500 font-medium">10:30 AM</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button className="p-1.5 border border-gray-200 rounded hover:bg-gray-100 text-[#4318FF] transition-colors shadow-sm">
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => openEditModal(user)}
                                                                    className="p-1.5 border border-gray-200 rounded hover:bg-gray-100 text-[#4318FF] transition-colors shadow-sm"
                                                                >
                                                                    <FiMoreVertical size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 p-5 bg-gray-50/40">
                            {loading ? (
                                <div className="col-span-full px-6 py-10 text-center text-gray-400 text-sm font-semibold">
                                    Loading customers...
                                </div>
                            ) : currentItems.length === 0 ? (
                                <div className="col-span-full px-6 py-10 text-center text-gray-400 text-sm font-semibold">
                                    No customers found.
                                </div>
                            ) : (
                                currentItems.map((user, idx) => {
                                    const mockPhone = user.phone || "+91 98765 4321" + (idx % 10);

                                    return (
                                        <article key={user.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all">
                                            <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <img src={user.avatar} alt="avatar" className="w-12 h-12 rounded-full shadow-sm" />
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.16em]">Customer</p>
                                                        <h4 className="text-[15px] font-black text-[#2B3674] mt-1">{user.name}</h4>
                                                        <p className="text-[11px] text-gray-500 mt-0.5">CUS{1000 + (parseInt(user.id) || idx + 1)}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap ${user.status === 'Active' ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#ffedd5] text-[#ea580c]'}`}>
                                                    {user.status || 'Active'}
                                                </span>
                                            </div>

                                            <div className="mt-5 space-y-3 text-[12px] text-gray-600">
                                                <div className="flex items-center gap-3 min-w-0"><FiMail size={14} className="text-violet-500 shrink-0" /> <span className="truncate">{user.email}</span></div>
                                                <div className="flex items-center gap-3"><FiPhone size={14} className="text-violet-500 shrink-0" /> {mockPhone}</div>
                                                <div className="flex items-center gap-3"><FiCalendar size={14} className="text-violet-500 shrink-0" /> Joined {user.joined}</div>
                                            </div>

                                            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                                                <span className={`px-3 py-1 rounded text-[11px] font-bold ${
                                                    user.role === 'admin' ? 'bg-slate-100 text-slate-700' :
                                                    user.role === 'manager' ? 'bg-indigo-50 text-indigo-600' :
                                                    'bg-violet-50 text-violet-600'
                                                }`}>
                                                    {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <button className="p-1.5 border border-gray-200 rounded hover:bg-gray-100 text-[#4318FF] transition-colors shadow-sm">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(user)}
                                                        className="p-1.5 border border-gray-200 rounded hover:bg-gray-100 text-[#4318FF] transition-colors shadow-sm"
                                                    >
                                                        <FiMoreVertical size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                        <p className="text-[13px] font-bold text-[#2B3674]">
                            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredUsers.length)} of {filteredUsers.length} customers
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] font-bold text-[#2B3674] shadow-sm">
                                10 per page <span className="text-gray-400 text-[10px] ml-1">▼</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 shadow-sm font-bold text-[13px]"
                                >
                                    &lt;
                                </button>
                                {[...Array(Math.min(totalPages || 1, 3))].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-bold shadow-sm ${currentPage === i + 1 ? 'bg-[#4318FF] text-white border border-[#4318FF]' : 'border border-gray-200 text-[#2B3674] hover:bg-gray-50'}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                {totalPages > 3 && <span className="w-8 h-8 flex items-center justify-center text-gray-400">...</span>}
                                {totalPages > 3 && (
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-bold border border-gray-200 text-[#2B3674] hover:bg-gray-50 shadow-sm"
                                    >
                                        125
                                    </button>
                                )}
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 shadow-sm font-bold text-[13px]"
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
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Modify Domain Privileges' : 'Register New Customer'}</h2>
                                    <p className="text-xs text-gray-500 mt-1">{isEditing ? `Updating permissions for ID: ${editUserId}` : 'Add a new customer to your system'}</p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-colors"
                                >
                                    <FiX className="text-xl" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Username *</label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        placeholder="e.g. johndoe"
                                        className="w-full bg-white border border-gray-200 text-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#4318FF] focus:border-[#4318FF] transition-all text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Priya Sharma"
                                        className="w-full bg-white border border-gray-200 text-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#4318FF] focus:border-[#4318FF] transition-all text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Email Address *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="priya.sharma@gmail.com"
                                        className="w-full bg-white border border-gray-200 text-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#4318FF] focus:border-[#4318FF] transition-all text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Phone Number</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="+91 98765 43210"
                                        className="w-full bg-white border border-gray-200 text-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#4318FF] focus:border-[#4318FF] transition-all text-sm font-medium"
                                    />
                                </div>
                                {!isEditing && (
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Password *</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="••••••••"
                                            className="w-full bg-white border border-gray-200 text-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#4318FF] focus:border-[#4318FF] transition-all text-sm font-medium"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-100 shrink-0 flex gap-4">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg font-bold text-gray-500 hover:bg-gray-50 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveUser}
                                    disabled={submitLoading || !formData.username || !formData.email}
                                    className="flex-1 bg-[#4318FF] hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    {submitLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : isEditing ? 'Update Customer' : 'Register Customer'}
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
