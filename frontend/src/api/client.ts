import axios, { type InternalAxiosRequestConfig } from "axios";

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setRefreshToken(token: string | null): void {
  refreshToken = token;
  if (typeof window !== "undefined") {
    if (token) window.localStorage.setItem("agrosense:refreshToken", token);
    else window.localStorage.removeItem("agrosense:refreshToken");
  }
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

interface RetriableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((request) => {
  if (accessToken) {
    request.headers.Authorization = `Bearer ${accessToken}`;
  }

  return request;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) {
      return Promise.reject(error);
    }

    const request = error.config as RetriableRequest;
    const url = request.url || "";
    if (url.includes("/auth/refresh")) {
      setAccessToken(null);
      setRefreshToken(null);
      window.dispatchEvent(new Event("agrosense:unauthorized"));
      return Promise.reject(error);
    }
    if (
      request._retry ||
      !refreshToken ||
      [
        "/auth/login",
        "/auth/refresh",
        "/auth/forgot-password",
        "/auth/reset-password",
      ].some((path) => url.includes(path))
    ) {
      if (!refreshToken && !url.includes("/auth/login")) {
        setAccessToken(null);
        window.dispatchEvent(new Event("agrosense:unauthorized"));
      }
      return Promise.reject(error);
    }

    request._retry = true;
    refreshPromise ??= axios
      .post<{ accessToken: string; refreshToken: string }>(
        `${apiClient.defaults.baseURL}/auth/refresh`,
        { refreshToken },
        { headers: { "Content-Type": "application/json" } },
      )
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        return data.accessToken;
      })
      .catch(() => {
        setAccessToken(null);
        setRefreshToken(null);
        window.dispatchEvent(new Event("agrosense:unauthorized"));
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });

    const renewedToken = await refreshPromise;
    if (!renewedToken) return Promise.reject(error);
    request.headers.Authorization = `Bearer ${renewedToken}`;
    return apiClient(request);
  },
);
