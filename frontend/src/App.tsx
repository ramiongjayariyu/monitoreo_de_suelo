import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { AppLayout, AuthLayout } from "@/components/layout/layout";
import {
  Button,
  FormField,
  Input,
  Modal,
  ToastProvider,
  useToast,
} from "@/components/common";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { RoleRoute } from "@/routes/RoleRoute";
import { ComponentsDemoPage } from "@/pages/components-demo";
import { LoginPage, ForgotPasswordPage, ResetPasswordPage } from "@/pages/auth-pages";
import { ProfilePage } from "@/pages/profile-page";
import { UsersPage } from "@/pages/users-page";
import { NodesPage } from "@/pages/nodes-page";
import { CropsPage } from "@/pages/crops-page";
import { StatesPage } from "@/pages/states-page";
import { AlertsPage } from "@/pages/alerts-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { MapPage } from "@/pages/map-page";
import { HistoryPage } from "@/pages/history-page";
import { ReportsPage } from "@/pages/reports-page";
import { SettingsPage } from "@/pages/settings-page";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function AuthPreviewPage() {
  return (
    <AuthLayout>
      <Link
        to="/dev/components"
        className="mb-8 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-700"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver a los componentes
      </Link>
      <div className="mb-7 lg:hidden">
        <p className="font-display text-xl font-bold text-primary-900">AgroSense</p>
      </div>
      <div className="mb-7 grid size-12 place-items-center rounded-md bg-primary-100 text-primary-700">
        <LockKeyhole aria-hidden="true" className="size-6" />
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary">
        Bienvenido a AgroSense
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Ingresa a tu cuenta para monitorear tu terreno.
      </p>
      <form className="mt-7 space-y-5" onSubmit={(event) => event.preventDefault()}>
        <FormField label="Correo electrónico" htmlFor="preview-email">
          <Input
            id="preview-email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
          />
        </FormField>
        <FormField label="Contraseña" htmlFor="preview-password">
          <Input
            id="preview-password"
            type="password"
            autoComplete="current-password"
            placeholder="Tu contraseña"
          />
        </FormField>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-text-secondary">
            <input type="checkbox" className="accent-primary-700" />
            Recordarme
          </label>
          <button type="button" className="font-medium text-primary-700 hover:underline">
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        <Button type="submit" className="w-full">
          Iniciar sesión
        </Button>
      </form>
    </AuthLayout>
  );
}

function SessionWarning() {
  const { sessionWarning, extendSession, refresh, logout } = useAuth();
  const { showToast } = useToast();

  async function continueSession() {
    try {
      await refresh();
      extendSession();
    } catch {
      await logout();
      showToast({
        title: "La sesión expiró",
        description: "Inicia sesión nuevamente.",
        type: "warning",
      });
    }
  }

  return (
    <Modal
      open={sessionWarning}
      onClose={() => void logout()}
      title="Tu sesión está por expirar"
      description="Por seguridad, se cerrará después de un periodo de inactividad."
    >
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => void logout()}>
          Cerrar sesión
        </Button>
        <Button onClick={() => void continueSession()}>Seguir conectado</Button>
      </div>
    </Modal>
  );
}

function ApplicationRoutes() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/dev/auth-preview" element={<AuthPreviewPage />} />
        <Route
          path="/dev/components"
          element={
            <AppLayout>
              <ComponentsDemoPage />
            </AppLayout>
          }
        />
        <Route element={<ProtectedRoute />}>
          <Route
            element={
              <AppLayout>
                <Outlet />
              </AppLayout>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/nodes" element={<NodesPage />} />
            <Route path="/crops" element={<CropsPage />} />
            <Route path="/crops/:id/states" element={<StatesPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route element={<RoleRoute roles={["ADMIN"]} />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <SessionWarning />
    </>
  );
}

function App() {
  return (
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <ApplicationRoutes />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ToastProvider>
  );
}

export default App;
