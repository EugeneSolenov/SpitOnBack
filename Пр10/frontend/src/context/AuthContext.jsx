import { createContext, useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import apiClient, { tokenStorage } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      const accessToken = tokenStorage.getAccessToken();
      const refreshToken = tokenStorage.getRefreshToken();

      if (!accessToken && !refreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiClient.get("/api/auth/me");
        setUser(response.data);
      } catch (error) {
        tokenStorage.clear();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    function handleLogout() {
      tokenStorage.clear();
      setUser(null);
      if (!location.pathname.startsWith("/login") && !location.pathname.startsWith("/register")) {
        navigate("/login", { replace: true });
      }
    }

    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, [location.pathname, navigate]);

  async function login(credentials) {
    const response = await apiClient.post("/api/auth/login", credentials);
    tokenStorage.setTokens(response.data);
    const meResponse = await apiClient.get("/api/auth/me");
    setUser(meResponse.data);
    return meResponse.data;
  }

  async function register(credentials) {
    await apiClient.post("/api/auth/register", credentials);
    return login(credentials);
  }

  async function refreshProfile() {
    const response = await apiClient.get("/api/auth/me");
    setUser(response.data);
    return response.data;
  }

  function logout() {
    tokenStorage.clear();
    setUser(null);
    navigate("/login", { replace: true });
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        register,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
