import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Droplets, Leaf, Plus, Sprout, Thermometer } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  DateRangePicker,
  EmptyState,
  FormField,
  Input,
  KPICard,
  Label,
  LineChart,
  LoadingButton,
  Modal,
  MultiSelect,
  PageHeader,
  Radio,
  ScatterChart,
  Select,
  Semaphore,
  Skeleton,
  Spinner,
  Table,
  Tabs,
  Textarea,
  Toggle,
  Tooltip,
  useToast,
  type TableColumn,
} from "@/components/common";
import { TerrainCanvas, type TerrainNode } from "@/components/canvas/terrain-canvas";

const chartData = [
  { timestamp: "08:00", value: 42 },
  { timestamp: "10:00", value: 48 },
  { timestamp: "12:00", value: 45 },
  { timestamp: "14:00", value: 57 },
  { timestamp: "16:00", value: 52 },
  { timestamp: "18:00", value: 60 },
];

const nodes: TerrainNode[] = [
  {
    id: "node-1",
    deviceId: "AGRO-DEMO-001",
    name: "Nodo Norte",
    x: 25,
    y: 38,
    status: "optimal",
    readings: {
      humidity: 34.8,
      ph: 6.4,
      salinity: 1.2,
      soilTemp: 23.6,
      ambientTemp: 28.1,
    },
    timestamp: "Hace 2 min",
    cropName: "Maíz",
    stateName: "Crecimiento",
    battery: 92,
    alertMessage: null,
  },
  {
    id: "node-2",
    deviceId: "AGRO-DEMO-002",
    name: "Nodo Centro",
    x: 53,
    y: 60,
    status: "warning",
    readings: {
      humidity: 25.1,
      ph: 6.8,
      salinity: 1.5,
      soilTemp: 25.2,
      ambientTemp: 29.4,
    },
    timestamp: "Hace 4 min",
    cropName: "Maíz",
    stateName: "Crecimiento",
    battery: 58,
    alertMessage: "Humedad cerca del límite inferior.",
  },
  {
    id: "node-3",
    deviceId: "AGRO-DEMO-003",
    name: "Nodo Sur",
    x: 78,
    y: 34,
    status: "critical",
    readings: {
      humidity: 18.2,
      ph: 5.7,
      salinity: 2.2,
      soilTemp: 31.8,
      ambientTemp: 32.4,
    },
    timestamp: "Hace 8 min",
    cropName: "Tomate",
    stateName: "Floración",
    battery: 31,
    alertMessage: "Humedad por debajo del rango óptimo.",
  },
  {
    id: "node-4",
    deviceId: "AGRO-DEMO-004",
    name: "Nodo Este",
    x: 78,
    y: 73,
    status: "offline",
    readings: null,
    timestamp: null,
    cropName: null,
    stateName: null,
    battery: null,
    alertMessage: null,
  },
];

interface DemoRow {
  id: string;
  name: string;
  crop: string;
  humidity: number;
  status: string;
}

const sampleRows: DemoRow[] = [
  {
    id: "001",
    name: "Nodo Norte",
    crop: "Maíz",
    humidity: 34.8,
    status: "En línea",
  },
  {
    id: "002",
    name: "Nodo Centro",
    crop: "Maíz",
    humidity: 25.1,
    status: "En línea",
  },
  {
    id: "003",
    name: "Nodo Sur",
    crop: "Tomate",
    humidity: 18.2,
    status: "En línea",
  },
];

const columns: TableColumn<DemoRow>[] = [
  {
    key: "name",
    header: "Nombre",
    render: (row) => row.name,
    sortValue: (row) => row.name,
  },
  {
    key: "crop",
    header: "Cultivo",
    render: (row) => row.crop,
    sortValue: (row) => row.crop,
  },
  {
    key: "humidity",
    header: "Humedad",
    render: (row) => `${row.humidity}%`,
    sortValue: (row) => row.humidity,
  },
  {
    key: "status",
    header: "Conexión",
    render: (row) => <Badge variant="success">{row.status}</Badge>,
  },
];

const cropOptions = [
  { value: "maiz", label: "Maíz" },
  { value: "tomate", label: "Tomate" },
  { value: "frijol", label: "Frijol" },
  { value: "cafe", label: "Café" },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-text-primary">{title}</h2>
        {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function ComponentsDemoPage() {
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toggle, setToggle] = useState(true);
  const [selectedCrops, setSelectedCrops] = useState(["maiz"]);
  const [dateRange, setDateRange] = useState({
    from: "2026-10-01",
    to: "2026-10-21",
  });

  return (
    <>
      <PageHeader
        breadcrumb={["Desarrollo", "Componentes"]}
        title="Sistema de diseño"
        description="Catálogo interactivo de los componentes base de AgroSense."
        actions={
          <>
            <Link to="/dev/auth-preview">
              <Button variant="secondary">Vista de autenticación</Button>
            </Link>
            <Button
              icon={<Plus aria-hidden="true" className="size-4" />}
              onClick={() =>
                showToast({
                  title: "Listo para continuar",
                  description: "El sistema de diseño está disponible.",
                  type: "success",
                })
              }
            >
              Acción de ejemplo
            </Button>
          </>
        }
      />
      <div className="space-y-10">
        <Section
          title="Botones y feedback"
          description="Variantes, tamaños, estados de carga y notificaciones."
        >
          <CardContent className="flex flex-wrap items-center gap-3 rounded-md border border-border-default bg-white">
            <Button>Primario</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="danger">Peligro</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button size="sm">Pequeño</Button>
            <Button size="lg">Grande</Button>
            <LoadingButton loading>Guardando</LoadingButton>
            <Button disabled>Deshabilitado</Button>
            <Tooltip content="Detalle contextual para este control">
              <Button variant="secondary" size="sm">
                Con ayuda
              </Button>
            </Tooltip>
            <Button
              variant="secondary"
              onClick={() => showToast({ title: "Cambios guardados", type: "success" })}
            >
              Toast éxito
            </Button>
            <Button
              variant="secondary"
              onClick={() => showToast({ title: "Revisa esta lectura", type: "warning" })}
            >
              Toast aviso
            </Button>
            <Button
              variant="secondary"
              onClick={() => showToast({ title: "No se pudo completar", type: "danger" })}
            >
              Toast error
            </Button>
            <Button
              variant="secondary"
              onClick={() => showToast({ title: "Nueva lectura recibida", type: "info" })}
            >
              Toast info
            </Button>
          </CardContent>
        </Section>

        <Section
          title="Formularios"
          description="Campos, etiquetas, validación y selección."
        >
          <Card>
            <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                label="Nombre del nodo"
                htmlFor="demo-node"
                hint="Nombre visible en el mapa."
              >
                <Input id="demo-node" placeholder="Ej. Nodo Norte" />
              </FormField>
              <FormField
                label="Correo electrónico"
                htmlFor="demo-email"
                error="Ingresa un correo válido."
              >
                <Input
                  id="demo-email"
                  type="email"
                  aria-invalid="true"
                  defaultValue="correo-invalido"
                />
              </FormField>
              <FormField label="Campo deshabilitado" htmlFor="demo-disabled">
                <Input id="demo-disabled" disabled value="No editable" readOnly />
              </FormField>
              <FormField label="Tipo de cultivo" htmlFor="demo-crop">
                <Select id="demo-crop" defaultValue="">
                  <option value="" disabled>
                    Selecciona un cultivo
                  </option>
                  <option>Maíz</option>
                  <option>Tomate</option>
                </Select>
              </FormField>
              <FormField label="Notas" htmlFor="demo-notes">
                <Textarea
                  id="demo-notes"
                  placeholder="Información adicional del terreno"
                />
              </FormField>
              <div className="space-y-3">
                <Label>Preferencias</Label>
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <Checkbox defaultChecked /> Recibir resumen diario
                </label>
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <Radio name="demo-units" defaultChecked /> Unidades métricas
                </label>
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <Radio name="demo-units" /> Unidades imperiales
                </label>
              </div>
              <div className="space-y-3">
                <Label>Estado de alertas</Label>
                <Toggle
                  checked={toggle}
                  onChange={(event) => setToggle(event.target.checked)}
                  label={toggle ? "Activo" : "Inactivo"}
                />
                <Toggle disabled label="Deshabilitado" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader
              title="Fechas y selección múltiple"
              description="Filtros reutilizables con controles accesibles."
            />
            <CardContent className="grid gap-5 md:grid-cols-2">
              <DateRangePicker
                from={dateRange.from}
                to={dateRange.to}
                onChange={setDateRange}
              />
              <div className="space-y-2">
                <Label>Cultivos</Label>
                <MultiSelect
                  options={cropOptions}
                  value={selectedCrops}
                  onChange={setSelectedCrops}
                />
                <p className="text-xs text-text-muted">
                  Seleccionados: {selectedCrops.length || "ninguno"}
                </p>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section
          title="Tarjetas y estados"
          description="Badges, semáforo y elementos de carga/vacío."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KPICard
              label="Humedad"
              value={34.8}
              unit="%"
              variable="humidity"
              change={2.4}
              data={[30, 31, 29, 34, 33, 35, 34]}
              icon={<Droplets className="size-4" />}
            />
            <KPICard
              label="pH"
              value={6.4}
              unit="pH"
              variable="ph"
              change={-0.8}
              data={[6.2, 6.5, 6.3, 6.4, 6.6, 6.4]}
              icon={<Activity className="size-4" />}
            />
            <KPICard
              label="Salinidad"
              value={1.2}
              unit="dS/m"
              variable="salinity"
              data={[1.1, 1.3, 1.2, 1.1, 1.2]}
              icon={<Sprout className="size-4" />}
            />
            <KPICard
              label="Temperatura del suelo"
              value={23.6}
              unit="°C"
              variable="soilTemp"
              data={[22, 23, 25, 24, 23]}
              icon={<Thermometer className="size-4" />}
            />
            <KPICard
              label="Temperatura ambiente"
              value={28.1}
              unit="°C"
              variable="ambientTemp"
              data={[26, 27, 29, 30, 28]}
              icon={<Thermometer className="size-4" />}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader title="Badges" />
              <CardContent className="flex flex-wrap gap-2">
                <Badge variant="success">Óptimo</Badge>
                <Badge variant="warning">Advertencia</Badge>
                <Badge variant="danger">Crítico</Badge>
                <Badge variant="info">Información</Badge>
                <Badge variant="neutral">Sin datos</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Semáforo" />
              <CardContent className="space-y-3">
                <Semaphore status="optimal" />
                <Semaphore status="warning" />
                <Semaphore status="critical" />
                <Semaphore status="offline" />
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton variant="text" className="mt-4" />
            <Skeleton variant="card" />
            <div className="rounded-md border border-border-default bg-white p-4">
              <Spinner label="Cargando lecturas" />
            </div>
          </div>
          <EmptyState
            icon={<Activity aria-hidden="true" className="size-8" />}
            title="Aún no hay lecturas"
            description="Cuando los nodos envíen datos, aparecerán en esta sección."
            action={
              <Button variant="secondary" size="sm">
                Configurar nodo
              </Button>
            }
          />
        </Section>

        <Section
          title="Tabla, modal y pestañas"
          description="Ordenamiento, paginación y patrones de navegación."
        >
          <Table columns={columns} rows={sampleRows} pageSize={2} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Tabla en carga" />
              <CardContent>
                <Table columns={columns} rows={sampleRows} loading />
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Tabla vacía" />
              <CardContent>
                <Table
                  columns={columns}
                  rows={[]}
                  emptyTitle="No hay nodos"
                  emptyDescription="Agrega el primer nodo para comenzar."
                />
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Abrir modal
            </Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Acción destructiva
            </Button>
          </div>
          <Card>
            <CardContent>
              <Tabs
                items={[
                  {
                    id: "resumen",
                    label: "Resumen",
                    content: (
                      <p className="text-sm text-text-secondary">
                        Información principal del componente.
                      </p>
                    ),
                  },
                  {
                    id: "detalle",
                    label: "Detalle",
                    content: (
                      <p className="text-sm text-text-secondary">
                        Datos complementarios y configuración.
                      </p>
                    ),
                  },
                  {
                    id: "actividad",
                    label: "Actividad",
                    content: (
                      <p className="text-sm text-text-secondary">
                        Historial de cambios y actividad reciente.
                      </p>
                    ),
                  },
                ]}
              />
            </CardContent>
          </Card>
        </Section>

        <Section
          title="Gráficos"
          description="Serie temporal, mini gráfico de KPI y correlación."
        >
          <Card>
            <CardHeader
              title="Humedad del suelo"
              description="Lecturas de ejemplo durante el día."
            />
            <CardContent>
              <LineChart data={chartData} variable="humidity" unit="%" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Correlación entre humedad y temperatura" />
            <CardContent>
              <ScatterChart
                xLabel="Humedad (%)"
                yLabel="Temperatura (°C)"
                data={[
                  { x: 20, y: 31 },
                  { x: 28, y: 27 },
                  { x: 34, y: 24 },
                  { x: 41, y: 21 },
                  { x: 48, y: 19 },
                ]}
              />
            </CardContent>
          </Card>
        </Section>

        <Section
          title="Canvas del terreno"
          description="Selecciona un nodo o arrástralo a otra posición."
        >
          <TerrainCanvas
            nodes={nodes}
            onPositionChange={(id, position) =>
              showToast({
                title: "Posición actualizada",
                description: `${id}: ${position.x}, ${position.y}`,
                type: "success",
              })
            }
            onNodeView={(node) =>
              showToast({ title: `Detalle de ${node.name}`, type: "info" })
            }
            onNodeEdit={(node) =>
              showToast({ title: `Editar ${node.name}`, type: "info" })
            }
          />
          <div className="flex flex-wrap items-center gap-3 text-primary-700">
            <Droplets aria-hidden="true" className="size-5" />
            <Thermometer aria-hidden="true" className="size-5" />
            <Sprout aria-hidden="true" className="size-5" />
            <Leaf aria-hidden="true" className="size-5" />
          </div>
        </Section>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Modal de ejemplo"
        description="Permite cierre con Escape y mantiene el foco dentro."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setModalOpen(false)}>Guardar</Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          Este patrón se reutilizará en los formularios de gestión.
        </p>
      </Modal>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => setConfirmOpen(false)}
        title="¿Eliminar elemento?"
        description="Confirma si deseas continuar con esta acción."
      />
    </>
  );
}
