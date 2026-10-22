import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Sprout } from "lucide-react";
import { AuthLayout } from "@/components/layout/layout";
import { Button, FormField, Input } from "@/components/common";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/api/client";

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

export function LoginPage() {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from
    ?.pathname;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email, password, ...(twoFactorCode ? { twoFactorCode } : {}) });
      navigate(from || "/dashboard", { replace: true });
    } catch (submissionError) {
      setError(getErrorMessage(submissionError, "No se pudo iniciar sesión."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
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
        Ingresa para monitorear las condiciones de tu terreno.
      </p>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}
      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <FormField label="Correo electrónico" htmlFor="login-email">
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@correo.com"
          />
        </FormField>
        <FormField label="Contraseña" htmlFor="login-password">
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="pr-11"
              placeholder="Tu contraseña"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute inset-y-0 right-0 grid w-10 place-items-center text-text-muted hover:text-primary-700"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="size-4" />
              ) : (
                <Eye aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
        </FormField>
        <FormField label="Código de autenticación (si tienes 2FA)" htmlFor="login-2fa">
          <Input
            id="login-2fa"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={twoFactorCode}
            onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, ""))}
            placeholder="000000"
          />
        </FormField>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-text-secondary">
            <input type="checkbox" className="accent-primary-700" />
            Recordarme
          </label>
          <Link
            to="/forgot-password"
            className="font-medium text-primary-700 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={loading}>
          Iniciar sesión
        </Button>
      </form>
      <div className="mt-8 rounded-md bg-elevated p-3 text-xs text-text-secondary">
        <p className="font-semibold text-text-primary">Cuentas de demostración</p>
        <p className="mt-1">
          admin@agrosense.local · operador@agrosense.local · consulta@agrosense.local
        </p>
        <p className="mt-1">
          Usa la contraseña configurada como DEMO_SEED_PASSWORD en .env.
        </p>
      </div>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const { data } = await apiClient.post("/auth/forgot-password", { email });
      setMessage(data.message);
    } catch (submissionError) {
      setError(getErrorMessage(submissionError, "No se pudo solicitar la recuperación."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <Link
        to="/login"
        className="mb-8 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-700"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver al inicio de sesión
      </Link>
      <div className="mb-6 grid size-12 place-items-center rounded-md bg-primary-100 text-primary-700">
        <Sprout aria-hidden="true" className="size-6" />
      </div>
      <h1 className="font-display text-3xl font-bold text-text-primary">
        Recuperar contraseña
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Te enviaremos un enlace para crear una nueva contraseña.
      </p>
      {message && (
        <p
          role="status"
          className="mt-5 rounded-md bg-primary-100 p-3 text-sm text-primary-900"
        >
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-5 rounded-md bg-red-50 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <FormField label="Correo electrónico" htmlFor="forgot-email">
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@correo.com"
          />
        </FormField>
        <Button type="submit" className="w-full" loading={loading}>
          Enviar instrucciones
        </Button>
      </form>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 12) {
      setError("La contraseña debe tener al menos 12 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.post("/auth/reset-password", {
        token,
        newPassword: password,
      });
      setMessage(data.message);
      window.setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (submissionError) {
      setError(getErrorMessage(submissionError, "No se pudo restablecer la contraseña."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <Link
        to="/login"
        className="mb-8 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-700"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver al inicio de sesión
      </Link>
      <div className="mb-6 grid size-12 place-items-center rounded-md bg-primary-100 text-primary-700">
        <LockKeyhole aria-hidden="true" className="size-6" />
      </div>
      <h1 className="font-display text-3xl font-bold text-text-primary">
        Crear nueva contraseña
      </h1>
      {message && (
        <p
          role="status"
          className="mt-4 rounded-md bg-primary-100 p-3 text-sm text-primary-900"
        >
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <FormField
          label="Nueva contraseña"
          htmlFor="reset-password"
          hint="Usa al menos 12 caracteres."
        >
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </FormField>
        <FormField label="Confirmar contraseña" htmlFor="reset-confirmation">
          <Input
            id="reset-confirmation"
            type="password"
            autoComplete="new-password"
            required
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </FormField>
        <Button type="submit" className="w-full" loading={loading} disabled={!token}>
          Guardar contraseña
        </Button>
        {!token && (
          <p role="alert" className="text-sm text-danger">
            El enlace de recuperación no contiene un token.
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
