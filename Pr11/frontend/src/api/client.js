import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

function dispatchAuthLogout() {
  window.dispatchEvent(new Event("auth:logout"));
}

export const tokenStorage = {
  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setTokens(tokens) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

const defaultHeaders = {
  "Content-Type": "application/json",
  accept: "application/json",
};

const apiClient = axios.create({
  baseURL: API_URL,
  headers: defaultHeaders,
});

const refreshClient = axios.create({
  baseURL: API_URL,
  headers: defaultHeaders,
});

let refreshPromise = null;

apiClient.interceptors.request.use((config) => {
  const accessToken = tokenStorage.getAccessToken();

  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const originalUrl = originalRequest?.url || "";

    const isAuthEndpoint =
      originalUrl.includes("/api/auth/login") ||
      originalUrl.includes("/api/auth/register") ||
      originalUrl.includes("/api/auth/refresh");

    if (status !== 401 || !originalRequest || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    const accessToken = tokenStorage.getAccessToken();
    const refreshToken = tokenStorage.getRefreshToken();

    if (!accessToken || !refreshToken) {
      tokenStorage.clear();
      dispatchAuthLogout();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshClient
          .post("/api/auth/refresh", null, {
            headers: {
              "x-refresh-token": refreshToken,
            },
          })
          .then((response) => {
            tokenStorage.setTokens(response.data);
            return response.data;
          })
          .catch((refreshError) => {
            tokenStorage.clear();
            dispatchAuthLogout();
            throw refreshError;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newTokens = await refreshPromise;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);

export default apiClient;
