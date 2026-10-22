import { useState, type FormEvent } from "react";
import axios from "axios";
import { ShieldCheck, UserRound } from "lucide-react";
import { apiClient } from "@/api/client";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  FormField,
  Input,
  PageHeader,
  useToast,
} from "@/components/common";
import { useAuth } from "@/context/AuthContext";

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
    return error.response.data.message;
  }
  return "No se pudo completar la operación.";
}

export function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const { showToast } = useToast();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const twoFactorEnabled = Boolean(user?.twoFactorEnabled);
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    secret: string;
    qrCodeDataUrl: string;
  } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");
  const [savingTwoFactor, setSavingTwoFactor] = useState(false);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError("");
    const form = new FormData(event.currentTarget);
    try {
      const { data } = await apiClient.patch("/auth/profile", {
        name: String(form.get("name")),
        email: String(form.get("email")),
      });
      updateUser(data.user);
      showToast({ title: "Perfil actualizado", type: "success" });
    } catch (error) {
      setProfileError(errorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    if (newPassword.length < 12) {
      setPasswordError("La nueva contraseña debe tener al menos 12 caracteres.");
      return;
    }
    if (newPassword !== confirmation) {
      setPasswordError("Las contraseñas nuevas no coinciden.");
      return;
    }
    setSavingPassword(true);
    try {
      await apiClient.post("/auth/change-password", { currentPassword, newPassword });
      showToast({
        title: "Contraseña actualizada",
        description: "Inicia sesión con tu nueva contraseña.",
        type: "success",
      });
      await logout();
    } catch (error) {
      setPasswordError(errorMessage(error));
    } finally {
      setSavingPassword(false);
    }
  }

  async function startTwoFactor() {
    setTwoFactorError("");
    setSavingTwoFactor(true);
    try {
      const { data } = await apiClient.post("/auth/2fa/setup");
      setTwoFactorSetup(data);
    } catch (error) {
      setTwoFactorError(errorMessage(error));
    } finally {
      setSavingTwoFactor(false);
    }
  }

  async function confirmTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTwoFactorError("");
    setSavingTwoFactor(true);
    try {
      await apiClient.post("/auth/2fa/verify", { token: twoFactorCode });
      setTwoFactorSetup(null);
      setTwoFactorCode("");
      if (user) updateUser({ ...user, twoFactorEnabled: true });
      showToast({ title: "Autenticación de dos factores activada", type: "success" });
    } catch (error) {
      setTwoFactorError(errorMessage(error));
    } finally {
      setSavingTwoFactor(false);
    }
  }

  async function disableTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTwoFactorError("");
    setSavingTwoFactor(true);
    try {
      await apiClient.post("/auth/2fa/disable", {
        password: twoFactorPassword,
        token: twoFactorCode,
      });
      setTwoFactorPassword("");
      setTwoFactorCode("");
      if (user) updateUser({ ...user, twoFactorEnabled: false });
      showToast({ title: "Autenticación de dos factores desactivada", type: "info" });
    } catch (error) {
      setTwoFactorError(errorMessage(error));
    } finally {
      setSavingTwoFactor(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Mi perfil"
        description="Actualiza tus datos y preferencias de seguridad."
        breadcrumb={["Cuenta", "Perfil"]}
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Información personal"
            description="Estos datos identifican tu cuenta."
          />
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4">
              {profileError && (
                <p role="alert" className="rounded bg-red-50 p-2 text-sm text-danger">
                  {profileError}
                </p>
              )}
              <FormField label="Nombre" htmlFor="profile-name">
                <Input
                  id="profile-name"
                  name="name"
                  required
                  minLength={2}
                  defaultValue={user?.name || ""}
                />
              </FormField>
              <FormField label="Correo electrónico" htmlFor="profile-email">
                <Input
                  id="profile-email"
                  name="email"
                  type="email"
                  required
                  defaultValue={user?.email || ""}
                />
              </FormField>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <UserRound aria-hidden="true" className="size-4" />
                Rol: <Badge variant="info">{user?.role}</Badge>
              </div>
              <Button type="submit" loading={savingProfile}>
                Guardar perfil
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader
            title="Cambiar contraseña"
            description="Usa al menos 12 caracteres. Las otras sesiones se cerrarán."
          />
          <CardContent>
            <form onSubmit={changePassword} className="space-y-4">
              {passwordError && (
                <p role="alert" className="rounded bg-red-50 p-2 text-sm text-danger">
                  {passwordError}
                </p>
              )}
              <FormField label="Contraseña actual" htmlFor="current-password">
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </FormField>
              <FormField label="Nueva contraseña" htmlFor="new-password">
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </FormField>
              <FormField label="Confirmar contraseña nueva" htmlFor="confirm-password">
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </FormField>
              <Button type="submit" loading={savingPassword}>
                Actualizar contraseña
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader
            title="Autenticación de dos factores"
            description="Añade un segundo paso con una aplicación autenticadora compatible con TOTP."
            action={
              <ShieldCheck aria-hidden="true" className="size-5 text-primary-700" />
            }
          />
          <CardContent className="space-y-4">
            {twoFactorError && (
              <p role="alert" className="rounded bg-red-50 p-2 text-sm text-danger">
                {twoFactorError}
              </p>
            )}
            {!twoFactorEnabled && !twoFactorSetup && (
              <Button onClick={() => void startTwoFactor()} loading={savingTwoFactor}>
                Configurar 2FA
              </Button>
            )}
            {twoFactorSetup && !twoFactorEnabled && (
              <form
                onSubmit={confirmTwoFactor}
                className="grid gap-5 md:grid-cols-[auto_1fr]"
              >
                <div className="rounded-md border border-border-default p-3">
                  <img
                    src={twoFactorSetup.qrCodeDataUrl}
                    alt="Código QR para configurar autenticación de dos factores"
                    className="size-48"
                  />
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-text-secondary">
                    Escanea el código con tu app autenticadora e ingresa el código de seis
                    dígitos para confirmar.
                  </p>
                  <p className="break-all rounded bg-elevated p-2 font-mono text-xs">
                    {twoFactorSetup.secret}
                  </p>
                  <FormField label="Código de verificación" htmlFor="twofactor-verify">
                    <Input
                      id="twofactor-verify"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      required
                      value={twoFactorCode}
                      onChange={(event) =>
                        setTwoFactorCode(event.target.value.replace(/\D/g, ""))
                      }
                    />
                  </FormField>
                  <div className="flex gap-2">
                    <Button type="submit" loading={savingTwoFactor}>
                      Activar 2FA
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => setTwoFactorSetup(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </form>
            )}
            {twoFactorEnabled && (
              <form onSubmit={disableTwoFactor} className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-2 text-sm text-success">
                  <ShieldCheck aria-hidden="true" className="size-5" />
                  Protección de dos factores activa
                </div>
                <FormField label="Contraseña" htmlFor="twofactor-password">
                  <Input
                    id="twofactor-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={twoFactorPassword}
                    onChange={(event) => setTwoFactorPassword(event.target.value)}
                  />
                </FormField>
                <FormField
                  label="Código de autenticación"
                  htmlFor="twofactor-disable-code"
                >
                  <Input
                    id="twofactor-disable-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={twoFactorCode}
                    onChange={(event) =>
                      setTwoFactorCode(event.target.value.replace(/\D/g, ""))
                    }
                  />
                </FormField>
                <Button
                  type="submit"
                  variant="danger"
                  loading={savingTwoFactor}
                  className="md:col-start-3"
                >
                  Desactivar 2FA
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
