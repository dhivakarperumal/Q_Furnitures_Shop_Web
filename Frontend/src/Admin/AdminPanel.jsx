import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const AdminLayout = () => {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [shopProductSearchState, setShopProductSearchState] = useState({ pathname: "", query: "" });
    const [isLargeScreen, setIsLargeScreen] = useState(
        window.innerWidth >= 1024
    );
    const isShopCreatePage = location.pathname === "/admin/orders/shop-create";
    const isSidebarVisible = sidebarOpen || (isLargeScreen && !isShopCreatePage);
    const shopProductSearch = shopProductSearchState.pathname === location.pathname
        ? shopProductSearchState.query
        : "";
    const handleShopProductSearch = (query) => {
        setShopProductSearchState({ pathname: location.pathname, query });
    };

    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

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
            className={`admin-root flex ${isShopCreatePage ? "h-screen overflow-hidden" : "min-h-screen"} bg-cover bg-center bg-no-repeat text-slate-900`}
            style={{ backgroundImage: "url('/images/admincontent.png')" }}
        >

            {/* Sidebar */}
            <Sidebar
                isOpen={isSidebarVisible}
                onClose={() => setSidebarOpen(false)}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            {/* Main Content */}
            <div
                className={`
          flex flex-col flex-1 min-w-0
          ${isShopCreatePage ? "h-screen min-h-0 overflow-hidden" : "min-h-screen"}
          transition-all duration-300 ease-in-out
          ${isLargeScreen && isSidebarVisible ? (sidebarCollapsed ? "lg:ml-20" : "lg:ml-[19rem]") : ""}
        `}
            >
                {/* Header */}
                <Header
                    onMenuClick={() => setSidebarOpen(true)}
                    onSearchQueryChange={handleShopProductSearch}
                />

                {/* Page Content */}
                <main className={`${isShopCreatePage ? "flex min-h-0 flex-1 flex-col overflow-hidden p-1" : "flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6"} bg-transparent`}>
                    <div className={`glass-container ${isShopCreatePage ? "flex min-h-0 flex-1 flex-col" : ""}`}>
                        <Outlet context={{ shopProductSearch }} />
                    </div>
                </main>

                {/* Footer */}
                {!isShopCreatePage && (
                    <footer className="glass-footer mt-10 border-t border-slate-200 bg-transparent px-4 py-4 text-center text-xs font-medium text-slate-600">
                        © {new Date().getFullYear()} Q-Techx Solutions. All rights reserved.
                    </footer>
                )}

            </div>
        </div>
    );
};

export default AdminLayout;
