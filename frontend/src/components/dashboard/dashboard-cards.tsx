import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  CircleCheck,
  CircleX,
  Clock3,
  Droplets,
  Sprout,
  Sun,
  Thermometer,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  Semaphore,
  type SemaphoreStatus,
} from "@/components/common";
import {
  KPICard,
  LineChart,
  type ChartVariable,
  type TimeSeriesPoint,
} from "@/components/common";
import type { DashboardPeriod, DashboardResponse } from "@/api/dashboard";
import type { SoilVariable } from "@/types";

const variableCards: Array<{
  key: SoilVariable;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    key: "humidity",
    label: "Humedad",
    icon: <Droplets aria-hidden="true" className="size-4" />,
  },
  {
    key: "ph",
    label: "pH",
    icon: <Activity aria-hidden="true" className="size-4" />,
  },
  {
    key: "salinity",
    label: "Salinidad",
    icon: <Sprout aria-hidden="true" className="size-4" />,
  },
  {
    key: "soilTemp",
    label: "Temperatura del suelo",
    icon: <Thermometer aria-hidden="true" className="size-4" />,
  },
  {
    key: "ambientTemp",
    label: "Temperatura ambiente",
    icon: <Sun aria-hidden="true" className="size-4" />,
  },
];

const statusLabels: Record<DashboardResponse["semaphore"]["status"], string> = {
  optimal: "Óptimo",
  warning: "Advertencia",
  critical: "Crítico",
  offline: "Sin lecturas",
};

const severityVariant = {
  INFO: "info",
  ADVERTENCIA: "warning",
  CRITICA: "danger",
} as const;

const severityLabels = {
  INFO: "Información",
  ADVERTENCIA: "Advertencia",
  CRITICA: "Crítica",
} as const;

const variableLabels: Record<SoilVariable, string> = {
  humidity: "Humedad",
  ph: "pH",
  salinity: "Salinidad",
  soilTemp: "Temperatura del suelo",
  ambientTemp: "Temperatura ambiente",
};

const periods: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "24h", label: "24 horas" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
];

const variables: SoilVariable[] = [
  "humidity",
  "ph",
  "salinity",
  "soilTemp",
  "ambientTemp",
];

export function DashboardKpis({
  data,
  flashVersion,
}: {
  data: DashboardResponse;
  flashVersion: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {variableCards.map(({ key, label, icon }) => {
        const metric = data.kpis[key];
        return metric.value === null ? (
          <Card key={key} className="min-h-36 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
              {icon}
              {label}
            </div>
            <p className="mt-6 text-sm text-text-muted">Sin lecturas disponibles</p>
          </Card>
        ) : (
          <div
            key={`${key}-${flashVersion}`}
            className={flashVersion > 0 ? "rounded-md dashboard-kpi-flash" : "rounded-md"}
          >
            <KPICard
              label={label}
              value={metric.value}
              unit={metric.unit}
              variable={key as ChartVariable}
              data={metric.data}
              icon={icon}
            />
          </div>
        );
      })}
    </div>
  );
}

export function SemaphoreCard({ data }: { data: DashboardResponse }) {
  const status = data.semaphore.status as SemaphoreStatus;
  const counts = data.semaphore.counts;
  return (
    <Card>
      <CardHeader
        title="Estado general"
        description="Estado de los nodos según su lectura más reciente y las alertas abiertas."
      />
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">
          <span
            aria-hidden="true"
            className={`size-5 rounded-full ${
              status === "critical"
                ? "bg-danger"
                : status === "warning"
                  ? "bg-warning"
                  : status === "optimal"
                    ? "bg-success"
                    : "bg-neutral"
            }`}
          />
          <p className="font-display text-2xl font-bold text-text-primary">
            {statusLabels[status]}
          </p>
          <Semaphore status={status} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <StatusCount
            icon={<CircleCheck className="size-4 text-success" />}
            label="Óptimos"
            count={counts.optimal}
          />
          <StatusCount
            icon={<AlertTriangle className="size-4 text-warning" />}
            label="Advertencia"
            count={counts.warning}
          />
          <StatusCount
            icon={<CircleX className="size-4 text-danger" />}
            label="Críticos"
            count={counts.critical}
          />
          <StatusCount
            icon={<Clock3 className="size-4 text-neutral" />}
            label="Sin conexión"
            count={counts.offline}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusCount({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="rounded-md bg-elevated p-3">
      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
        {icon}
        {label}
      </div>
      <p className="mt-1 font-mono text-xl font-semibold text-text-primary">{count}</p>
    </div>
  );
}

export function ActiveAlertsCard({ data }: { data: DashboardResponse }) {
  return (
    <Card>
      <CardHeader
        title="Alertas recientes"
        description={`${data.activeAlertCount} alertas activas`}
        action={
          <Link
            to="/alerts"
            className="text-sm font-semibold text-primary-700 hover:underline"
          >
            Ver todas
          </Link>
        }
      />
      <CardContent className="space-y-3">
        {data.alerts.length === 0 ? (
          <EmptyState
            icon={<CircleCheck aria-hidden="true" className="size-7" />}
            title="Sin alertas recientes"
            description="No hay alertas abiertas para estos filtros."
          />
        ) : (
          data.alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-3 border-b border-border-default pb-3 last:border-0 last:pb-0"
            >
              <Badge variant={severityVariant[alert.severity]}>
                {severityLabels[alert.severity]}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {alert.node.name} · {variableLabels[alert.variable]}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">
                  {alert.message}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function QuickChartCard({
  data,
  period,
  variable,
  onPeriodChange,
  onVariableChange,
}: {
  data: DashboardResponse;
  period: DashboardPeriod;
  variable: SoilVariable;
  onPeriodChange: (period: DashboardPeriod) => void;
  onVariableChange: (variable: SoilVariable) => void;
}) {
  const chartData = useMemo<TimeSeriesPoint[]>(
    () =>
      data.series[variable].map((point) => ({
        value: point.value,
        timestamp: formatChartTimestamp(point.timestamp, period),
      })),
    [data.series, period, variable],
  );
  const unit = data.kpis[variable].unit;

  return (
    <Card>
      <CardHeader
        title="Tendencia de lecturas"
        description="Promedio por intervalo para los nodos seleccionados."
        action={
          <div
            role="group"
            aria-label="Periodo del gráfico"
            className="flex gap-1 rounded-md bg-elevated p-1"
          >
            {periods.map((item) => (
              <Button
                key={item.value}
                size="sm"
                variant={period === item.value ? "primary" : "ghost"}
                aria-pressed={period === item.value}
                onClick={() => onPeriodChange(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        }
      />
      <CardContent>
        <div
          role="group"
          aria-label="Variable del gráfico"
          className="mb-3 flex flex-wrap gap-2"
        >
          {variables.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={variable === item ? "secondary" : "ghost"}
              aria-pressed={variable === item}
              onClick={() => onVariableChange(item)}
            >
              {variableLabels[item]}
            </Button>
          ))}
        </div>
        {chartData.length === 0 ? (
          <EmptyState
            title="Sin datos en este periodo"
            description="El gráfico se completará cuando los nodos envíen lecturas."
          />
        ) : (
          <LineChart data={chartData} variable={variable} unit={unit} height={300} />
        )}
      </CardContent>
    </Card>
  );
}

function formatChartTimestamp(value: string, period: DashboardPeriod): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es", {
    ...(period === "24h" ? {} : { day: "2-digit", month: "short" }),
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function DashboardOverview({ data }: { data: DashboardResponse }) {
  return (
    <p className="text-xs text-text-muted">
      Mostrando {data.nodesWithReadings} de {data.nodeCount} nodos con lecturas. Los
      indicadores son el promedio de la lectura más reciente de cada nodo.
    </p>
  );
}
