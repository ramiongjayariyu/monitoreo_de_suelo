import { useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import { Activity, Pencil, Plus, Search, Trash2, Waves } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { type NodeInput, type NodeOptionsCrop, type NodeRecord } from "@/api/nodes";
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
  Textarea,
  useToast,
  type TableColumn,
} from "@/components/common";
import { useAuth } from "@/context/AuthContext";
import { useNodes } from "@/hooks/useNodes";
import type { NodeStatus } from "@/types";

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
    return error.response.data.message;
  }
  return "No se pudo completar la operación.";
}

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return "Sin lecturas";
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime())
    ? "Fecha no disponible"
    : new Intl.DateTimeFormat("es", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(parsed);
}

function BatteryBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-text-muted">Sin dato</span>;
  const percentage = Math.max(0, Math.min(100, value));
  const color =
    percentage <= 20 ? "bg-danger" : percentage <= 50 ? "bg-warning" : "bg-success";
  return (
    <div className="min-w-20">
      <div
        className="h-2 overflow-hidden rounded-full bg-elevated"
        aria-label={`Batería ${percentage}%`}
      >
        <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="mt-1 block text-xs text-text-secondary">{percentage}%</span>
    </div>
  );
}

function NodeForm({
  node,
  crops,
  saving,
  onSubmit,
  onClose,
}: {
  node: NodeRecord | null;
  crops: NodeOptionsCrop[];
  saving: boolean;
  onSubmit: (input: NodeInput) => Promise<void>;
  onClose: () => void;
}) {
  const [cropId, setCropId] = useState(node?.cropId || "");
  const [stateId, setStateId] = useState(node?.stateId || "");
  const [error, setError] = useState("");
  const states = crops.find((crop) => crop.id === cropId)?.states || [];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await onSubmit({
        deviceId: String(form.get("deviceId") || ""),
        name: String(form.get("name") || ""),
        notes: String(form.get("notes") || "").trim() || null,
        posX: Number(form.get("posX")),
        posY: Number(form.get("posY")),
        samplingFreq: Number(form.get("samplingFreq")),
        cropId: cropId || null,
        stateId: String(form.get("stateId") || "") || null,
      });
      onClose();
    } catch (submitError) {
      setError(errorMessage(submitError));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p role="alert" className="rounded bg-red-50 p-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="ID del dispositivo" htmlFor="node-device-id">
          <Input
            id="node-device-id"
            name="deviceId"
            required
            maxLength={100}
            defaultValue={node?.deviceId || ""}
          />
        </FormField>
        <FormField label="Nombre del nodo" htmlFor="node-name">
          <Input
            id="node-name"
            name="name"
            required
            minLength={2}
            maxLength={100}
            defaultValue={node?.name || ""}
          />
        </FormField>
      </div>
      <FormField label="Notas" htmlFor="node-notes">
        <Textarea
          id="node-notes"
          name="notes"
          maxLength={1000}
          defaultValue={node?.notes || ""}
          placeholder="Ubicación o detalles del equipo"
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Cultivo" htmlFor="node-crop">
          <Select
            id="node-crop"
            value={cropId}
            onChange={(event) => {
              setCropId(event.target.value);
              setStateId("");
            }}
          >
            <option value="">Sin cultivo</option>
            {crops.map((crop) => (
              <option key={crop.id} value={crop.id}>
                {crop.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Estado del cultivo" htmlFor="node-state">
          <Select
            id="node-state"
            name="stateId"
            value={stateId}
            onChange={(event) => setStateId(event.target.value)}
            disabled={!cropId}
          >
            <option value="">Sin estado</option>
            {states.map((state) => (
              <option key={state.id} value={state.id}>
                {state.name}
                {state.isActive ? " (vigente)" : ""}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Posición X (0–100)" htmlFor="node-pos-x">
          <Input
            id="node-pos-x"
            name="posX"
            type="number"
            min={0}
            max={100}
            required
            defaultValue={node?.posX ?? 50}
          />
        </FormField>
        <FormField label="Posición Y (0–100)" htmlFor="node-pos-y">
          <Input
            id="node-pos-y"
            name="posY"
            type="number"
            min={0}
            max={100}
            required
            defaultValue={node?.posY ?? 50}
          />
        </FormField>
        <FormField label="Frecuencia (segundos)" htmlFor="node-frequency">
          <Input
            id="node-frequency"
            name="samplingFreq"
            type="number"
            min={5}
            max={86400}
            step={1}
            required
            defaultValue={node?.samplingFreq ?? 300}
          />
        </FormField>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {node ? "Guardar cambios" : "Crear nodo"}
        </Button>
      </div>
    </form>
  );
}

function NodeDetails({ node }: { node: NodeRecord }) {
  const reading = node.readings[0];
  const readingValues = reading
    ? [
        ["Humedad", `${reading.humidity}%`],
        ["pH", reading.ph],
        ["Salinidad", `${reading.salinity} dS/m`],
        ["Temperatura del suelo", `${reading.soilTemp} °C`],
        ["Temperatura ambiente", `${reading.ambientTemp} °C`],
      ]
    : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={node.status === "ONLINE" ? "success" : "neutral"}>
          {node.status === "ONLINE" ? "En línea" : "Sin conexión"}
        </Badge>
        <span className="text-sm text-text-secondary">ID: {node.deviceId}</span>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-text-muted">Cultivo</dt>
          <dd className="mt-1 text-sm">{node.crop?.name || "Sin asignar"}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">Estado</dt>
          <dd className="mt-1 text-sm">{node.state?.name || "Sin asignar"}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">Frecuencia</dt>
          <dd className="mt-1 text-sm">Cada {node.samplingFreq} segundos</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">Última lectura</dt>
          <dd className="mt-1 text-sm">
            {formatTimestamp(node.lastReading || reading?.timestamp || null)}
          </dd>
        </div>
      </dl>
      {node.notes && (
        <p className="rounded bg-elevated p-3 text-sm text-text-secondary">
          {node.notes}
        </p>
      )}
      <div>
        <h3 className="mb-2 text-sm font-semibold">Lecturas actuales</h3>
        {readingValues.length ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            {readingValues.map(([label, value]) => (
              <div key={label} className="rounded border border-border-default p-3">
                <dt className="text-xs text-text-muted">{label}</dt>
                <dd className="mt-1 font-mono text-sm font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="rounded border border-dashed border-border-default p-4 text-sm text-text-secondary">
            Este nodo aún no tiene lecturas registradas.
          </p>
        )}
      </div>
    </div>
  );
}

export function NodesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [cropFilter, setCropFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NodeRecord | null>(null);
  const [selected, setSelected] = useState<NodeRecord | null>(null);
  const [deleting, setDeleting] = useState<NodeRecord | null>(null);
  const filters = useMemo(
    () => ({
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(cropFilter ? { cropId: cropFilter } : {}),
      ...(statusFilter === "ONLINE" || statusFilter === "OFFLINE"
        ? { status: statusFilter as NodeStatus }
        : {}),
    }),
    [cropFilter, search, statusFilter],
  );
  const {
    nodesQuery,
    optionsQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    positionMutation,
    assignMutation,
  } = useNodes(filters);
  const canManage = user?.role === "ADMIN" || user?.role === "OPERADOR";

  useEffect(() => {
    if (!canManage) return;
    if (searchParams.get("create") === "1") {
      setEditing(null);
      setFormOpen(true);
      setSearchParams({}, { replace: true });
      return;
    }
    const editId = searchParams.get("edit");
    if (!editId || !nodesQuery.data) return;
    const node = nodesQuery.data.find((item) => item.id === editId);
    if (node) {
      setEditing(node);
      setFormOpen(true);
    } else {
      showToast({
        title: "No se encontró el nodo",
        description: "Verifica que el nodo siga disponible y vuelve a intentarlo.",
        type: "warning",
      });
    }
    setSearchParams({}, { replace: true });
  }, [canManage, nodesQuery.data, searchParams, setSearchParams, showToast]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(node: NodeRecord) {
    setEditing(node);
    setFormOpen(true);
  }

  async function saveNode(input: NodeInput) {
    if (editing) {
      const updated = await updateMutation.mutateAsync({
        id: editing.id,
        input,
      });
      showToast({ title: "Nodo actualizado", type: "success" });
      if (selected?.id === updated.id) setSelected(updated);
    } else {
      await createMutation.mutateAsync(input);
      showToast({ title: "Nodo creado", type: "success" });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      showToast({ title: "Nodo eliminado", type: "success" });
      setDeleting(null);
      if (selected?.id === deleting.id) setSelected(null);
    } catch (error) {
      showToast({
        title: "No se pudo eliminar el nodo",
        description: errorMessage(error),
        type: "danger",
      });
    }
  }

  const columns: TableColumn<NodeRecord>[] = [
    {
      key: "node",
      header: "Nodo",
      sortValue: (node) => node.name,
      render: (node) => (
        <button
          type="button"
          onClick={() => setSelected(node)}
          className="flex items-center gap-3 text-left hover:text-primary-700"
        >
          <span className="grid size-9 place-items-center rounded-full bg-primary-100 text-primary-700">
            <Waves aria-hidden="true" className="size-4" />
          </span>
          <span>
            <span className="block font-semibold">{node.name}</span>
            <span className="block text-xs text-text-muted">{node.deviceId}</span>
          </span>
        </button>
      ),
    },
    {
      key: "crop",
      header: "Cultivo / estado",
      sortValue: (node) => node.crop?.name || "",
      render: (node) => (
        <span>
          {node.crop?.name || "Sin asignar"}
          <span className="block text-xs text-text-muted">
            {node.state?.name || "Sin estado"}
          </span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Conexión",
      sortValue: (node) => node.status,
      render: (node) => (
        <Badge variant={node.status === "ONLINE" ? "success" : "neutral"}>
          <span className="inline-flex items-center gap-1.5">
            <Activity aria-hidden="true" className="size-3" />
            {node.status === "ONLINE" ? "En línea" : "Sin conexión"}
          </span>
        </Badge>
      ),
    },
    {
      key: "battery",
      header: "Batería",
      render: (node) => <BatteryBar value={node.battery} />,
    },
    {
      key: "reading",
      header: "Última lectura",
      sortValue: (node) => node.lastReading || "",
      render: (node) => (
        <span className="text-xs">
          {formatTimestamp(node.lastReading || node.readings[0]?.timestamp || null)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      render: (node) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(node)}
            disabled={!canManage}
            aria-label={`Editar ${node.name}`}
          >
            <Pencil aria-hidden="true" className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleting(node)}
            disabled={!canManage}
            aria-label={`Eliminar ${node.name}`}
          >
            <Trash2 aria-hidden="true" className="size-4 text-danger" />
          </Button>
        </div>
      ),
    },
  ];

  const selectedNode = selected
    ? nodesQuery.data?.find((node) => node.id === selected.id) || selected
    : null;

  return (
    <>
      <PageHeader
        title="Nodos"
        description="Administra los dispositivos y consulta su estado de conexión."
        breadcrumb={["Monitoreo", "Nodos"]}
        actions={
          canManage ? (
            <Button
              icon={<Plus aria-hidden="true" className="size-4" />}
              onClick={openCreate}
            >
              Agregar nodo
            </Button>
          ) : undefined
        }
      />
      <Card>
        <CardContent className="space-y-4">
          {nodesQuery.isError && (
            <p role="alert" className="rounded bg-red-50 p-3 text-sm text-danger">
              No se pudieron cargar los nodos: {errorMessage(nodesQuery.error)}
            </p>
          )}
          <div className="grid gap-3 md:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.7fr)_minmax(10rem,0.7fr)]">
            <FormField label="Buscar nodo" htmlFor="nodes-search">
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
                />
                <Input
                  id="nodes-search"
                  className="pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nombre o ID de dispositivo"
                />
              </div>
            </FormField>
            <FormField label="Cultivo" htmlFor="nodes-crop-filter">
              <Select
                id="nodes-crop-filter"
                value={cropFilter}
                onChange={(event) => setCropFilter(event.target.value)}
              >
                <option value="">Todos los cultivos</option>
                {(optionsQuery.data || []).map((crop) => (
                  <option key={crop.id} value={crop.id}>
                    {crop.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Conexión" htmlFor="nodes-status-filter">
              <Select
                id="nodes-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="ONLINE">En línea</option>
                <option value="OFFLINE">Sin conexión</option>
              </Select>
            </FormField>
          </div>
          {optionsQuery.isError && (
            <p role="alert" className="text-sm text-danger">
              No se pudieron cargar cultivos y estados para el filtro.
            </p>
          )}
          <Table
            columns={columns}
            rows={nodesQuery.data || []}
            loading={nodesQuery.isLoading}
            emptyTitle="No hay nodos"
            emptyDescription="No se encontraron dispositivos con estos filtros."
          />
        </CardContent>
      </Card>
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Editar nodo" : "Agregar nodo"}
        description="Configura el dispositivo, su ubicación y su asignación."
        className="max-w-2xl"
      >
        {optionsQuery.isLoading && (
          <p className="text-sm text-text-secondary">Cargando cultivos y estados...</p>
        )}
        {optionsQuery.isError && (
          <p role="alert" className="text-sm text-danger">
            No se pudieron cargar cultivos y estados: {errorMessage(optionsQuery.error)}
          </p>
        )}
        {optionsQuery.data && (
          <NodeForm
            key={editing?.id || "new-node"}
            node={editing}
            crops={optionsQuery.data}
            saving={createMutation.isPending || updateMutation.isPending}
            onSubmit={saveNode}
            onClose={() => setFormOpen(false)}
          />
        )}
      </Modal>
      <Modal
        open={Boolean(selectedNode)}
        onClose={() => setSelected(null)}
        title={selectedNode?.name || "Detalle del nodo"}
        description="Estado de conexión y lecturas más recientes."
      >
        {selectedNode && <NodeDetails node={selectedNode} />}
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        loading={deleteMutation.isPending}
        title={`¿Eliminar ${deleting?.name || "este nodo"}?`}
        description={`El nodo tiene ${deleting?._count.readings ?? 0} lecturas y ${deleting?._count.alerts ?? 0} alertas asociadas. No se eliminará si tiene datos históricos; en ese caso, la API indicará cómo proceder.`}
        confirmLabel="Eliminar nodo"
      />
      <span className="sr-only" aria-live="polite">
        {positionMutation.isPending || assignMutation.isPending
          ? "Actualizando nodo"
          : ""}
      </span>
    </>
  );
}
