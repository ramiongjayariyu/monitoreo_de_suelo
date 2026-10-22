import { useMemo, useState } from "react";
import axios from "axios";
import { Activity, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { DashboardPeriod } from "@/api/dashboard";
import { listCrops } from "@/api/crops";
import { listNodes } from "@/api/nodes";
import {
  ActiveAlertsCard,
  DashboardKpis,
  DashboardOverview,
  QuickChartCard,
  SemaphoreCard,
} from "@/components/dashboard/dashboard-cards";
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Select,
  Skeleton,
} from "@/components/common";
import { useDashboard } from "@/hooks/useDashboard";
import type { SoilVariable } from "@/types";

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
    return error.response.data.message;
  }
  return "No se pudo cargar el dashboard.";
}

export function DashboardPage() {
  const [cropId, setCropId] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [period, setPeriod] = useState<DashboardPeriod>("24h");
  const [variable, setVariable] = useState<SoilVariable>("humidity");
  const cropsQuery = useQuery({
    queryKey: ["crops", "dashboard-options"],
    queryFn: () => listCrops(),
  });
  const nodesQuery = useQuery({
    queryKey: ["nodes", "dashboard-options", cropId],
    queryFn: () => listNodes(cropId ? { cropId } : {}),
  });
  const filters = useMemo(
    () => ({
      ...(cropId ? { cropId } : {}),
      ...(nodeId ? { nodeId } : {}),
      period,
    }),
    [cropId, nodeId, period],
  );
  const { dashboardQuery, isLive, readingVersion } = useDashboard(filters);
  const data = dashboardQuery.data;

  function changeCrop(nextCropId: string) {
    setCropId(nextCropId);
    setNodeId("");
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Resumen en tiempo real de las condiciones del suelo y el estado de tus nodos."
        actions={
          <>
            <Badge variant={isLive ? "success" : "neutral"}>
              {isLive ? (
                <>
                  <Wifi aria-hidden="true" className="mr-1.5 inline size-3.5" />
                  En vivo
                </>
              ) : (
                <>
                  <WifiOff aria-hidden="true" className="mr-1.5 inline size-3.5" />
                  Sin conexión
                </>
              )}
            </Badge>
            <Button
              variant="secondary"
              icon={<RefreshCw aria-hidden="true" className="size-4" />}
              loading={dashboardQuery.isFetching}
              onClick={() => void dashboardQuery.refetch()}
            >
              Actualizar
            </Button>
          </>
        }
      />

      <div className="grid gap-3 rounded-md border border-border-default bg-white p-4 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_auto] lg:items-end">
        <label className="block text-sm font-medium text-text-secondary">
          Cultivo
          <Select
            className="mt-1 block"
            aria-label="Filtrar por cultivo"
            value={cropId}
            onChange={(event) => changeCrop(event.target.value)}
            disabled={cropsQuery.isPending}
          >
            <option value="">Todos los cultivos</option>
            {(cropsQuery.data || []).map((crop) => (
              <option key={crop.id} value={crop.id}>
                {crop.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-sm font-medium text-text-secondary">
          Nodo
          <Select
            className="mt-1 block"
            aria-label="Filtrar por nodo"
            value={nodeId}
            onChange={(event) => setNodeId(event.target.value)}
            disabled={nodesQuery.isPending}
          >
            <option value="">Todos los nodos</option>
            {(nodesQuery.data || []).map((node) => (
              <option key={node.id} value={node.id}>
                {node.name}
              </option>
            ))}
          </Select>
        </label>
        {data && <DashboardOverview data={data} />}
      </div>

      {(cropsQuery.isError || nodesQuery.isError) && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger"
        >
          No se pudieron cargar las opciones de filtros.
        </p>
      )}

      {dashboardQuery.isPending ? (
        <div className="space-y-6" aria-label="Cargando dashboard">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} variant="card" />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Skeleton variant="card" className="h-64" />
            <Skeleton variant="card" className="h-64" />
          </div>
          <Skeleton variant="card" className="h-96" />
        </div>
      ) : dashboardQuery.isError ? (
        <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-5">
          <p role="alert" className="text-sm text-danger">
            {errorMessage(dashboardQuery.error)}
          </p>
          <Button variant="secondary" onClick={() => void dashboardQuery.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : data ? (
        data.nodeCount === 0 ? (
          <EmptyState
            icon={<Activity aria-hidden="true" className="size-8" />}
            title="Aún no hay nodos para monitorear"
            description="Crea un nodo para comenzar a visualizar las lecturas del terreno."
            action={
              <Link
                to="/nodes"
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-500"
              >
                Gestionar nodos
              </Link>
            }
          />
        ) : (
          <>
            <DashboardKpis data={data} flashVersion={readingVersion} />
            <div className="grid gap-4 xl:grid-cols-2">
              <SemaphoreCard data={data} />
              <ActiveAlertsCard data={data} />
            </div>
            <QuickChartCard
              data={data}
              period={period}
              variable={variable}
              onPeriodChange={setPeriod}
              onVariableChange={setVariable}
            />
            <p className="text-right text-xs text-text-muted">
              Última actualización:{" "}
              {new Intl.DateTimeFormat("es", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(data.generatedAt))}
            </p>
          </>
        )
      ) : null}
    </section>
  );
}
