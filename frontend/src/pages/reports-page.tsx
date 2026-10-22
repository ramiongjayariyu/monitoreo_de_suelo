import { useMemo, useState } from "react";
import axios from "axios";
import {
  CalendarClock,
  Check,
  Clipboard,
  FileSpreadsheet,
  FileText,
  Link2,
  Share2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createReportShare,
  exportReport,
  getReportPreview,
  getSharedReportUrl,
  listReportHistory,
} from "@/api/reports";
import type { ReportFilters, ReportFormat } from "@/api/reports";
import { listCrops } from "@/api/crops";
import { listNodes } from "@/api/nodes";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Modal,
  MultiSelect,
  PageHeader,
  Select,
  Skeleton,
  Table,
} from "@/components/common";
import type { TableColumn } from "@/components/common";
import { useToast } from "@/components/common";

type SectionKey = ReportFilters["sections"][number];
const variableLabels: Record<string, string> = {
  humidity: "Humedad",
  ph: "pH",
  salinity: "Salinidad",
  soilTemp: "Temperatura del suelo",
  ambientTemp: "Temperatura ambiente",
};
const sectionOptions: Array<{ id: SectionKey; label: string }> = [
  { id: "summary", label: "Resumen ejecutivo y gráfico" },
  { id: "readings", label: "Lecturas detalladas" },
  { id: "alerts", label: "Alertas del periodo" },
];

function localDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toIsoDate(value: string, endOfDay = false): string {
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`).toISOString();
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data instanceof Blob) {
      return "No se pudo generar el reporte. Revisa los filtros e inténtalo de nuevo.";
    }
    if (typeof data?.message === "string") return data.message;
  }
  if (error instanceof Error) return error.message;
  return "No se pudo procesar el reporte.";
}

function triggerDownload(blob: Blob, format: ReportFormat) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `agrosense-reporte.${format === "excel" ? "xlsx" : "pdf"}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ReportsPage() {
  const [dates] = useState(() => {
    const toDate = new Date();
    const fromDate = new Date(toDate);
    fromDate.setDate(fromDate.getDate() - 7);
    return { from: localDate(fromDate), to: localDate(toDate) };
  });
  const [from, setFrom] = useState(dates.from);
  const [to, setTo] = useState(dates.to);
  const [nodeIds, setNodeIds] = useState<string[]>([]);
  const [cropIds, setCropIds] = useState<string[]>([]);
  const [sections, setSections] = useState<SectionKey[]>([
    "summary",
    "readings",
    "alerts",
  ]);
  const [shareOpen, setShareOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const nodesQuery = useQuery({
    queryKey: ["nodes", "report-options"],
    queryFn: () => listNodes(),
  });
  const cropsQuery = useQuery({
    queryKey: ["crops", "report-options"],
    queryFn: () => listCrops(),
  });
  const validDates = Boolean(from && to && from <= to);
  const filters = useMemo<ReportFilters>(
    () => ({
      from: validDates ? toIsoDate(from) : "",
      to: validDates ? toIsoDate(to, true) : "",
      nodeIds,
      cropIds,
      sections,
    }),
    [cropIds, from, nodeIds, sections, to, validDates],
  );
  const previewQuery = useQuery({
    queryKey: ["reports", "preview", filters],
    queryFn: () => getReportPreview(filters),
    enabled: validDates && sections.length > 0,
  });
  const historyQuery = useQuery({
    queryKey: ["reports", "history"],
    queryFn: listReportHistory,
  });
  const exportMutation = useMutation({
    mutationFn: (nextFormat: ReportFormat) => exportReport(filters, nextFormat),
    onSuccess: async (blob, nextFormat) => {
      triggerDownload(blob, nextFormat);
      showToast({
        title: "Reporte descargado",
        description: "El archivo se generó correctamente.",
        type: "success",
      });
      await queryClient.invalidateQueries({ queryKey: ["reports", "history"] });
    },
    onError: (error) =>
      showToast({
        title: "No se pudo exportar",
        description: errorMessage(error),
        type: "danger",
      }),
  });
  const shareMutation = useMutation({
    mutationFn: () => createReportShare(filters, format),
    onSuccess: async (share) => {
      setShareUrl(getSharedReportUrl(share.token));
      setShareCopied(false);
      await queryClient.invalidateQueries({ queryKey: ["reports", "history"] });
    },
    onError: (error) =>
      showToast({
        title: "No se pudo crear el enlace",
        description: errorMessage(error),
        type: "danger",
      }),
  });

  function toggleSection(section: SectionKey) {
    setSections((current) =>
      current.includes(section)
        ? current.length > 1
          ? current.filter((item) => item !== section)
          : current
        : [...current, section],
    );
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      showToast({
        title: "Enlace copiado",
        description: "El enlace estará activo durante 7 días.",
        type: "success",
      });
    } catch {
      showToast({
        title: "No se pudo copiar",
        description: "Selecciona y copia el enlace manualmente.",
        type: "warning",
      });
    }
  }

  const historyColumns: TableColumn<NonNullable<typeof historyQuery.data>[number]>[] = [
    {
      key: "createdAt",
      header: "Generado",
      render: (item) => formatDate(item.createdAt),
      sortValue: (item) => item.createdAt,
    },
    {
      key: "format",
      header: "Formato",
      render: (item) => (
        <Badge variant="info">{item.format === "pdf" ? "PDF" : "Excel"}</Badge>
      ),
    },
    {
      key: "period",
      header: "Periodo",
      render: (item) =>
        `${formatDate(item.filters.from)} — ${formatDate(item.filters.to)}`,
    },
    {
      key: "share",
      header: "Enlace",
      render: (item) =>
        item.shares.length ? (
          <Badge variant="success">
            <Link2 aria-hidden="true" className="size-4" />
            <span className="ml-1">Activo</span>
          </Badge>
        ) : (
          <span className="text-text-muted">—</span>
        ),
    },
  ];

  const preview = previewQuery.data;
  const nodeNames = new Map((nodesQuery.data ?? []).map((node) => [node.id, node.name]));

  return (
    <section className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Consolida lecturas y alertas en reportes descargables o enlaces temporales."
        actions={
          <Button
            variant="secondary"
            icon={<CalendarClock aria-hidden="true" className="size-4" />}
            onClick={() => setScheduleOpen(true)}
          >
            Programar envío
          </Button>
        }
      />

      <Card className="space-y-5 p-4 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-text-primary">
          Configurar reporte
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm font-medium text-text-secondary">
            Desde
            <input
              className="mt-1 block min-h-10 w-full rounded-sm border border-border-default bg-white px-3 text-sm text-text-primary"
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-text-secondary">
            Hasta
            <input
              className="mt-1 block min-h-10 w-full rounded-sm border border-border-default bg-white px-3 text-sm text-text-primary"
              type="date"
              value={to}
              min={from}
              max={dates.to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-text-secondary">
            Nodos
            <div className="mt-1">
              <MultiSelect
                options={(nodesQuery.data ?? []).map((node) => ({
                  value: node.id,
                  label: node.name,
                }))}
                value={nodeIds}
                onChange={setNodeIds}
                placeholder="Todos los nodos"
                searchPlaceholder="Buscar nodo..."
              />
            </div>
          </label>
          <label className="text-sm font-medium text-text-secondary">
            Cultivos
            <div className="mt-1">
              <MultiSelect
                options={(cropsQuery.data ?? []).map((crop) => ({
                  value: crop.id,
                  label: crop.name,
                }))}
                value={cropIds}
                onChange={setCropIds}
                placeholder="Todos los cultivos"
                searchPlaceholder="Buscar cultivo..."
              />
            </div>
          </label>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-text-secondary">
            Secciones incluidas
          </legend>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {sectionOptions.map((section) => (
              <label
                key={section.id}
                className="inline-flex items-center gap-2 text-sm text-text-secondary"
              >
                <Checkbox
                  checked={sections.includes(section.id)}
                  onChange={() => toggleSection(section.id)}
                  aria-label={section.label}
                />
                {section.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block max-w-xs text-sm font-medium text-text-secondary">
          Formato para compartir
          <Select
            className="mt-1 block"
            value={format}
            onChange={(event) => setFormat(event.target.value as ReportFormat)}
          >
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
          </Select>
        </label>

        <div className="flex flex-wrap gap-2 border-t border-border-default pt-4">
          <Button
            icon={<FileText aria-hidden="true" className="size-4" />}
            loading={exportMutation.isPending && format === "pdf"}
            disabled={!validDates || !sections.length || exportMutation.isPending}
            onClick={() => {
              setFormat("pdf");
              exportMutation.mutate("pdf");
            }}
          >
            Descargar PDF
          </Button>
          <Button
            variant="secondary"
            icon={<FileSpreadsheet aria-hidden="true" className="size-4" />}
            loading={exportMutation.isPending && format === "excel"}
            disabled={!validDates || !sections.length || exportMutation.isPending}
            onClick={() => {
              setFormat("excel");
              exportMutation.mutate("excel");
            }}
          >
            Descargar Excel
          </Button>
          <Button
            variant="secondary"
            icon={<Share2 aria-hidden="true" className="size-4" />}
            disabled={!validDates || !sections.length}
            onClick={() => {
              setShareOpen(true);
              setShareUrl("");
              shareMutation.mutate();
            }}
          >
            Compartir reporte
          </Button>
        </div>
      </Card>

      {(nodesQuery.isError || cropsQuery.isError) && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger"
        >
          No se pudieron cargar las opciones de nodos o cultivos. Reintenta la consulta
          antes de exportar.
        </p>
      )}

      {!validDates ? (
        <EmptyState
          title="Revisa el periodo seleccionado"
          description="La fecha inicial debe ser anterior o igual a la fecha final."
        />
      ) : previewQuery.isPending ? (
        <Skeleton variant="card" className="h-48" />
      ) : previewQuery.isError ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-danger"
        >
          {errorMessage(previewQuery.error)}
        </p>
      ) : preview ? (
        <Card className="space-y-4 p-4 sm:p-6">
          <div>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              Vista previa
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Periodo {formatDate(preview.range.from)} — {formatDate(preview.range.to)}
            </p>
          </div>
          {sections.includes("summary") && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Nodos", preview.summary.nodeCount],
                  ["Lecturas", preview.summary.readingCount],
                  ["Alertas", preview.summary.alertCount],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md bg-base p-4">
                    <p className="text-sm text-text-secondary">{label}</p>
                    <p className="mt-1 font-mono text-2xl font-semibold text-text-primary">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(preview.summary.severityCounts).map(
                  ([severity, count]) => (
                    <Badge
                      key={severity}
                      variant={
                        severity === "CRITICA"
                          ? "danger"
                          : severity === "ADVERTENCIA"
                            ? "warning"
                            : "info"
                      }
                    >
                      {severity}: {count}
                    </Badge>
                  ),
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {Object.entries(preview.summary.averages).map(([key, value]) => (
                  <div key={key} className="rounded-md border border-border-default p-3">
                    <p className="text-xs text-text-muted">
                      {variableLabels[key] ?? key}
                    </p>
                    <p className="mt-1 font-mono text-lg font-semibold text-text-primary">
                      {value ?? "Sin datos"}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
          {sections.includes("readings") && (
            <div className="overflow-x-auto rounded-md border border-border-default">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-elevated text-xs uppercase text-text-secondary">
                  <tr>
                    <th className="px-3 py-2">Nodo</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Humedad</th>
                    <th className="px-3 py-2">pH</th>
                    <th className="px-3 py-2">Salinidad</th>
                    <th className="px-3 py-2">Temp. suelo</th>
                    <th className="px-3 py-2">Temp. ambiente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {preview.readings.slice(0, 5).map((reading, index) => (
                    <tr key={`${reading.nodeId}-${reading.timestamp}-${index}`}>
                      <td className="px-3 py-2">{nodeNames.get(reading.nodeId)}</td>
                      <td className="px-3 py-2">{formatDate(reading.timestamp)}</td>
                      <td className="px-3 py-2">{reading.humidity}</td>
                      <td className="px-3 py-2">{reading.ph}</td>
                      <td className="px-3 py-2">{reading.salinity}</td>
                      <td className="px-3 py-2">{reading.soilTemp}</td>
                      <td className="px-3 py-2">{reading.ambientTemp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="p-3 text-xs text-text-muted">
                {preview.readings.length > 5
                  ? `Mostrando 5 de ${preview.readings.length} lecturas; el archivo incluye todas.`
                  : `${preview.readings.length} lecturas en el periodo.`}
              </p>
            </div>
          )}
          {sections.includes("alerts") && (
            <div className="overflow-x-auto rounded-md border border-border-default">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-elevated text-xs uppercase text-text-secondary">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Nodo</th>
                    <th className="px-3 py-2">Severidad</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {preview.alerts.slice(0, 5).map((alert, index) => (
                    <tr key={`${alert.nodeId}-${alert.createdAt}-${index}`}>
                      <td className="px-3 py-2">{formatDate(alert.createdAt)}</td>
                      <td className="px-3 py-2">{nodeNames.get(alert.nodeId)}</td>
                      <td className="px-3 py-2">{alert.severity}</td>
                      <td className="px-3 py-2">{alert.status}</td>
                      <td className="px-3 py-2">{alert.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-text-primary">
          Reportes generados
        </h2>
        {historyQuery.isError ? (
          <p role="alert" className="text-sm text-danger">
            No se pudo cargar el historial de reportes.
          </p>
        ) : (
          <Table
            columns={historyColumns}
            rows={historyQuery.data ?? []}
            loading={historyQuery.isPending}
            emptyTitle="Aún no has generado reportes"
            emptyDescription="Los archivos exportados aparecerán aquí."
            pageSize={5}
          />
        )}
      </Card>

      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Compartir reporte"
        description="El enlace temporal permite descargar el reporte sin iniciar sesión y vence en 7 días."
      >
        {shareMutation.isPending ? (
          <Skeleton variant="text" />
        ) : shareUrl ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-text-secondary">
              Enlace de descarga
              <input
                readOnly
                value={shareUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="mt-1 block min-h-10 w-full rounded-sm border border-border-default bg-base px-3 text-sm"
              />
            </label>
            <p className="text-xs text-text-muted">
              Expira: {formatDate(shareMutation.data!.expiresAt)}
            </p>
            <Button
              variant="secondary"
              icon={
                shareCopied ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : (
                  <Clipboard aria-hidden="true" className="size-4" />
                )
              }
              onClick={() => void copyShareLink()}
            >
              {shareCopied ? "Copiado" : "Copiar enlace"}
            </Button>
          </div>
        ) : shareMutation.isError ? (
          <p role="alert" className="text-sm text-danger">
            {errorMessage(shareMutation.error)}
          </p>
        ) : null}
      </Modal>

      <Modal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Programar envío"
        description="La programación de reportes por correo está pendiente de habilitar SMTP, de acuerdo con la configuración actual del proyecto."
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            La generación y descarga manual de reportes ya está disponible. No se
            programarán envíos ni se almacenarán correos hasta configurar SMTP.
          </p>
          <label className="block text-sm font-medium text-text-secondary">
            Frecuencia
            <Select className="mt-1 block" disabled defaultValue="weekly">
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </Select>
          </label>
          <Button variant="secondary" onClick={() => setScheduleOpen(false)}>
            Entendido
          </Button>
        </div>
      </Modal>
    </section>
  );
}
