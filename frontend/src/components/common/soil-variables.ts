import { Droplets, Leaf, Sprout, Thermometer } from "lucide-react";
import type { SoilVariable } from "@/types";

export const variableRows: Array<{
  key: SoilVariable;
  label: string;
  unit: string;
  Icon: typeof Droplets;
  color: string;
}> = [
  { key: "humidity", label: "Humedad", unit: "%", Icon: Droplets, color: "text-sky-700" },
  { key: "ph", label: "pH", unit: "pH", Icon: Sprout, color: "text-primary-700" },
  {
    key: "salinity",
    label: "Salinidad",
    unit: "dS/m",
    Icon: Leaf,
    color: "text-amber-700",
  },
  {
    key: "soilTemp",
    label: "Temperatura del suelo",
    unit: "°C",
    Icon: Thermometer,
    color: "text-danger",
  },
  {
    key: "ambientTemp",
    label: "Temperatura ambiente",
    unit: "°C",
    Icon: Thermometer,
    color: "text-orange-700",
  },
];
