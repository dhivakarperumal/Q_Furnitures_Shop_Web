import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./PrivateRouter/AuthContext.jsx";
import { StoreProvider } from "./PrivateRouter/StoreContext.jsx";
import PrivateRoute from "./PrivateRouter/PrivateRouter.jsx";
import { AdminProvider } from "./PrivateRouter/AdminContext.jsx";
import { Toaster } from "react-hot-toast";
import Loader from "./Components/CommenComponents/Loader.jsx";

// Lazy Load Main Components
const Home = React.lazy(() => import("./Components/Home/Home.jsx"));

const Login = React.lazy(() => import("./Components/Auth/Login.jsx"));
const Register = React.lazy(() => import("./Components/Auth/Register.jsx"));

// Lazy Load Admin Components
const AdminPanel = React.lazy(() => import("./Admin/AdminPanel.jsx"));
const Dashboard = React.lazy(() => import("./Admin/Dashboard.jsx"));
const Category = React.lazy(() => import("./Admin/Categories/Category.jsx"));
const AllProducts = React.lazy(() => import("./Admin/Products/AllProducts.jsx"));
const AddProducts = React.lazy(() => import("./Admin/Products/AddProducts.jsx"));
const ProductDetail = React.lazy(() => import("./Admin/Products/ProductDetail.jsx"));
const Users = React.lazy(() => import("./Admin/Customers/Users.jsx"));
const Billing = React.lazy(() => import("./Admin/Billings/Billing.jsx"));
const CreateOrder = React.lazy(() => import("./Admin/Billings/CreateOrder.jsx"));
const OrderDetail = React.lazy(() => import("./Admin/Orders/OrderDetail.jsx"));
const Banners = React.lazy(() => import("./Admin/Banners/Banners.jsx"));
const Reviews = React.lazy(() => import("./Admin/Reviews/Reviews.jsx"));
const YoutubeVideos = React.lazy(() => import("./Admin/Videos/YoutubeVideos.jsx"));
const Coupons = React.lazy(() => import("./Admin/Marketing/Coupons.jsx"));
const Offers = React.lazy(() => import("./Admin/Marketing/Offers.jsx"));
const StockDetails = React.lazy(() => import("./Admin/Stocks/StockDetails.jsx"));
const AddStock = React.lazy(() => import("./Admin/Stocks/AddStock.jsx"));
const Dealers = React.lazy(() => import("./Admin/Dealers/Dealers.jsx"));
const AddInvoice = React.lazy(() => import("./Admin/Dealers/AddInvoice.jsx"));
const StockMovementHistory = React.lazy(() => import("./Admin/Stocks/StockMovementHistory.jsx"));
const SettingsPage = React.lazy(() => import("./Admin/Settings/Settings.jsx"));
const Profile = React.lazy(() => import("./Admin/Settings/Profile.jsx"));

const ErrorPage = React.lazy(() => import("./Admin/Pages/ErrorPage.jsx"));

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <Home /> },
      

    ],
  },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    path: "/admin",
    element: (
      <PrivateRoute allowedRoles={["admin"]}>
        <AdminProvider>
          <AdminPanel />
        </AdminProvider>
      </PrivateRoute>
    ),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "products/category", element: <Category /> },
      { path: "products/all", element: <AllProducts /> },
      { path: "products/add", element: <AddProducts /> },
      { path: "products/stock", element: <StockDetails /> },
      { path: "products/stock/add", element: <AddStock /> },
      { path: "products/:id", element: <ProductDetail /> },
      { path: "products/edit/:id", element: <AddProducts /> },
      { path: "products/stock/movements", element: <StockMovementHistory /> },
      { path: "users/all", element: <Users /> },
      { path: "banners", element: <Banners /> },
      { path: "reviews", element: <Reviews /> },
      { path: "videos", element: <YoutubeVideos /> },
      { path: "coupons", element: <Coupons /> },
      { path: "offers", element: <Offers /> },
      { path: "orders/billing", element: <Billing /> },
      { path: "orders/shop-create", element: <CreateOrder /> },
      { path: "orders/:id", element: <OrderDetail /> },
      { path: "dealers", element: <Dealers /> },
      { path: "invoices/add", element: <AddInvoice /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "profile", element: <Profile /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <AuthProvider>
      <StoreProvider>
        <Toaster position="top-left" reverseOrder={false} />
        <React.Suspense fallback={<Loader />}>
          <RouterProvider router={router} />
        </React.Suspense>
      </StoreProvider>
    </AuthProvider>
  </GoogleOAuthProvider>
);
