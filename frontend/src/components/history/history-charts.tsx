import { useMemo, useState } from "react";
import {
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart as RechartsScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { HistoryComparison, HistoryCorrelation, HistoryResult } from "@/api/history";
import type { SoilVariable } from "@/types";

const palette = [
  "#20786E",
  "#8338EC",
  "#B8472C",
  "#9A4D00",
  "#37637F",
  "#B92E40",
  "#4B7135",
  "#805138",
  "#5A189A",
  "#0077B6",
];

const labels: Record<SoilVariable, string> = {
  humidity: "Humedad",
  ph: "pH",
  salinity: "Salinidad",
  soilTemp: "Temperatura del suelo",
  ambientTemp: "Temperatura ambiente",
};

function isComparison(data: HistoryResult): data is HistoryComparison {
  return "series" in data;
}

function buildChartData(data: HistoryResult) {
  const series = isComparison(data)
    ? data.series
    : [
        {
          nodeId: data.node.id,
          nodeName: data.node.name,
          points: data.points,
        },
      ];
  const rows = new Map<string, Record<string, string | number | null>>();
  for (const item of series) {
    for (const point of item.points) {
      const row = rows.get(point.timestamp) ?? {
        timestamp: point.timestamp,
        label: new Intl.DateTimeFormat("es", {
          dateStyle: "short",
          timeStyle: data.granularity === "hour" ? "short" : undefined,
        }).format(new Date(point.timestamp)),
      };
      row[item.nodeId] = point.value;
      rows.set(point.timestamp, row);
    }
  }
  return {
    series,
    rows: [...rows.values()].sort((left, right) =>
      String(left.timestamp).localeCompare(String(right.timestamp)),
    ),
  };
}

export function HistoryChart({ data }: { data: HistoryResult }) {
  const { series, rows } = useMemo(() => buildChartData(data), [data]);
  const [visibleSeries, setVisibleSeries] = useState<string[]>([]);
  const enabledSeries =
    visibleSeries.length > 0
      ? visibleSeries.filter((id) => series.some((item) => item.nodeId === id))
      : series.map((item) => item.nodeId);

  function toggleSeries(id: string) {
    setVisibleSeries((current) => {
      const active = current.length > 0 ? current : series.map((item) => item.nodeId);
      const next = active.includes(id)
        ? active.filter((item) => item !== id)
        : [...active, id];
      return next.length === series.length ? [] : next;
    });
  }

  if (rows.length === 0) {
    return (
      <div className="grid h-72 place-items-center text-sm text-text-muted">
        No hay lecturas para los filtros seleccionados.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2" aria-label="Series visibles">
        {series.map((item, index) => {
          const active = enabledSeries.includes(item.nodeId);
          return (
            <button
              type="button"
              key={item.nodeId}
              onClick={() => toggleSeries(item.nodeId)}
              aria-pressed={active}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                active
                  ? "border-border-default bg-white text-text-primary"
                  : "border-transparent bg-elevated text-text-muted"
              }`}
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: palette[index % palette.length] }}
              />
              {item.nodeName}
            </button>
          );
        })}
      </div>
      <div style={{ width: "100%", height: 360 }} aria-label="Historial de lecturas">
        <ResponsiveContainer>
          <ComposedChart data={rows} margin={{ top: 12, right: 16, bottom: 16, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#DCE5DF" strokeDasharray="4 4" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#5E6B63", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
            />
            <YAxis
              tick={{ fill: "#5E6B63", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              labelFormatter={(_label, payload) => {
                const timestamp = payload?.[0]?.payload?.timestamp;
                return timestamp
                  ? new Intl.DateTimeFormat("es", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(String(timestamp)))
                  : "";
              }}
            />
            {series.map((item, index) =>
              enabledSeries.includes(item.nodeId) ? (
                <Line
                  key={item.nodeId}
                  type="monotone"
                  dataKey={item.nodeId}
                  name={item.nodeName}
                  stroke={palette[index % palette.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
              ) : null,
            )}
            <Brush
              dataKey="label"
              height={24}
              travellerWidth={8}
              stroke="#40916C"
              fill="#F4F7F4"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CorrelationChart({
  data,
  varA,
  varB,
}: {
  data: HistoryCorrelation;
  varA: SoilVariable;
  varB: SoilVariable;
}) {
  return (
    <div>
      <p className="mb-2 text-sm text-text-secondary">
        Correlación de Pearson:{" "}
        <strong className="font-mono text-text-primary">
          {data.coefficient === null ? "No disponible" : data.coefficient.toFixed(2)}
        </strong>{" "}
        <span className="text-text-muted">({data.sampleCount} lecturas)</span>
      </p>
      {data.points.length === 0 ? (
        <div className="grid h-72 place-items-center text-sm text-text-muted">
          No hay lecturas para calcular esta correlación.
        </div>
      ) : (
        <div
          style={{ width: "100%", height: 340 }}
          aria-label={`Correlación entre ${labels[varA]} y ${labels[varB]}`}
        >
          <ResponsiveContainer>
            <RechartsScatterChart margin={{ top: 12, right: 20, bottom: 24, left: 4 }}>
              <CartesianGrid stroke="#DCE5DF" strokeDasharray="4 4" />
              <XAxis
                type="number"
                dataKey="x"
                name={labels[varA]}
                tick={{ fill: "#5E6B63", fontSize: 11 }}
                label={{
                  value: labels[varA],
                  position: "insideBottom",
                  offset: -14,
                  fill: "#5A6B62",
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={labels[varB]}
                tick={{ fill: "#5E6B63", fontSize: 11 }}
                width={56}
                label={{
                  value: labels[varB],
                  angle: -90,
                  position: "insideLeft",
                  fill: "#5A6B62",
                  fontSize: 12,
                }}
              />
              <ZAxis range={[56, 56]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={data.points} fill="#40916C" />
            </RechartsScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
