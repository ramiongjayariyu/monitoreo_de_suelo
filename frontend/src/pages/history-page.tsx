import { useMemo, useRef, useState } from "react";
import axios from "axios";
import { Activity, Download, FlaskConical } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { listNodes } from "@/api/nodes";
import type { HistoryGranularity } from "@/api/history";
import {
  Button,
  Card,
  EmptyState,
  MultiSelect,
  PageHeader,
  Select,
  Skeleton,
} from "@/components/common";
import { CorrelationChart, HistoryChart } from "@/components/history/history-charts";
import { useHistory } from "@/hooks/useHistory";
import { useToast } from "@/components/common";
import type { SoilVariable } from "@/types";

const variableLabels: Record<SoilVariable, string> = {
  humidity: "Humedad",
  ph: "pH",
  salinity: "Salinidad",
  soilTemp: "Temperatura del suelo",
  ambientTemp: "Temperatura ambiente",
};

const variables: SoilVariable[] = [
  "humidity",
  "ph",
  "salinity",
  "soilTemp",
  "ambientTemp",
];

function historySampleCount(points: Array<{ count: number }>): number {
  return points.reduce((total, point) => total + point.count, 0);
}

function localDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function queryDateRange(from: string, to: string) {
  if (!from || !to) return { from: "", to: "" };
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T23:59:59.999`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { from: "", to: "" };
  }
  return { from: start.toISOString(), to: end.toISOString() };
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
    return error.response.data.message;
  }
  if (error instanceof Error) return error.message;
  return "No se pudo cargar el historial de lecturas.";
}

function readableError(error: unknown): string {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
    return error.response.data.message;
  }
  if (error instanceof Error) return error.message;
  return "No se pudo exportar la imagen del gráfico.";
}

async function downloadChartImage(container: HTMLDivElement | null) {
  const source = container?.querySelector("svg");
  if (!source) throw new Error("No se encontró un gráfico para exportar.");
  const svg = source.cloneNode(true) as SVGSVGElement;
  const bounds = source.getBoundingClientRect();
  const width = Math.ceil(bounds.width);
  const height = Math.ceil(bounds.height);
  if (!width || !height) throw new Error("El gráfico todavía no está listo.");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  background.setAttribute("width", "100%");
  background.setAttribute("height", "100%");
  background.setAttribute("fill", "#ffffff");
  svg.insertBefore(background, svg.firstChild);
  const imageUrl = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml;charset=utf-8",
    }),
  );
  try {
    const image = new Image();
    image.src = imageUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("El navegador no pudo generar la imagen del gráfico."));
    });
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la imagen.");
    context.scale(2, 2);
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw new Error("No se pudo generar el archivo PNG.");
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "historial-agrosense.png";
    link.click();
    URL.revokeObjectURL(downloadUrl);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function HistoryPage() {
  const [initialDates] = useState(() => {
    const toDate = new Date();
    const fromDate = new Date(toDate);
    fromDate.setDate(fromDate.getDate() - 7);
    return { from: localDate(fromDate), to: localDate(toDate) };
  });
  const [nodeIds, setNodeIds] = useState<string[]>([]);
  const [variable, setVariable] = useState<SoilVariable>("humidity");
  const [from, setFrom] = useState(initialDates.from);
  const [to, setTo] = useState(initialDates.to);
  const [granularity, setGranularity] = useState<HistoryGranularity>("hour");
  const [showCorrelation, setShowCorrelation] = useState(false);
  const [varA, setVarA] = useState<SoilVariable>("humidity");
  const [varB, setVarB] = useState<SoilVariable>("ph");
  const chartRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const nodesQuery = useQuery({
    queryKey: ["nodes", "history-options"],
    queryFn: () => listNodes(),
  });
  const range = useMemo(() => queryDateRange(from, to), [from, to]);
  const dateRangeValid = Boolean(range.from && range.to && from <= to);
  const filters = useMemo(
    () => ({
      nodeIds,
      variable,
      granularity,
      range,
      correlation:
        showCorrelation && nodeIds.length === 1 && varA !== varB ? { varA, varB } : null,
    }),
    [granularity, nodeIds, range, showCorrelation, varA, varB, variable],
  );
  const { historyQuery, correlationQuery } = useHistory(filters);
  const historyData = historyQuery.data;
  const isComparison = historyData ? "series" in historyData : false;
  const sampleCount = historyData
    ? "series" in historyData
      ? historyData.series.reduce(
          (total, series) => total + historySampleCount(series.points),
          0,
        )
      : historySampleCount(historyData.points)
    : 0;

  async function exportImage() {
    try {
      await downloadChartImage(chartRef.current);
      showToast({
        title: "Imagen exportada",
        description: "El gráfico se descargó en formato PNG.",
        type: "success",
      });
    } catch (error) {
      showToast({
        title: "No se pudo exportar",
        description: readableError(error),
        type: "danger",
      });
    }
  }

  function changeNodes(nextNodeIds: string[]) {
    if (nextNodeIds.length > 10) {
      showToast({
        title: "Máximo de nodos alcanzado",
        description: "Puedes comparar hasta 10 nodos a la vez.",
        type: "warning",
      });
      return;
    }
    setNodeIds(nextNodeIds);
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Historial de lecturas"
        description="Explora tendencias del terreno, compara nodos y analiza la relación entre variables."
        actions={
          <Button
            variant="secondary"
            icon={<Download aria-hidden="true" className="size-4" />}
            disabled={!historyQuery.data || sampleCount === 0}
            onClick={() => void exportImage()}
          >
            Exportar imagen
          </Button>
        }
      />

      <Card className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-5">
        <label className="text-sm font-medium text-text-secondary">
          Nodos
          <div className="mt-1">
            <MultiSelect
              options={(nodesQuery.data ?? []).map((node) => ({
                value: node.id,
                label: node.name,
              }))}
              value={nodeIds}
              onChange={changeNodes}
              placeholder="Seleccionar nodos"
              searchPlaceholder="Buscar nodo..."
            />
          </div>
        </label>
        <fieldset className="sm:col-span-2 xl:col-span-2">
          <legend className="mb-2 text-sm font-medium text-text-secondary">
            Variable
          </legend>
          <div className="flex flex-wrap gap-2">
            {variables.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={variable === item}
                onClick={() => setVariable(item)}
                className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                  variable === item
                    ? "border-primary-700 bg-primary-700 text-white"
                    : "border-border-default bg-white text-text-secondary hover:border-primary-500 hover:text-primary-700"
                }`}
              >
                {variableLabels[item]}
              </button>
            ))}
          </div>
        </fieldset>
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
            max={initialDates.to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-text-secondary">
          Granularidad
          <Select
            className="mt-1 block"
            value={granularity}
            onChange={(event) => setGranularity(event.target.value as HistoryGranularity)}
          >
            <option value="hour">Por hora</option>
            <option value="day">Por día</option>
            <option value="week">Por semana</option>
          </Select>
        </label>
      </Card>

      {(nodesQuery.isError || historyQuery.isError) && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger"
        >
          {nodesQuery.isError
            ? "No se pudieron cargar los nodos disponibles."
            : errorMessage(historyQuery.error)}
          {historyQuery.isError && (
            <Button
              className="ml-3"
              size="sm"
              variant="secondary"
              onClick={() => void historyQuery.refetch()}
            >
              Reintentar
            </Button>
          )}
        </div>
      )}

      {!dateRangeValid ? (
        <EmptyState
          icon={<Activity aria-hidden="true" className="size-8" />}
          title="Revisa el rango de fechas"
          description="La fecha inicial debe ser anterior o igual a la fecha final."
        />
      ) : nodeIds.length === 0 ? (
        <EmptyState
          icon={<Activity aria-hidden="true" className="size-8" />}
          title="Selecciona nodos para consultar"
          description="Elige uno o varios nodos para visualizar sus lecturas históricas."
        />
      ) : historyQuery.isPending ? (
        <Skeleton variant="card" className="h-[28rem]" />
      ) : historyQuery.data ? (
        <>
          <Card className="p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-text-primary">
                  {variableLabels[variable]}
                  {isComparison ? " — comparación de nodos" : ""}
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  {sampleCount.toLocaleString("es")} lecturas ·{" "}
                  {isComparison ? nodeIds.length : 1} nodo
                  {nodeIds.length === 1 ? "" : "s"}
                </p>
              </div>
              <Button
                variant={showCorrelation ? "primary" : "secondary"}
                icon={<FlaskConical aria-hidden="true" className="size-4" />}
                disabled={nodeIds.length !== 1}
                onClick={() => setShowCorrelation((visible) => !visible)}
              >
                {showCorrelation ? "Ocultar correlación" : "Ver correlación"}
              </Button>
            </div>
            <div ref={chartRef}>
              <HistoryChart data={historyQuery.data} />
            </div>
          </Card>

          {showCorrelation && nodeIds.length === 1 && (
            <Card className="p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-end gap-3">
                <h2 className="mr-auto font-display text-lg font-semibold text-text-primary">
                  Correlación entre variables
                </h2>
                <label className="text-sm font-medium text-text-secondary">
                  Eje X
                  <Select
                    className="mt-1 block min-w-44"
                    value={varA}
                    onChange={(event) => setVarA(event.target.value as SoilVariable)}
                  >
                    {variables.map((item) => (
                      <option key={item} value={item}>
                        {variableLabels[item]}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="text-sm font-medium text-text-secondary">
                  Eje Y
                  <Select
                    className="mt-1 block min-w-44"
                    value={varB}
                    onChange={(event) => setVarB(event.target.value as SoilVariable)}
                  >
                    {variables.map((item) => (
                      <option key={item} value={item}>
                        {variableLabels[item]}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>
              {varA === varB ? (
                <p className="text-sm text-text-secondary">
                  Selecciona dos variables diferentes.
                </p>
              ) : correlationQuery.isPending ? (
                <Skeleton variant="card" className="h-80" />
              ) : correlationQuery.isError ? (
                <p role="alert" className="text-sm text-danger">
                  {errorMessage(correlationQuery.error)}
                </p>
              ) : correlationQuery.data ? (
                <CorrelationChart data={correlationQuery.data} varA={varA} varB={varB} />
              ) : null}
            </Card>
          )}
        </>
      ) : null}
    </section>
  );
}
