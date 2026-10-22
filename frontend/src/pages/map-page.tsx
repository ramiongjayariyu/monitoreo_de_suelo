import { useMemo, useState } from "react";
import axios from "axios";
import { ChevronLeft, ChevronRight, MapPin, Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getNodeOptions, type MapNodesFilter, type MapNodeRecord } from "@/api/nodes";
import {
  Badge,
  Button,
  EmptyState,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  useToast,
} from "@/components/common";
import { TerrainCanvas, type TerrainNode } from "@/components/canvas/terrain-canvas";
import { useAuth } from "@/context/AuthContext";
import { useMapNodes } from "@/hooks/useMapNodes";

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
    return error.response.data.message;
  }
  return "No se pudo cargar el mapa del terreno.";
}

function asTerrainNode(node: MapNodeRecord): TerrainNode {
  const reading = node.readings[0];
  return {
    id: node.id,
    deviceId: node.deviceId,
    name: node.name,
    x: node.posX,
    y: node.posY,
    status: node.mapStatus,
    readings: reading
      ? {
          humidity: reading.humidity,
          ph: reading.ph,
          salinity: reading.salinity,
          soilTemp: reading.soilTemp,
          ambientTemp: reading.ambientTemp,
        }
      : null,
    timestamp: node.lastReading || reading?.timestamp || null,
    cropName: node.crop?.name ?? null,
    stateName: node.state?.name ?? null,
    battery: node.battery,
    alertMessage: node.alerts[0]?.message ?? null,
  };
}

function connectionLabel(status: MapNodeRecord["mapStatus"]): string {
  return {
    optimal: "Óptimo",
    warning: "Advertencia",
    critical: "Crítico",
    offline: "Sin conexión",
  }[status];
}

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return "Sin lecturas";
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : new Intl.DateTimeFormat("es", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

const EMPTY_MAP_NODES: MapNodeRecord[] = [];

export function MapPage() {
  const [cropId, setCropId] = useState("");
  const [stateId, setStateId] = useState("");
  const [connection, setConnection] = useState("");
  const [alertLevel, setAlertLevel] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [detailsNode, setDetailsNode] = useState<TerrainNode | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const canManage = user?.role === "ADMIN" || user?.role === "OPERADOR";
  const optionsQuery = useQuery({
    queryKey: ["nodes", "options"],
    queryFn: getNodeOptions,
  });
  const selectedCrop = optionsQuery.data?.find((crop) => crop.id === cropId);
  const filters = useMemo<MapNodesFilter>(
    () => ({
      ...(cropId ? { cropId } : {}),
      ...(stateId ? { state: stateId } : {}),
      ...(connection ? { connection: connection as "ONLINE" | "OFFLINE" } : {}),
      ...(alertLevel ? { alertLevel: alertLevel as MapNodesFilter["alertLevel"] } : {}),
    }),
    [alertLevel, connection, cropId, stateId],
  );
  const { mapQuery, positionMutation } = useMapNodes(filters);
  const nodes = mapQuery.data ?? EMPTY_MAP_NODES;
  const terrainNodes = useMemo(() => nodes.map(asTerrainNode), [nodes]);

  function changeCrop(value: string) {
    setCropId(value);
    setStateId("");
  }

  async function savePosition(id: string, position: { x: number; y: number }) {
    try {
      await positionMutation.mutateAsync({
        id,
        posX: position.x,
        posY: position.y,
      });
      showToast({
        title: "Posición actualizada",
        description: "La ubicación del nodo se guardó correctamente.",
        type: "success",
      });
    } catch (error) {
      showToast({
        title: "No se pudo actualizar la posición",
        description: errorMessage(error),
        type: "danger",
      });
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Mapa del terreno"
        description="Ubica tus nodos, revisa sus lecturas y arrástralos para actualizar su posición."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<RefreshCw aria-hidden="true" className="size-4" />}
              loading={mapQuery.isFetching}
              onClick={() => void mapQuery.refetch()}
            >
              Actualizar
            </Button>
            {canManage && (
              <Button
                icon={<Plus aria-hidden="true" className="size-4" />}
                onClick={() => navigate("/nodes?create=1")}
              >
                Agregar nodo
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-3 rounded-md border border-border-default bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="block text-sm font-medium text-text-secondary">
          Cultivo
          <Select
            className="mt-1 block"
            aria-label="Filtrar por cultivo"
            value={cropId}
            onChange={(event) => changeCrop(event.target.value)}
          >
            <option value="">Todos los cultivos</option>
            {(optionsQuery.data || []).map((crop) => (
              <option key={crop.id} value={crop.id}>
                {crop.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-sm font-medium text-text-secondary">
          Estado del cultivo
          <Select
            className="mt-1 block"
            aria-label="Filtrar por estado del cultivo"
            value={stateId}
            onChange={(event) => setStateId(event.target.value)}
            disabled={!cropId}
          >
            <option value="">Todos los estados</option>
            {(selectedCrop?.states || []).map((state) => (
              <option key={state.id} value={state.id}>
                {state.name}
                {state.isActive ? " (vigente)" : ""}
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-sm font-medium text-text-secondary">
          Conexión
          <Select
            className="mt-1 block"
            aria-label="Filtrar por conexión"
            value={connection}
            onChange={(event) => setConnection(event.target.value)}
          >
            <option value="">Todas las conexiones</option>
            <option value="ONLINE">En línea</option>
            <option value="OFFLINE">Sin conexión</option>
          </Select>
        </label>
        <label className="block text-sm font-medium text-text-secondary">
          Nivel de alerta
          <Select
            className="mt-1 block"
            aria-label="Filtrar por nivel de alerta"
            value={alertLevel}
            onChange={(event) => setAlertLevel(event.target.value)}
          >
            <option value="">Todos los niveles</option>
            <option value="CRITICA">Crítica</option>
            <option value="ADVERTENCIA">Advertencia</option>
            <option value="INFO">Información</option>
            <option value="NONE">Sin alerta abierta</option>
          </Select>
        </label>
      </div>

      {optionsQuery.isError && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger"
        >
          No se pudieron cargar los cultivos y estados para los filtros.
        </p>
      )}

      {mapQuery.isPending ? (
        <Skeleton variant="card" className="h-[32rem]" />
      ) : mapQuery.isError ? (
        <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-5">
          <p role="alert" className="text-sm text-danger">
            {errorMessage(mapQuery.error)}
          </p>
          <Button variant="secondary" onClick={() => void mapQuery.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : nodes.length === 0 ? (
        <EmptyState
          icon={<MapPin aria-hidden="true" className="size-8" />}
          title="No hay nodos para mostrar"
          description="Cambia los filtros o agrega un nodo para visualizar el terreno."
          action={
            canManage ? (
              <Button
                icon={<Plus aria-hidden="true" className="size-4" />}
                onClick={() => navigate("/nodes?create=1")}
              >
                Agregar nodo
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div
          className={`grid gap-4 ${panelOpen ? "xl:grid-cols-[minmax(0,1fr)_18rem]" : ""}`}
        >
          <div className="min-w-0">
            <TerrainCanvas
              nodes={terrainNodes}
              canMove={canManage}
              selectedId={selectedId || null}
              onSelectNode={setSelectedId}
              onPositionChange={savePosition}
              onNodeView={setDetailsNode}
              onNodeEdit={(node) =>
                navigate(`/nodes?edit=${encodeURIComponent(node.id)}`)
              }
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-text-muted">
                {canManage
                  ? "Arrastra los marcadores para cambiar su ubicación. Usa la rueda o los controles para acercar."
                  : "Selecciona un marcador para consultar sus lecturas."}
              </p>
              <Button
                size="sm"
                variant="ghost"
                aria-expanded={panelOpen}
                aria-controls="map-node-panel"
                onClick={() => setPanelOpen((value) => !value)}
                icon={
                  panelOpen ? (
                    <ChevronRight aria-hidden="true" className="size-4" />
                  ) : (
                    <ChevronLeft aria-hidden="true" className="size-4" />
                  )
                }
              >
                {panelOpen ? "Ocultar nodos" : "Mostrar nodos"}
              </Button>
            </div>
          </div>
          {panelOpen && (
            <aside
              id="map-node-panel"
              className="max-h-[40rem] overflow-y-auto rounded-md border border-border-default bg-white"
              aria-label="Panel de nodos del mapa"
            >
              <div className="border-b border-border-default px-4 py-3">
                <h2 className="font-display text-base font-semibold text-text-primary">
                  Nodos ({nodes.length})
                </h2>
                <p className="mt-1 text-xs text-text-secondary">
                  Selecciona un nodo para centrar su información.
                </p>
              </div>
              <div className="divide-y divide-border-default">
                {nodes.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedId(node.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-elevated ${
                      node.id === selectedId ? "bg-primary-100" : ""
                    }`}
                    aria-pressed={node.id === selectedId}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-text-primary">
                        {node.name}
                      </span>
                      <Badge
                        variant={
                          node.mapStatus === "critical"
                            ? "danger"
                            : node.mapStatus === "warning"
                              ? "warning"
                              : node.mapStatus === "optimal"
                                ? "success"
                                : "neutral"
                        }
                      >
                        {connectionLabel(node.mapStatus)}
                      </Badge>
                    </span>
                    <span className="mt-1 block text-xs text-text-secondary">
                      {node.crop?.name || "Sin cultivo"} ·{" "}
                      {node.state?.name || "Sin estado"}
                    </span>
                    <span className="mt-1 block text-xs text-text-muted">
                      {formatTimestamp(
                        node.lastReading || node.readings[0]?.timestamp || null,
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </aside>
          )}
        </div>
      )}

      <Modal
        open={Boolean(detailsNode)}
        onClose={() => setDetailsNode(null)}
        title={detailsNode?.name || "Detalle del nodo"}
        description="Últimas lecturas, asignación y estado del nodo."
      >
        {detailsNode && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  detailsNode.status === "critical"
                    ? "danger"
                    : detailsNode.status === "warning"
                      ? "warning"
                      : detailsNode.status === "optimal"
                        ? "success"
                        : "neutral"
                }
              >
                {connectionLabel(detailsNode.status)}
              </Badge>
              <span className="text-sm text-text-secondary">{detailsNode.deviceId}</span>
            </div>
            <p className="text-sm text-text-secondary">
              {detailsNode.cropName || "Sin cultivo"} ·{" "}
              {detailsNode.stateName || "Sin estado"}
            </p>
            {detailsNode.alertMessage && (
              <p className="rounded-md bg-red-50 p-3 text-sm text-danger">
                {detailsNode.alertMessage}
              </p>
            )}
            {detailsNode.readings ? (
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Humedad", `${detailsNode.readings.humidity}%`],
                  ["pH", detailsNode.readings.ph],
                  ["Salinidad", `${detailsNode.readings.salinity} dS/m`],
                  ["Temperatura del suelo", `${detailsNode.readings.soilTemp} °C`],
                  ["Temperatura ambiente", `${detailsNode.readings.ambientTemp} °C`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded border border-border-default p-3">
                    <dt className="text-xs text-text-muted">{label}</dt>
                    <dd className="mt-1 font-mono text-sm font-semibold text-text-primary">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="rounded border border-dashed border-border-default p-4 text-sm text-text-secondary">
                Este nodo aún no tiene lecturas registradas.
              </p>
            )}
            <p className="text-xs text-text-muted">
              Última lectura: {formatTimestamp(detailsNode.timestamp)}
            </p>
          </div>
        )}
      </Modal>
    </section>
  );
}
