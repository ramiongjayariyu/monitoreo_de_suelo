import { useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import { Leaf, Pencil, Plus, Search, Sprout, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { type CropInput, type CropRangesInput, type CropRecord } from "@/api/crops";
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
  Textarea,
  variableRows,
  useToast,
} from "@/components/common";
import { useAuth } from "@/context/AuthContext";
import { useCrops } from "@/hooks/useCrops";

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

function CropForm({
  crop,
  saving,
  onSave,
  onClose,
}: {
  crop: CropRecord | null;
  saving: boolean;
  onSave: (input: CropInput) => Promise<void>;
  onClose: () => void;
}) {
  const [ranges, setRanges] = useState<CropRangesInput>(() => {
    if (!crop) return emptyRanges;
    return Object.fromEntries(
      variableRows.map(({ key }) => [key, { ...crop.ranges[key] }]),
    ) as CropRangesInput;
  });
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
    try {
      await onSave({
        name: String(form.get("name") || "").trim(),
        description: String(form.get("description") || "").trim() || null,
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
      <FormField label="Nombre del cultivo" htmlFor="crop-name">
        <Input
          id="crop-name"
          name="name"
          required
          minLength={2}
          maxLength={100}
          defaultValue={crop?.name || ""}
        />
      </FormField>
      <FormField label="Descripción" htmlFor="crop-description">
        <Textarea
          id="crop-description"
          name="description"
          maxLength={1000}
          defaultValue={crop?.description || ""}
        />
      </FormField>
      <RangeEditor
        ranges={ranges}
        onChange={setRanges}
        error={error.includes("mínimo") ? error : undefined}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {crop ? "Guardar cambios" : "Crear cultivo"}
        </Button>
      </div>
    </form>
  );
}

export function CropsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CropRecord | null>(null);
  const [deleting, setDeleting] = useState<CropRecord | null>(null);
  const searchTerm = useMemo(() => search.trim(), [search]);
  const { cropsQuery, createMutation, updateMutation, deleteMutation } =
    useCrops(searchTerm);
  const crops = cropsQuery.data || [];
  const canManage = user?.role === "ADMIN" || user?.role === "OPERADOR";

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(crop: CropRecord) {
    setEditing(crop);
    setFormOpen(true);
  }

  async function saveCrop(input: CropInput) {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, input });
      showToast({ title: "Cultivo actualizado", type: "success" });
    } else {
      await createMutation.mutateAsync(input);
      showToast({ title: "Cultivo creado", type: "success" });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      showToast({ title: "Cultivo eliminado", type: "success" });
      setDeleting(null);
    } catch (error) {
      showToast({
        title: "No se pudo eliminar el cultivo",
        description: errorMessage(error),
        type: "danger",
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Cultivos"
        description="Configura los rangos de referencia y consulta los nodos y estados asociados."
        breadcrumb={["Administración", "Cultivos"]}
        actions={
          canManage ? (
            <Button
              icon={<Plus aria-hidden="true" className="size-4" />}
              onClick={openCreate}
            >
              Agregar cultivo
            </Button>
          ) : undefined
        }
      />
      <Card className="mb-5">
        <CardContent>
          <FormField label="Buscar cultivo" htmlFor="crops-search">
            <div className="relative max-w-lg">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
              />
              <Input
                id="crops-search"
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre del cultivo"
              />
            </div>
          </FormField>
        </CardContent>
      </Card>
      {cropsQuery.isError && (
        <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-danger">
          No se pudieron cargar los cultivos: {errorMessage(cropsQuery.error)}
        </p>
      )}
      {cropsQuery.isLoading ? (
        <div
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          aria-label="Cargando cultivos"
        >
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-64 animate-pulse rounded-md bg-elevated" />
          ))}
        </div>
      ) : crops.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {crops.map((crop) => (
            <Card key={crop.id}>
              <CardContent className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-full bg-primary-100 text-primary-700">
                      <Leaf aria-hidden="true" className="size-5" />
                    </span>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-text-primary">
                        {crop.name}
                      </h2>
                      <Badge variant="info">
                        {crop._count.states}{" "}
                        {crop._count.states === 1 ? "estado" : "estados"}
                      </Badge>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(crop)}
                        aria-label={`Editar ${crop.name}`}
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleting(crop)}
                        aria-label={`Eliminar ${crop.name}`}
                      >
                        <Trash2 aria-hidden="true" className="size-4 text-danger" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="mt-3 min-h-10 text-sm text-text-secondary">
                  {crop.description || "Sin descripción."}
                </p>
                <Link
                  to={`/crops/${crop.id}/states`}
                  className="mt-2 inline-flex w-fit text-sm font-semibold text-primary-700 hover:underline"
                >
                  Gestionar estados
                </Link>
                <div className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
                  <Sprout aria-hidden="true" className="size-4 text-primary-700" />
                  {crop._count.nodes}{" "}
                  {crop._count.nodes === 1 ? "nodo asociado" : "nodos asociados"}
                </div>
                <div className="mt-4 border-t border-border-default pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Rangos de referencia
                  </p>
                  <div className="space-y-1.5">
                    {variableRows.map(({ key, label, unit }) => (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-text-secondary">{label}</span>
                        <span className="font-mono text-text-primary">
                          {crop.ranges[key]?.min}–{crop.ranges[key]?.max} {unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border-default bg-white px-6 py-12 text-center">
          <Leaf aria-hidden="true" className="mx-auto size-8 text-primary-500" />
          <h2 className="mt-3 font-display font-semibold text-text-primary">
            No hay cultivos
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            No se encontraron cultivos para esta búsqueda.
          </p>
          {canManage && !searchTerm && (
            <Button className="mt-4" onClick={openCreate}>
              Agregar cultivo
            </Button>
          )}
        </div>
      )}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Editar cultivo" : "Agregar cultivo"}
        description="Define los datos y rangos de referencia del cultivo."
        className="max-w-3xl"
      >
        <CropForm
          key={editing?.id || "new-crop"}
          crop={editing}
          saving={createMutation.isPending || updateMutation.isPending}
          onSave={saveCrop}
          onClose={() => setFormOpen(false)}
        />
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        loading={deleteMutation.isPending}
        title={`¿Eliminar ${deleting?.name || "este cultivo"}?`}
        description={`Tiene ${deleting?._count.nodes ?? 0} nodos y ${deleting?._count.states ?? 0} estados asociados. Solo es posible eliminar cultivos sin dependencias.`}
        confirmLabel="Eliminar cultivo"
      />
    </>
  );
}
