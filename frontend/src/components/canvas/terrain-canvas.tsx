import { useEffect, useRef, useState } from "react";
import { Grid2X2, Minus, Plus, Tag, TriangleAlert } from "lucide-react";
import { Button } from "@/components/common/primitives";
import { Badge, Semaphore, type SemaphoreStatus } from "@/components/common/display";
import { cn } from "@/utils/cn";

export interface TerrainReadings {
  humidity: number;
  ph: number;
  salinity: number;
  soilTemp: number;
  ambientTemp: number;
}

export interface TerrainNode {
  id: string;
  deviceId: string;
  name: string;
  x: number;
  y: number;
  status: SemaphoreStatus;
  readings: TerrainReadings | null;
  timestamp: string | null;
  cropName: string | null;
  stateName: string | null;
  battery: number | null;
  alertMessage: string | null;
}

const readingLabels: Array<{
  key: keyof TerrainReadings;
  label: string;
  unit: string;
}> = [
  { key: "humidity", label: "Humedad", unit: "%" },
  { key: "ph", label: "pH", unit: "" },
  { key: "salinity", label: "Salinidad", unit: "dS/m" },
  { key: "soilTemp", label: "Temperatura del suelo", unit: "°C" },
  { key: "ambientTemp", label: "Temperatura ambiente", unit: "°C" },
];

const statusStyle: Record<SemaphoreStatus, string> = {
  optimal: "border-success bg-success",
  warning: "border-warning bg-warning",
  critical: "border-danger bg-danger",
  offline: "border-neutral bg-neutral",
};

export function NodeMarker({
  node,
  selected,
  onSelect,
  onMove,
  canvasRef,
  showLabels,
  showAlerts,
  canMove,
}: {
  node: TerrainNode;
  selected: boolean;
  onSelect: () => void;
  onMove?: (position: { x: number; y: number }) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  showLabels: boolean;
  showAlerts: boolean;
  canMove: boolean;
}) {
  const dragStart = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const [dragPosition, setDragPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  function pointerPosition(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: Math.max(3, Math.min(97, ((clientX - bounds.left) / bounds.width) * 100)),
      y: Math.max(5, Math.min(95, ((clientY - bounds.top) / bounds.height) * 100)),
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (!canMove || !onMove || event.button !== 0) return;
    dragStart.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (dragStart.current?.pointerId !== event.pointerId) return;
    const dx = event.clientX - dragStart.current.clientX;
    const dy = event.clientY - dragStart.current.clientY;
    if (Math.hypot(dx, dy) < 4) return;
    const position = pointerPosition(event.clientX, event.clientY);
    if (position) setDragPosition(position);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (dragStart.current?.pointerId !== event.pointerId) return;
    const dx = event.clientX - dragStart.current.clientX;
    const dy = event.clientY - dragStart.current.clientY;
    dragStart.current = null;
    if (Math.hypot(dx, dy) >= 4) {
      const position = pointerPosition(event.clientX, event.clientY);
      if (position) onMove?.({ x: Math.round(position.x), y: Math.round(position.y) });
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    }
    setDragPosition(null);
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (!suppressClick.current) onSelect();
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        left: `${dragPosition?.x ?? node.x}%`,
        top: `${dragPosition?.y ?? node.y}%`,
        touchAction: canMove ? "none" : "auto",
      }}
      aria-label={`${node.name}, ${node.status === "optimal" ? "Óptimo" : node.status === "warning" ? "Advertencia" : node.status === "critical" ? "Crítico" : "Sin conexión"}`}
      className={cn(
        "group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5",
        canMove && "cursor-grab active:cursor-grabbing",
      )}
    >
      <span
        className={cn(
          "grid size-10 place-items-center rounded-full border-[3px] border-white text-white shadow-md transition-transform group-hover:scale-110",
          statusStyle[node.status],
          selected && "scale-110 ring-2 ring-primary-900 ring-offset-2",
          showAlerts &&
            node.alertMessage &&
            node.status === "critical" &&
            "ring-2 ring-danger/40 ring-offset-2",
          showAlerts &&
            node.alertMessage &&
            node.status === "warning" &&
            "ring-2 ring-warning/50 ring-offset-2",
        )}
      >
        <span className="size-2 rounded-full bg-white" />
      </span>
      {showLabels && (
        <span className="whitespace-nowrap rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-semibold text-text-primary shadow-sm">
          {node.name}
        </span>
      )}
    </button>
  );
}

export function NodePopup({
  node,
  onClose,
  onView,
  onEdit,
  canEdit,
}: {
  node: TerrainNode;
  onClose: () => void;
  onView?: (node: TerrainNode) => void;
  onEdit?: (node: TerrainNode) => void;
  canEdit: boolean;
}) {
  return (
    <aside
      className="absolute z-20 w-64 -translate-x-1/2 rounded-md border border-border-default bg-white p-4 shadow-lg"
      style={{ left: `${node.x}%`, top: `calc(${node.y}% + 36px)` }}
      aria-label={`Lecturas de ${node.name}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display font-semibold text-text-primary">{node.name}</h3>
          <div className="mt-1">
            <Semaphore status={node.status} />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-1 text-text-muted hover:bg-elevated"
          aria-label="Cerrar lecturas"
        >
          ×
        </button>
      </div>
      <p className="mt-2 text-xs text-text-secondary">
        {node.cropName || "Sin cultivo"} · {node.stateName || "Sin estado"}
      </p>
      <p className="mt-1 text-xs text-text-secondary">ID: {node.deviceId}</p>
      {node.battery !== null && (
        <p className="mt-1 text-xs text-text-secondary">Batería: {node.battery}%</p>
      )}
      {node.alertMessage && (
        <p className="mt-2 rounded bg-red-50 p-2 text-xs text-danger">
          {node.alertMessage}
        </p>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        {readingLabels.map(({ key, label, unit }) => (
          <div key={key}>
            <dt className="text-[10px] text-text-muted">{label}</dt>
            <dd className="font-mono text-xs font-semibold text-text-primary">
              {node.readings ? `${node.readings[key]} ${unit}` : "Sin lectura"}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[10px] text-text-muted">
        Última lectura: {node.timestamp || "Sin lecturas"}
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={() => onView?.(node)}
        >
          Ver detalle
        </Button>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => onEdit?.(node)}
          >
            Editar
          </Button>
        )}
      </div>
    </aside>
  );
}

export function TerrainCanvas({
  nodes,
  onPositionChange,
  onNodeView,
  onNodeEdit,
  canMove = true,
  selectedId: selectedNodeId,
  onSelectNode,
}: {
  nodes: TerrainNode[];
  onPositionChange?: (id: string, position: { x: number; y: number }) => void;
  onNodeView?: (node: TerrainNode) => void;
  onNodeEdit?: (node: TerrainNode) => void;
  canMove?: boolean;
  selectedId?: string | null;
  onSelectNode?: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const selectedId = selectedNodeId === undefined ? internalSelectedId : selectedNodeId;
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const selectedNode = nodes.find((node) => node.id === selectedId);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((value) =>
        Math.max(0.75, Math.min(1.5, value + (event.deltaY < 0 ? 0.1 : -0.1))),
      );
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div className="overflow-hidden rounded-md border border-border-default bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default p-3">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setZoom((value) => Math.max(0.75, value - 0.1))}
            aria-label="Alejar"
          >
            <Minus aria-hidden="true" className="size-4" />
          </Button>
          <span className="w-12 text-center font-mono text-xs text-text-secondary">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setZoom((value) => Math.min(1.5, value + 0.1))}
            aria-label="Acercar"
          >
            <Plus aria-hidden="true" className="size-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Capas del mapa">
          <Button
            variant={showGrid ? "primary" : "secondary"}
            size="sm"
            onClick={() => setShowGrid((value) => !value)}
            aria-pressed={showGrid}
          >
            <Grid2X2 aria-hidden="true" className="size-4" />
            Cuadrícula
          </Button>
          <Button
            variant={showLabels ? "primary" : "secondary"}
            size="sm"
            onClick={() => setShowLabels((value) => !value)}
            aria-pressed={showLabels}
          >
            <Tag aria-hidden="true" className="size-4" />
            Etiquetas
          </Button>
          <Button
            variant={showAlerts ? "primary" : "secondary"}
            size="sm"
            onClick={() => setShowAlerts((value) => !value)}
            aria-pressed={showAlerts}
          >
            <TriangleAlert aria-hidden="true" className="size-4" />
            Alertas
          </Button>
        </div>
      </div>
      <div
        ref={canvasRef}
        className="relative aspect-[16/9] min-h-[360px] overflow-hidden bg-canvas"
        onDragOver={(event) => event.preventDefault()}
        aria-label={`Lienzo del terreno. ${canMove ? "Arrastra los nodos para cambiar su posición." : "Selecciona un nodo para ver sus lecturas."}`}
        role="region"
      >
        <div
          className={cn(
            "absolute inset-0 origin-top-left transition-transform duration-150",
            showGrid &&
              "bg-[linear-gradient(to_right,#DCE5DF_1px,transparent_1px),linear-gradient(to_bottom,#DCE5DF_1px,transparent_1px)] bg-[size:32px_32px]",
          )}
          style={{
            transform: `scale(${zoom})`,
            width: `${100 / zoom}%`,
            height: `${100 / zoom}%`,
          }}
        >
          {nodes.map((node) => (
            <NodeMarker
              key={node.id}
              node={node}
              selected={selectedId === node.id}
              onSelect={() => {
                setInternalSelectedId(node.id);
                onSelectNode?.(node.id);
              }}
              onMove={
                onPositionChange
                  ? (position) => onPositionChange(node.id, position)
                  : undefined
              }
              canvasRef={canvasRef}
              showLabels={showLabels}
              showAlerts={showAlerts}
              canMove={canMove && Boolean(onPositionChange)}
            />
          ))}
          {selectedNode && (
            <NodePopup
              node={selectedNode}
              onClose={() => {
                setInternalSelectedId(null);
                onSelectNode?.("");
              }}
              onView={onNodeView}
              onEdit={onNodeEdit}
              canEdit={canMove && Boolean(onNodeEdit)}
            />
          )}
        </div>
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 rounded-md border border-border-default bg-white/95 p-2 shadow-sm">
          {(["optimal", "warning", "critical", "offline"] as const).map((status) => {
            const label = {
              optimal: "Óptimo",
              warning: "Advertencia",
              critical: "Crítico",
              offline: "Sin conexión",
            }[status];
            return (
              <Badge
                key={status}
                variant={
                  status === "optimal"
                    ? "success"
                    : status === "warning"
                      ? "warning"
                      : status === "critical"
                        ? "danger"
                        : "neutral"
                }
              >
                {label} {nodes.filter((node) => node.status === status).length}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}
