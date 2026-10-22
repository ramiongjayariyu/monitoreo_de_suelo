import { useCallback, useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import { Pencil, Plus, UserRound, UserRoundX } from "lucide-react";
import {
  createUser,
  deactivateUser,
  listUsers,
  updateUser,
  type CreateUserInput,
} from "@/api/users";
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  FormField,
  Input,
  Modal,
  PageHeader,
  Select,
  Table,
  Toggle,
  useToast,
  type TableColumn,
} from "@/components/common";
import type { User, UserRole } from "@/types";

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrador",
  OPERADOR: "Operador",
  CONSULTA: "Consulta",
};

const roleVariants: Record<UserRole, "success" | "info" | "neutral"> = {
  ADMIN: "success",
  OPERADOR: "info",
  CONSULTA: "neutral",
};

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
    return error.response.data.message;
  }
  return "No se pudo completar la operación.";
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deactivating, setDeactivating] = useState<User | null>(null);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  const loadUsers = useCallback(async () => {
    try {
      setUsers(await listUsers());
    } catch (loadError) {
      showToast({
        title: "No se pudieron cargar los usuarios",
        description: errorMessage(loadError),
        type: "danger",
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function openCreate() {
    setEditing(null);
    setError("");
    setFormOpen(true);
  }

  function openEdit(user: User) {
    setEditing(user);
    setError("");
    setFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const roleValue = form.get("role");
    const role: UserRole =
      roleValue === "ADMIN" || roleValue === "OPERADOR" || roleValue === "CONSULTA"
        ? roleValue
        : "CONSULTA";
    const values = {
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      role,
      password: String(form.get("password") || ""),
    };
    try {
      if (editing) {
        const { password, ...fields } = values;
        await updateUser(editing.id, {
          ...fields,
          ...(password ? { password } : {}),
        });
        showToast({ title: "Usuario actualizado", type: "success" });
      } else {
        const input: CreateUserInput = values;
        await createUser(input);
        showToast({ title: "Usuario creado", type: "success" });
      }
      setFormOpen(false);
      await loadUsers();
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: User, active: boolean) {
    try {
      const updated = await updateUser(user.id, { active });
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? updated : item)),
      );
      showToast({
        title: active ? "Usuario activado" : "Usuario desactivado",
        type: "success",
      });
    } catch (updateError) {
      showToast({
        title: "No se pudo cambiar el estado",
        description: errorMessage(updateError),
        type: "danger",
      });
    }
  }

  async function handleDeactivate() {
    if (!deactivating) return;
    try {
      await deactivateUser(deactivating.id);
      showToast({ title: "Usuario desactivado", type: "success" });
      setDeactivating(null);
      await loadUsers();
    } catch (deactivateError) {
      showToast({
        title: "No se pudo desactivar",
        description: errorMessage(deactivateError),
        type: "danger",
      });
    }
  }

  const columns: TableColumn<User>[] = [
    {
      key: "name",
      header: "Nombre",
      sortValue: (user) => user.name,
      render: (user) => (
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-primary-100 text-primary-700">
            <UserRound aria-hidden="true" className="size-4" />
          </span>
          <span className="font-medium">{user.name}</span>
        </div>
      ),
    },
    {
      key: "email",
      header: "Correo",
      sortValue: (user) => user.email,
      render: (user) => user.email,
    },
    {
      key: "role",
      header: "Rol",
      sortValue: (user) => roleLabels[user.role],
      render: (user) => (
        <Badge variant={roleVariants[user.role]}>{roleLabels[user.role]}</Badge>
      ),
    },
    {
      key: "active",
      header: "Estado",
      render: (user) => (
        <Toggle
          checked={user.active}
          onChange={(event) => void toggleActive(user, event.target.checked)}
          aria-label={`${user.active ? "Desactivar" : "Activar"} a ${user.name}`}
        />
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      render: (user) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(user)}
            aria-label={`Editar ${user.name}`}
          >
            <Pencil aria-hidden="true" className="size-4" />
          </Button>
          {user.active && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeactivating(user)}
              aria-label={`Desactivar ${user.name}`}
            >
              <UserRoundX aria-hidden="true" className="size-4 text-danger" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Administra las cuentas y sus permisos de acceso."
        breadcrumb={["Administración", "Usuarios"]}
        actions={
          <Button
            icon={<Plus aria-hidden="true" className="size-4" />}
            onClick={openCreate}
          >
            Agregar usuario
          </Button>
        }
      />
      <Card>
        <CardContent>
          <Table
            columns={columns}
            rows={users}
            loading={loading}
            emptyTitle="No hay usuarios"
            emptyDescription="Crea usuarios para asignar acceso a la plataforma."
          />
        </CardContent>
      </Card>
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Editar usuario" : "Agregar usuario"}
        description="Define la información y el rol de acceso."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p role="alert" className="rounded bg-red-50 p-2 text-sm text-danger">
              {error}
            </p>
          )}
          <FormField label="Nombre" htmlFor="user-name">
            <Input
              id="user-name"
              name="name"
              required
              minLength={2}
              defaultValue={editing?.name || ""}
            />
          </FormField>
          <FormField label="Correo electrónico" htmlFor="user-email">
            <Input
              id="user-email"
              name="email"
              type="email"
              required
              defaultValue={editing?.email || ""}
            />
          </FormField>
          <FormField label="Rol" htmlFor="user-role">
            <Select id="user-role" name="role" defaultValue={editing?.role || "CONSULTA"}>
              <option value="ADMIN">Administrador</option>
              <option value="OPERADOR">Operador</option>
              <option value="CONSULTA">Consulta</option>
            </Select>
          </FormField>
          <FormField
            label={editing ? "Nueva contraseña (opcional)" : "Contraseña"}
            htmlFor="user-password"
            hint="Al menos 12 caracteres."
          >
            <Input
              id="user-password"
              name="password"
              type="password"
              required={!editing}
              minLength={12}
              autoComplete="new-password"
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(deactivating)}
        onClose={() => setDeactivating(null)}
        onConfirm={() => void handleDeactivate()}
        title={`¿Desactivar a ${deactivating?.name || "este usuario"}?`}
        description="La persona perderá acceso y sus sesiones activas serán revocadas."
        confirmLabel="Desactivar usuario"
      />
    </>
  );
}
