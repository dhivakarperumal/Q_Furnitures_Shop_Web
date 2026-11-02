import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

function getStoredUser() {
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  if (!token || !storedUser) return null;

  try {
    const user = JSON.parse(storedUser);
    return user && typeof user === "object" && !Array.isArray(user) ? user : null;
  } catch (error) {
    console.error("Stored user session is invalid:", error);
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const [loginOpen, setLoginOpen] = useState(false);
  const loading = false;

  useEffect(() => {
    const syncStoredSession = (event) => {
      if (event.key !== null && event.key !== "user" && event.key !== "token") return;
      setUser(getStoredUser());
    };

    window.addEventListener("storage", syncStoredSession);
    return () => window.removeEventListener("storage", syncStoredSession);
  }, []);

  const login = useCallback((userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setLoginOpen(false);
  }, []);

  const updateUser = useCallback((userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setLoginOpen(false);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }, []);

  // Map user data for Header/Sidebar compatibility
  const profileName = user?.username || user?.name || "Admin";
  const role = user?.role || "admin";
  const email = user?.email || "";
  const phone = user?.phone || "";

  return (
    <AuthContext.Provider
      value={{
        user,
        updateUser,
        login,
        logout,
        loading,
        loginOpen,
        setLoginOpen,
        profileName,
        role,
        email,
        phone
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};