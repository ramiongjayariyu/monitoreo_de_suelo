import { useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listUsers } from "@/api/users";
import { getSystemConfig, listAudit, updateSystemConfig } from "@/api/settings";
import type {
  AuditFilters,
  AuditLogRecord,
  SeverityThreshold,
  SystemConfig,
} from "@/api/settings";
import type { SoilVariable } from "@/types";
import {
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Table,
  Tabs,
} from "@/components/common";
import type { TableColumn } from "@/components/common";
import { useAuth } from "@/context/AuthContext";
import { ProfilePage } from "@/pages/profile-page";
import { useToast } from "@/components/common";

const variables: Array<{ id: SoilVariable; label: string }> = [
  { id: "humidity", label: "Humedad" },
  { id: "ph", label: "pH" },
  { id: "salinity", label: "Salinidad" },
  { id: "soilTemp", label: "Temperatura del suelo" },
  { id: "ambientTemp", label: "Temperatura ambiente" },
];

const timeZones = [
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "Europe/Madrid",
  "UTC",
];

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
    return error.response.data.message;
  }
  return "No se pudo guardar la configuración.";
}

function formatDate(value: string, timeZone = "UTC"): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

function dateInput(value: string, endOfDay = false): string {
  if (!value) return "";
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`).toISOString();
}

function useConfigMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: updateSystemConfig,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["system-config"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["nodes"] }),
      ]);
      showToast({
        title: "Configuración guardada",
        description: "Los cambios se aplicaron correctamente.",
        type: "success",
      });
    },
    onError: (error) =>
      showToast({
        title: "No se pudo guardar",
        description: errorMessage(error),
        type: "danger",
      }),
  });
}

function ThresholdsPanel() {
  const configQuery = useQuery({
    queryKey: ["system-config"],
    queryFn: getSystemConfig,
  });
  const mutation = useConfigMutation();

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configQuery.data) return;
    const form = new FormData(event.currentTarget);
    const severityThresholds = Object.fromEntries(
      variables.map(({ id }) => [
        id,
        {
          warning: Number(form.get(`${id}-warning`)),
          critical: Number(form.get(`${id}-critical`)),
        },
      ]),
    ) as Record<SoilVariable, SeverityThreshold>;
    mutation.mutate({ severityThresholds });
  }

  if (configQuery.isPending) return <Skeleton variant="table" />;
  if (configQuery.isError || !configQuery.data) {
    return (
      <p role="alert" className="text-sm text-danger">
        No se pudieron cargar los umbrales del sistema.
      </p>
    );
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-text-primary">
          Umbrales de alertas
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Define el porcentaje de desviación respecto al rango del cultivo para clasificar
          advertencias y alertas críticas.
        </p>
      </div>
      {mutation.isError && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage(mutation.error)}
        </p>
      )}
      <div className="overflow-x-auto rounded-md border border-border-default">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-elevated text-xs uppercase text-text-secondary">
            <tr>
              <th className="px-4 py-3">Variable</th>
              <th className="px-4 py-3">Advertencia (%)</th>
              <th className="px-4 py-3">Crítica (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {variables.map(({ id, label }) => (
              <tr key={id}>
                <th className="px-4 py-3 font-medium text-text-primary">{label}</th>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    min="0"
                    max="999"
                    step="0.1"
                    name={`${id}-warning`}
                    defaultValue={configQuery.data.severityThresholds[id].warning}
                    required
                    aria-label={`Umbral de advertencia para ${label}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    min="0.1"
                    max="1000"
                    step="0.1"
                    name={`${id}-critical`}
                    defaultValue={configQuery.data.severityThresholds[id].critical}
                    required
                    aria-label={`Umbral crítico para ${label}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="submit" loading={mutation.isPending}>
        Guardar umbrales
      </Button>
    </form>
  );
}

function SystemPanel() {
  const configQuery = useQuery({
    queryKey: ["system-config"],
    queryFn: getSystemConfig,
  });
  const mutation = useConfigMutation();

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configQuery.data) return;
    const form = new FormData(event.currentTarget);
    const units = Object.fromEntries(
      variables.map(({ id }) => [id, String(form.get(`unit-${id}`))]),
    ) as SystemConfig["system"]["units"];
    mutation.mutate({
      system: {
        defaultSamplingFrequency: Number(form.get("frequency")),
        units,
        timeZone: String(form.get("timeZone")),
        language: "es",
      },
    });
  }

  if (configQuery.isPending) return <Skeleton variant="card" />;
  if (configQuery.isError || !configQuery.data) {
    return (
      <p role="alert" className="text-sm text-danger">
        No se pudo cargar la configuración del sistema.
      </p>
    );
  }
  const system = configQuery.data.system;
  return (
    <form onSubmit={save} className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-text-primary">
          Preferencias del sistema
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          La frecuencia se usa al crear nodos sin una frecuencia explícita; las unidades
          se muestran en el dashboard.
        </p>
      </div>
      {mutation.isError && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage(mutation.error)}
        </p>
      )}
      <label className="block max-w-sm text-sm font-medium text-text-secondary">
        Frecuencia predeterminada de muestreo (segundos)
        <Input
          className="mt-1"
          type="number"
          name="frequency"
          min="5"
          max="86400"
          step="1"
          defaultValue={system.defaultSamplingFrequency}
          required
        />
      </label>
      <label className="block max-w-sm text-sm font-medium text-text-secondary">
        Zona horaria
        <Select className="mt-1" name="timeZone" defaultValue={system.timeZone}>
          {!timeZones.includes(system.timeZone) && (
            <option value={system.timeZone}>{system.timeZone}</option>
          )}
          {timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </Select>
      </label>
      <p className="text-sm font-medium text-text-secondary">
        Idioma de la interfaz
        <span className="ml-3 inline-flex rounded-md bg-elevated px-3 py-2 text-text-primary">
          Español
        </span>
      </p>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-text-secondary">
          Unidades de medida
        </legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {variables.map(({ id, label }) => (
            <label key={id} className="text-sm text-text-secondary">
              {label}
              <Input
                className="mt-1"
                name={`unit-${id}`}
                defaultValue={system.units[id]}
                maxLength={20}
                required
              />
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" loading={mutation.isPending}>
        Guardar sistema
      </Button>
    </form>
  );
}

function AuditPanel() {
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const configQuery = useQuery({
    queryKey: ["system-config"],
    queryFn: getSystemConfig,
  });
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const filters = useMemo<AuditFilters>(
    () => ({
      ...(userId ? { userId } : {}),
      ...(action.trim() ? { action: action.trim() } : {}),
      ...(entity.trim() ? { entity: entity.trim() } : {}),
      ...(from ? { from: dateInput(from) } : {}),
      ...(to ? { to: dateInput(to, true) } : {}),
      page,
      pageSize: 25,
    }),
    [action, entity, from, page, to, userId],
  );
  const auditQuery = useQuery({
    queryKey: ["audit", filters],
    queryFn: () => listAudit(filters),
  });
  const zone = configQuery.data?.system.timeZone ?? "UTC";
  const columns: TableColumn<AuditLogRecord>[] = [
    {
      key: "timestamp",
      header: "Fecha",
      render: (item) => formatDate(item.timestamp, zone),
      sortValue: (item) => item.timestamp,
    },
    {
      key: "user",
      header: "Usuario",
      render: (item) => item.user?.name ?? "Sistema",
    },
    {
      key: "action",
      header: "Acción",
      render: (item) => <Badge variant="info">{item.action}</Badge>,
    },
    { key: "entity", header: "Entidad", render: (item) => item.entity },
    {
      key: "entityId",
      header: "ID",
      render: (item) => <span className="font-mono text-xs">{item.entityId ?? "—"}</span>,
    },
    {
      key: "changes",
      header: "Detalle",
      render: (item) => (
        <span className="block max-w-xs truncate text-xs text-text-muted">
          {item.changes ? JSON.stringify(item.changes) : "—"}
        </span>
      ),
    },
  ];
  const pageCount = Math.max(
    1,
    Math.ceil((auditQuery.data?.total ?? 0) / (auditQuery.data?.pageSize ?? 25)),
  );

  function resetPage<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-text-primary">
          Registro de auditoría
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Consulta cambios administrativos y acciones registradas.
        </p>
      </div>
      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm font-medium text-text-secondary">
          Usuario
          <Select
            className="mt-1"
            value={userId}
            onChange={(event) => resetPage(setUserId, event.target.value)}
            disabled={usersQuery.isPending}
          >
            <option value="">Todos los usuarios</option>
            {(usersQuery.data ?? []).map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium text-text-secondary">
          Acción
          <Input
            className="mt-1"
            value={action}
            onChange={(event) => resetPage(setAction, event.target.value)}
            placeholder="Ej. NODE_UPDATED"
          />
        </label>
        <label className="text-sm font-medium text-text-secondary">
          Entidad
          <Input
            className="mt-1"
            value={entity}
            onChange={(event) => resetPage(setEntity, event.target.value)}
            placeholder="Ej. Node"
          />
        </label>
        <label className="text-sm font-medium text-text-secondary">
          Desde
          <Input
            className="mt-1"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => resetPage(setFrom, event.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-text-secondary">
          Hasta
          <Input
            className="mt-1"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => resetPage(setTo, event.target.value)}
          />
        </label>
      </Card>
      {(auditQuery.isError || usersQuery.isError) && (
        <p role="alert" className="text-sm text-danger">
          No se pudo cargar la auditoría o las opciones de usuario.
        </p>
      )}
      {auditQuery.isPending ? (
        <Skeleton variant="table" />
      ) : (
        <>
          <Table
            columns={columns}
            rows={auditQuery.data?.items ?? []}
            emptyTitle="Sin registros de auditoría"
            emptyDescription="Prueba cambiar los filtros o vuelve más tarde."
            pageSize={25}
          />
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>
              {auditQuery.data?.total ?? 0} registros · Página {page} de {pageCount}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const admin = user?.role === "ADMIN";
  const items = [
    { id: "profile", label: "Perfil", content: <ProfilePage /> },
    ...(admin
      ? [
          { id: "thresholds", label: "Umbrales", content: <ThresholdsPanel /> },
          { id: "system", label: "Sistema", content: <SystemPanel /> },
          { id: "audit", label: "Auditoría", content: <AuditPanel /> },
        ]
      : []),
  ];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Administra tu perfil, parámetros de monitoreo y consulta la auditoría del sistema."
      />
      <Card className="p-4 sm:p-6">
        <Tabs items={items} />
      </Card>
    </section>
  );
}
