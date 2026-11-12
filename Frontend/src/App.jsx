import React, { useContext, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Components/CommenComponents/Header";
import Navbar from "./Components/CommenComponents/Navbar";
import Footer from "./Components/CommenComponents/Footer";

import "react-toastify/dist/ReactToastify.css";
import ScrollToTop from "./Components/CommenComponents/ScrollToTop";
import ScrollNavigator from "./Components/CommenComponents/ScrollNavigator";
import Loader from "./Components/CommenComponents/Loader";

function App() {
  const [loading, setLoading] = useState(false);

  if (loading) {
    return <Loader />;
  }

  return (
    <section>
      <Header />
      <Navbar />
      <ScrollToTop/>
      <ScrollNavigator/>
      <Outlet />
      <Footer />
    </section>
  );
}

export default App;

