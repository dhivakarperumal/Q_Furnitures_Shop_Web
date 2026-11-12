import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const AdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isLargeScreen, setIsLargeScreen] = useState(
        window.innerWidth >= 1024
    );

    useEffect(() => {
        const handleResize = () => {
            const isLg = window.innerWidth >= 1024;
            setIsLargeScreen(isLg);
            if (isLg) setSidebarOpen(false);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <div
            className="admin-root flex min-h-screen bg-cover bg-center bg-no-repeat text-slate-900"
            style={{ backgroundImage: "url('/images/admincontent.png')" }}
        >

            {/* Sidebar */}
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            {/* Main Content */}
            <div
                className={`
          flex flex-col flex-1 min-w-0 min-h-screen
          transition-all duration-300 ease-in-out
          ${isLargeScreen ? (sidebarCollapsed ? "lg:ml-20" : "lg:ml-72") : ""}
        `}
            >
                {/* Header */}
                <Header onMenuClick={() => setSidebarOpen(true)} />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-5 lg:p-6">
                    <div className="glass-container">
                        <Outlet />
                    </div>
                </main>

                {/* Footer */}
                <footer className="glass-footer mt-10 border-t border-slate-200 bg-transparent px-4 py-4 text-center text-xs font-medium text-slate-600">
                    © {new Date().getFullYear()} Q-Techx Solutions. All rights reserved.
                </footer>

            </div>
        </div>
    );
};

export default AdminLayout;
