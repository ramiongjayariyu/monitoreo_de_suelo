import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart as RechartsScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { formatNumber } from "@/utils/formatters";
import { Card } from "@/components/common/display";

export type ChartVariable = "humidity" | "ph" | "salinity" | "soilTemp" | "ambientTemp";
export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

const variableLabels: Record<ChartVariable, string> = {
  humidity: "Humedad",
  ph: "pH",
  salinity: "Salinidad",
  soilTemp: "Temperatura del suelo",
  ambientTemp: "Temperatura ambiente",
};

const variableColors: Record<ChartVariable, string> = {
  humidity: "#20786E",
  ph: "#8338EC",
  salinity: "#806000",
  soilTemp: "#B8472C",
  ambientTemp: "#9A4D00",
};

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border-default bg-white px-3 py-2 shadow-md">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="font-mono text-sm font-semibold text-text-primary">
        {formatNumber(Number(payload[0].value))} {unit}
      </p>
    </div>
  );
}

export function LineChart({
  data,
  variable,
  unit,
  height = 320,
}: {
  data: TimeSeriesPoint[];
  variable: ChartVariable;
  unit: string;
  height?: number;
}) {
  const color = variableColors[variable];

  return (
    <div
      style={{ width: "100%", height }}
      aria-label={`Gráfico de ${variableLabels[variable]}`}
    >
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 4, left: -18 }}>
          <defs>
            <linearGradient id={`area-${variable}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#DCE5DF" strokeDasharray="4 4" />
          <XAxis
            dataKey="timestamp"
            tick={{ fill: "#5E6B63", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "#5E6B63", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <RechartsTooltip content={<ChartTooltip unit={unit} />} />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ fontSize: 12, color: "#5A6B62" }}
          />
          <Line
            name={variableLabels[variable]}
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="none"
            fill={`url(#area-${variable})`}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Sparkline({
  data,
  variable,
  height = 48,
}: {
  data: number[];
  variable: ChartVariable;
  height?: number;
}) {
  const points = data.map((value, index) => ({ index, value }));
  return (
    <div className="w-full" style={{ height }} aria-hidden="true">
      <ResponsiveContainer>
        <ComposedChart data={points}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={variableColors[variable]}
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScatterChart({
  data,
  xLabel,
  yLabel,
  height = 320,
}: {
  data: Array<{ x: number; y: number }>;
  xLabel: string;
  yLabel: string;
  height?: number;
}) {
  return (
    <div
      style={{ width: "100%", height }}
      aria-label={`Correlación entre ${xLabel} y ${yLabel}`}
    >
      <ResponsiveContainer>
        <RechartsScatterChart margin={{ top: 10, right: 12, bottom: 14, left: 4 }}>
          <CartesianGrid stroke="#DCE5DF" strokeDasharray="4 4" />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            tick={{ fill: "#5E6B63", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            label={{
              value: xLabel,
              position: "insideBottom",
              offset: -8,
              fill: "#5A6B62",
              fontSize: 12,
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            tick={{ fill: "#5E6B63", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <ZAxis range={[48, 48]} />
          <RechartsTooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={data} fill="#40916C" />
        </RechartsScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export function KPICard({
  label,
  value,
  unit,
  variable,
  change,
  data,
  icon,
}: {
  label: string;
  value: number;
  unit: string;
  variable: ChartVariable;
  change?: number;
  data: number[];
  icon?: ReactNode;
}) {
  const positiveChange = (change || 0) >= 0;
  return (
    <Card className="overflow-hidden p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon && <span className="text-primary-700">{icon}</span>}
          <p className="text-sm font-medium text-text-secondary">{label}</p>
        </div>
        {change !== undefined && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${positiveChange ? "text-success" : "text-danger"}`}
          >
            {positiveChange ? (
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            ) : (
              <ArrowDownRight aria-hidden="true" className="size-3.5" />
            )}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-text-primary">
        {formatNumber(value)}{" "}
        <span className="text-base font-medium text-text-muted">{unit}</span>
      </p>
      <div className="mt-2">
        <Sparkline data={data} variable={variable} />
      </div>
    </Card>
  );
}
