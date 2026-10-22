import { useMemo, useState } from "react";
import axios from "axios";
import { Bell, RefreshCw } from "lucide-react";
import { AlertCard } from "@/components/alerts/alert-card";
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Select,
  Spinner,
} from "@/components/common";
import { useAlerts } from "@/hooks/useAlerts";
import { listNodes } from "@/api/nodes";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/common";
import type { AlertSeverity, AlertStatus, SoilVariable } from "@/types";
import type { AlertFilters } from "@/api/alerts";
import type { Alert } from "@/types";

const severityOptions: Array<{ value: AlertSeverity | ""; label: string }> = [
  { value: "", label: "Todas las severidades" },
  { value: "INFO", label: "Información" },
  { value: "ADVERTENCIA", label: "Advertencia" },
  { value: "CRITICA", label: "Crítica" },
];

const variableOptions: Array<{ value: SoilVariable | ""; label: string }> = [
  { value: "", label: "Todas las variables" },
  { value: "humidity", label: "Humedad" },
  { value: "ph", label: "pH" },
  { value: "salinity", label: "Salinidad" },
  { value: "soilTemp", label: "Temperatura del suelo" },
  { value: "ambientTemp", label: "Temperatura ambiente" },
];

const statusOptions: Array<{ value: AlertStatus | ""; label: string }> = [
  { value: "", label: "Todos los estados" },
  { value: "ACTIVA", label: "Activas" },
  { value: "LEIDA", label: "Leídas" },
  { value: "SILENCIADA", label: "Silenciadas" },
  { value: "CERRADA", label: "Cerradas" },
];
const emptyAlerts: Alert[] = [];

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
    return error.response.data.message;
  }
  return "No se pudo actualizar la alerta.";
}

function toIsoDate(value: string, endOfDay = false): string | undefined {
  if (!value) return undefined;
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`).toISOString();
}

export function AlertsPage() {
  const [severity, setSeverity] = useState<AlertSeverity | "">("");
  const [variable, setVariable] = useState<SoilVariable | "">("");
  const [status, setStatus] = useState<AlertStatus | "">("");
  const [nodeId, setNodeId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { showToast } = useToast();
  const filters = useMemo<AlertFilters>(
    () => ({
      ...(severity ? { severity } : {}),
      ...(variable ? { variable } : {}),
      ...(status ? { status } : {}),
      ...(nodeId ? { nodeId } : {}),
      ...(from ? { from: toIsoDate(from) } : {}),
      ...(to ? { to: toIsoDate(to, true) } : {}),
      take: 200,
    }),
    [from, nodeId, severity, status, to, variable],
  );
  const { alertsQuery, statusMutation } = useAlerts(filters);
  const nodesQuery = useQuery({
    queryKey: ["nodes", "alert-options"],
    queryFn: () => listNodes(),
  });
  const alerts = alertsQuery.data?.alerts ?? emptyAlerts;
  const groupedAlerts = useMemo(() => {
    const groups = new Map<string, typeof alerts>();
    alerts.forEach((alert) => {
      const date = new Date(alert.createdAt);
      const label = Number.isNaN(date.getTime())
        ? "Fecha no disponible"
        : new Intl.DateTimeFormat("es", { dateStyle: "full" }).format(date);
      groups.set(label, [...(groups.get(label) || []), alert]);
    });
    return [...groups.entries()];
  }, [alerts]);

  async function handleAction(id: string, action: "read" | "silence" | "close") {
    try {
      await statusMutation.mutateAsync({ id, action });
      showToast({
        title: "Alerta actualizada",
        description: "El cambio se guardó correctamente.",
        type: "success",
      });
    } catch (error) {
      showToast({
        title: "No se pudo actualizar",
        description: errorMessage(error),
        type: "danger",
      });
    }
  }

  function clearFilters() {
    setSeverity("");
    setVariable("");
    setStatus("");
    setNodeId("");
    setFrom("");
    setTo("");
  }

  return (
    <section>
      <PageHeader
        title="Alertas"
        description="Consulta las desviaciones detectadas y gestiona su estado."
        actions={
          <>
            <Badge variant="danger">{alertsQuery.data?.activeCount ?? 0} activas</Badge>
            <Button
              variant="secondary"
              icon={<RefreshCw aria-hidden="true" className="size-4" />}
              onClick={() => void alertsQuery.refetch()}
            >
              Actualizar
            </Button>
          </>
        }
      />

      <div className="mb-6 rounded-md border border-border-default bg-white p-4">
        <div
          role="group"
          aria-label="Filtrar por severidad"
          className="mb-4 flex flex-wrap gap-2"
        >
          {severityOptions.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={severity === option.value ? "primary" : "secondary"}
              aria-pressed={severity === option.value}
              onClick={() => setSeverity(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Select
            aria-label="Filtrar variable"
            value={variable}
            onChange={(event) => setVariable(event.target.value as SoilVariable | "")}
          >
            {variableOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filtrar estado"
            value={status}
            onChange={(event) => setStatus(event.target.value as AlertStatus | "")}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filtrar nodo"
            value={nodeId}
            onChange={(event) => setNodeId(event.target.value)}
          >
            <option value="">Todos los nodos</option>
            {(nodesQuery.data || []).map((node) => (
              <option key={node.id} value={node.id}>
                {node.name}
              </option>
            ))}
          </Select>
          <input
            aria-label="Fecha desde"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="min-h-10 rounded-md border border-border-default px-3 text-sm text-text-primary"
          />
          <input
            aria-label="Fecha hasta"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="min-h-10 rounded-md border border-border-default px-3 text-sm text-text-primary"
          />
          <Button
            variant="ghost"
            className="sm:col-span-2 lg:col-span-3 xl:col-span-5"
            onClick={clearFilters}
          >
            Limpiar filtros
          </Button>
        </div>
      </div>

      {alertsQuery.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner label="Cargando alertas" />
        </div>
      ) : alertsQuery.isError ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-danger"
        >
          No se pudieron cargar las alertas. Intenta actualizar la página.
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={<Bell aria-hidden="true" className="size-8" />}
          title="No hay alertas para estos filtros"
          description="Cuando una lectura salga del rango del cultivo, aparecerá aquí."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {groupedAlerts.map(([date, items]) => (
            <section key={date} aria-label={`Alertas de ${date}`}>
              <h2 className="mb-3 text-sm font-semibold capitalize text-text-secondary">
                {date}
              </h2>
              <div className="space-y-3">
                {items.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    busy={statusMutation.isPending}
                    onAction={(id, action) => void handleAction(id, action)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
