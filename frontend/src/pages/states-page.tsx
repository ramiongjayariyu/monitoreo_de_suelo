import { useState, type FormEvent } from "react";
import axios from "axios";
import { ArrowLeft, Check, Pencil, Plus, Sprout, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  type CropStateInput,
  type CropStateRecord,
  type CropRangesInput,
} from "@/api/crops";
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
  RangeEditor,
  Toggle,
  variableRows,
  useToast,
} from "@/components/common";
import { useAuth } from "@/context/AuthContext";
import { useCropStates } from "@/hooks/useCropStates";
import type { CropRanges } from "@/types";

const emptyRanges: CropRangesInput = {
  humidity: { min: 0, max: 100 },
  ph: { min: 0, max: 14 },
  salinity: { min: 0, max: 10 },
  soilTemp: { min: -10, max: 60 },
  ambientTemp: { min: -10, max: 60 },
};

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
    return error.response.data.message;
  }
  return "No se pudo completar la operación.";
}

function StateForm({
  state,
  nextOrder,
  saving,
  onSave,
  onClose,
}: {
  state: CropStateRecord | null;
  nextOrder: number;
  saving: boolean;
  onSave: (input: CropStateInput) => Promise<void>;
  onClose: () => void;
}) {
  const [ranges, setRanges] = useState<CropRangesInput>(() =>
    state
      ? (Object.fromEntries(
          variableRows.map(({ key }) => [key, { ...state.ranges[key] }]),
        ) as CropRangesInput)
      : emptyRanges,
  );
  const [active, setActive] = useState(state?.isActive ?? false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const invalidRange = variableRows.find(
      ({ key }) =>
        !Number.isFinite(ranges[key].min) ||
        !Number.isFinite(ranges[key].max) ||
        ranges[key].min >= ranges[key].max,
    );
    if (invalidRange) {
      setError(`${invalidRange.label}: el mínimo debe ser menor que el máximo.`);
      return;
    }
    const form = new FormData(event.currentTarget);
    const order = Number(form.get("order"));
    if (!Number.isInteger(order) || order < 1) {
      setError("El orden debe ser un número entero positivo.");
      return;
    }
    try {
      await onSave({
        name: String(form.get("name") || "").trim(),
        order,
        isActive: active,
        ranges,
      });
      onClose();
    } catch (saveError) {
      setError(errorMessage(saveError));
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <p role="alert" className="rounded bg-red-50 p-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nombre del estado" htmlFor="state-name">
          <Input
            id="state-name"
            name="name"
            required
            minLength={2}
            maxLength={100}
            defaultValue={state?.name || ""}
          />
        </FormField>
        <FormField
          label="Orden"
          htmlFor="state-order"
          hint="Define la posición de esta etapa en la secuencia."
        >
          <Input
            id="state-order"
            name="order"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={state?.order ?? nextOrder}
          />
        </FormField>
      </div>
      <div className="flex items-center justify-between rounded-md border border-border-default p-3">
        <div>
          <p className="text-sm font-medium text-text-primary">Estado vigente</p>
          <p className="text-xs text-text-muted">
            Al activarlo, reemplaza al estado vigente actual.
          </p>
        </div>
        <Toggle
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          aria-label="Estado vigente"
        />
      </div>
      <RangeEditor
        ranges={ranges}
        onChange={setRanges}
        error={error.includes("mínimo") ? error : undefined}
        description="Rangos de referencia específicos para esta etapa del cultivo."
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {state ? "Guardar cambios" : "Crear estado"}
        </Button>
      </div>
    </form>
  );
}

function StateTimeline({ states }: { states: CropStateRecord[] }) {
  return (
    <Card>
      <CardContent>
        <h2 className="font-display text-lg font-semibold text-text-primary">
          Secuencia de etapas
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Orden de los estados del cultivo; no representa fechas reales.
        </p>
        {states.length ? (
          <ol className="mt-5 flex flex-col gap-3 sm:flex-row">
            {states.map((state, index) => (
              <li key={state.id} className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  className={`min-w-0 flex-1 rounded-md border-2 p-4 ${state.isActive ? "border-primary-500 bg-primary-50" : "border-border-default bg-white"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      Etapa {state.order}
                    </span>
                    {state.isActive && <Badge variant="success">Vigente</Badge>}
                  </div>
                  <p className="mt-2 truncate font-semibold text-text-primary">
                    {state.name}
                  </p>
                </div>
                {index < states.length - 1 && (
                  <span aria-hidden="true" className="hidden text-primary-500 sm:block">
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 rounded-md border border-dashed border-border-default p-6 text-center text-sm text-text-secondary">
            Agrega estados para definir la secuencia de etapas del cultivo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function formatRanges(ranges: CropRanges) {
  return variableRows.map(({ key, label, unit }) => (
    <span
      key={key}
      className="rounded-full bg-elevated px-2.5 py-1 text-xs text-text-secondary"
    >
      {label}: {ranges[key]?.min}–{ranges[key]?.max} {unit}
    </span>
  ));
}

export function StatesPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const {
    statesQuery,
    createMutation,
    updateMutation,
    activateMutation,
    deleteMutation,
  } = useCropStates(id);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CropStateRecord | null>(null);
  const [deleting, setDeleting] = useState<CropStateRecord | null>(null);
  const [activating, setActivating] = useState<CropStateRecord | null>(null);
  const canManage = user?.role === "ADMIN" || user?.role === "OPERADOR";
  const crop = statesQuery.data?.crop;
  const states = statesQuery.data?.states ?? [];
  const nextOrder = states.reduce((max, state) => Math.max(max, state.order), 0) + 1;
  const activeState = states.find((state) => state.isActive);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(state: CropStateRecord) {
    setEditing(state);
    setFormOpen(true);
  }

  async function saveState(input: CropStateInput) {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, input });
      showToast({ title: "Estado actualizado", type: "success" });
    } else {
      await createMutation.mutateAsync(input);
      showToast({ title: "Estado creado", type: "success" });
    }
  }

  async function confirmActivate() {
    if (!activating) return;
    try {
      await activateMutation.mutateAsync(activating.id);
      showToast({ title: "Estado vigente actualizado", type: "success" });
      setActivating(null);
    } catch (error) {
      showToast({
        title: "No se pudo activar el estado",
        description: errorMessage(error),
        type: "danger",
      });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      showToast({ title: "Estado eliminado", type: "success" });
      setDeleting(null);
    } catch (error) {
      showToast({
        title: "No se pudo eliminar el estado",
        description: errorMessage(error),
        type: "danger",
      });
    }
  }

  return (
    <>
      <PageHeader
        title={crop?.name ? `Estados de ${crop.name}` : "Estados del cultivo"}
        description={
          crop?.description || "Define las etapas y sus rangos de referencia específicos."
        }
        breadcrumb={["Administración", "Cultivos", crop?.name || "Estados"]}
        actions={
          canManage && crop ? (
            <Button
              icon={<Plus aria-hidden="true" className="size-4" />}
              onClick={openCreate}
            >
              Agregar estado
            </Button>
          ) : undefined
        }
      />
      <Link
        to="/crops"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver a cultivos
      </Link>
      {statesQuery.isError && (
        <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-danger">
          No se pudieron cargar los estados: {errorMessage(statesQuery.error)}
        </p>
      )}
      {statesQuery.isLoading ? (
        <div
          className="h-44 animate-pulse rounded-md bg-elevated"
          aria-label="Cargando estados"
        />
      ) : crop ? (
        <div className="space-y-5">
          <StateTimeline states={states} />
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-elevated text-xs uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Orden</th>
                      <th className="px-4 py-3">Rangos de referencia</th>
                      <th className="px-4 py-3">Vigencia</th>
                      {canManage && <th className="px-4 py-3">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {states.map((state) => (
                      <tr key={state.id}>
                        <td className="px-4 py-4 font-medium text-text-primary">
                          {state.name}
                        </td>
                        <td className="px-4 py-4">{state.order}</td>
                        <td className="px-4 py-4">
                          <div className="flex max-w-2xl flex-wrap gap-1.5">
                            {formatRanges(state.ranges)}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {state.isActive ? (
                            <Badge variant="success">Vigente</Badge>
                          ) : (
                            <Badge>Inactivo</Badge>
                          )}
                        </td>
                        {canManage && (
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1">
                              {!state.isActive && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setActivating(state)}
                                  icon={<Check aria-hidden="true" className="size-4" />}
                                >
                                  Activar
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(state)}
                                aria-label={`Editar ${state.name}`}
                              >
                                <Pencil aria-hidden="true" className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={state.isActive || state._count.nodes > 0}
                                title={
                                  state.isActive
                                    ? "No se puede eliminar el estado vigente"
                                    : state._count.nodes
                                      ? `Tiene ${state._count.nodes} nodos asociados`
                                      : "Eliminar estado"
                                }
                                onClick={() => setDeleting(state)}
                                aria-label={`Eliminar ${state.name}`}
                              >
                                <Trash2
                                  aria-hidden="true"
                                  className="size-4 text-danger"
                                />
                              </Button>
                            </div>
                            {state._count.nodes > 0 && (
                              <p className="mt-1 text-xs text-text-muted">
                                {state._count.nodes} nodo(s) asociado(s)
                              </p>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!states.length && (
                  <div className="px-6 py-10 text-center">
                    <Sprout
                      aria-hidden="true"
                      className="mx-auto size-8 text-primary-500"
                    />
                    <p className="mt-2 text-sm text-text-secondary">
                      Este cultivo todavía no tiene estados.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : !statesQuery.isError ? (
        <p className="rounded-md border border-border-default bg-white p-6 text-sm text-text-secondary">
          No se encontró el cultivo solicitado.
        </p>
      ) : null}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Editar estado" : "Agregar estado"}
        description={
          editing
            ? `Actualiza los datos de ${editing.name}.`
            : `Agrega una etapa para ${crop?.name || "el cultivo"}.`
        }
        className="max-w-3xl"
      >
        <StateForm
          key={editing?.id || "new-state"}
          state={editing}
          nextOrder={nextOrder}
          saving={createMutation.isPending || updateMutation.isPending}
          onSave={saveState}
          onClose={() => setFormOpen(false)}
        />
      </Modal>
      <ConfirmDialog
        open={Boolean(activating)}
        onClose={() => setActivating(null)}
        onConfirm={() => void confirmActivate()}
        loading={activateMutation.isPending}
        title={`¿Activar ${activating?.name || "este estado"}?`}
        description={
          activeState
            ? `Esta acción reemplazará a ${activeState.name} como estado vigente del cultivo.`
            : "Este será el estado vigente del cultivo."
        }
        confirmLabel="Activar estado"
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        loading={deleteMutation.isPending}
        title={`¿Eliminar ${deleting?.name || "este estado"}?`}
        description={`Tiene ${deleting?._count.nodes ?? 0} nodos asociados. Los estados vigentes o asignados a nodos no se pueden eliminar.`}
        confirmLabel="Eliminar estado"
      />
    </>
  );
}
