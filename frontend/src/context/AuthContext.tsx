import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiClient, setAccessToken, setRefreshToken } from "@/api/client";
import type { User } from "@/types";
import { useToast } from "@/components/common";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  sessionWarning: boolean;
  login: (input: {
    email: string;
    password: string;
    twoFactorCode?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (user: User) => void;
  extendSession: () => void;
}

interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

const USER_STORAGE_KEY = "agrosense:user";
const REFRESH_STORAGE_KEY = "agrosense:refreshToken";
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const SESSION_WARNING_MS = 60 * 1000;
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() =>
    Boolean(window.localStorage.getItem(REFRESH_STORAGE_KEY)),
  );
  const [sessionWarning, setSessionWarning] = useState(false);
  const idleTimer = useRef<number | undefined>(undefined);
  const logoutTimer = useRef<number | undefined>(undefined);
  const resetIdleTimer = useRef<(() => void) | null>(null);

  const persistUser = useCallback((nextUser: User | null) => {
    setUser(nextUser);
    if (nextUser) window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    else window.localStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    setSessionWarning(false);
  }, []);

  const acceptSession = useCallback(
    (session: SessionResponse) => {
      setAccessToken(session.accessToken);
      setRefreshToken(session.refreshToken);
      persistUser(session.user);
    },
    [persistUser],
  );

  const login = useCallback(
    async (input: { email: string; password: string; twoFactorCode?: string }) => {
      const { data } = await apiClient.post<SessionResponse>("/auth/login", input);
      acceptSession(data);
    },
    [acceptSession],
  );

  const refresh = useCallback(async () => {
    const refreshToken = window.localStorage.getItem(REFRESH_STORAGE_KEY);
    if (!refreshToken) throw new Error("La sesión expiró. Inicia sesión nuevamente.");
    const { data } = await apiClient.post<SessionResponse>("/auth/refresh", {
      refreshToken,
    });
    acceptSession(data);
  }, [acceptSession]);

  const logout = useCallback(async () => {
    const refreshToken = window.localStorage.getItem(REFRESH_STORAGE_KEY);
    try {
      if (refreshToken) await apiClient.post("/auth/logout", { refreshToken });
    } catch {
      showToast({
        title: "Sesión cerrada en este dispositivo",
        description: "No se pudo confirmar la revocación de la sesión en el servidor.",
        type: "warning",
      });
    } finally {
      clearSession();
    }
  }, [clearSession, showToast]);

  const extendSession = useCallback(() => {
    resetIdleTimer.current?.();
  }, []);

  const updateUser = useCallback(
    (nextUser: User) => persistUser(nextUser),
    [persistUser],
  );

  useEffect(() => {
    let cancelled = false;
    const storedRefreshToken = window.localStorage.getItem(REFRESH_STORAGE_KEY);

    if (!storedRefreshToken) {
      return;
    }

    setRefreshToken(storedRefreshToken);
    void refresh()
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clearSession, refresh]);

  useEffect(() => {
    function handleUnauthorized() {
      clearSession();
    }
    window.addEventListener("agrosense:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("agrosense:unauthorized", handleUnauthorized);
  }, [clearSession]);

  useEffect(() => {
    if (!user) return;

    function clearTimers() {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      if (logoutTimer.current) window.clearTimeout(logoutTimer.current);
    }

    function handleActivity() {
      clearTimers();
      setSessionWarning(false);
      idleTimer.current = window.setTimeout(() => {
        setSessionWarning(true);
        logoutTimer.current = window.setTimeout(() => {
          void logout();
        }, SESSION_WARNING_MS);
      }, IDLE_TIMEOUT_MS - SESSION_WARNING_MS);
    }
    resetIdleTimer.current = handleActivity;

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
    ];
    activityEvents.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true }),
    );
    handleActivity();
    return () => {
      activityEvents.forEach((event) =>
        window.removeEventListener(event, handleActivity),
      );
      clearTimers();
      resetIdleTimer.current = null;
    };
  }, [logout, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionWarning,
        login,
        logout,
        refresh,
        updateUser,
        extendSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return value;
}
