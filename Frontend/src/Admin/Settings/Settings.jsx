import React from "react";
import {
    FiSettings,
    FiGlobe,
    FiBell,
    FiLock,
    FiDatabase,
    FiShield,
    FiUsers,
    FiCheck
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";

const Settings = () => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">System Preferences</h1>
                <p className="text-sm text-gray-500 font-medium mt-1">Configure your Q Furnitures administration experience</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Navigation Menu */}
                <div className="lg:col-span-1 space-y-2">
                    {[
                        { label: "General Settings", icon: <FiSettings />, active: true },
                        { label: "Notifications", icon: <FiBell />, active: false },
                        { label: "Security & Access", icon: <FiShield />, active: false },
                        { label: "Regional & Language", icon: <FiGlobe />, active: false },
                        { label: "Payment Gateways", icon: <FaRupeeSign />, active: false },
                        { label: "Team Management", icon: <FiUsers />, active: false },
                        { label: "Data & Backup", icon: <FiDatabase />, active: false },
                    ].map((item, i) => (
                        <button key={i} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${item.active ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-slate-800 border border-gray-100'}`}>
                            <span className="text-xl">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 mb-6 border-b border-gray-50 pb-4">General Configuration</h3>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-widest pl-1">Store Name</label>
                                        <input type="text" defaultValue="Q Furnitures" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all font-semibold text-slate-700 shadow-inner" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-gray-400 tracking-widest pl-1">Store Email</label>
                                        <input type="email" defaultValue="admin@emart.com" className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all font-semibold text-slate-700 shadow-inner" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-widest pl-1">Maintenance Mode</label>
                                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out">
                                            <span className="pointer-events-none inline-block h-5 w-5 translate-x-0 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">Disable customer access</p>
                                            <p className="text-xs text-gray-400 mt-0.5">Your store will be inaccessible while editing.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-400 tracking-widest pl-1">Automatic Updates</label>
                                    <div className="flex items-center gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                        <div className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-blue-600 transition-colors duration-200 ease-in-out">
                                            <span className="pointer-events-none inline-block h-5 w-5 translate-x-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-blue-800">Enabled</p>
                                            <p className="text-xs text-blue-500 mt-0.5 font-medium">Keep system up-to-date with latest security patches.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-50">
                            <button className="px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl font-bold transition-all">Cancel Changes</button>
                            <button className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-100">
                                <FiCheck /> Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
