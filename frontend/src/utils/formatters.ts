import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export function formatDate(value: Date | string, pattern = "d MMM yyyy"): string {
  return format(new Date(value), pattern, { locale: es });
}

export function formatRelativeDate(value: Date | string): string {
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: es });
}

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits }).format(value);
}

export function formatMeasurement(value: number, unit: string): string {
  return `${formatNumber(value)} ${unit}`;
}
