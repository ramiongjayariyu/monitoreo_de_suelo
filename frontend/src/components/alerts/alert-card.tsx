import { Check, EyeOff, X } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@/components/common";
import type { Alert } from "@/types";

const severityLabel: Record<Alert["severity"], string> = {
  INFO: "Información",
  ADVERTENCIA: "Advertencia",
  CRITICA: "Crítica",
};

const severityVariant: Record<Alert["severity"], "info" | "warning" | "danger"> = {
  INFO: "info",
  ADVERTENCIA: "warning",
  CRITICA: "danger",
};

const severityBorder: Record<Alert["severity"], string> = {
  INFO: "border-l-info",
  ADVERTENCIA: "border-l-warning",
  CRITICA: "border-l-danger",
};

const statusLabel: Record<Alert["status"], string> = {
  ACTIVA: "Activa",
  LEIDA: "Leída",
  SILENCIADA: "Silenciada",
  CERRADA: "Cerrada",
};

const variableLabel: Record<Alert["variable"], string> = {
  humidity: "Humedad",
  ph: "pH",
  salinity: "Salinidad",
  soilTemp: "Temperatura del suelo",
  ambientTemp: "Temperatura ambiente",
};

export function AlertCard({
  alert,
  busy,
  onAction,
}: {
  alert: Alert;
  busy?: boolean;
  onAction: (id: string, action: "read" | "silence" | "close") => void;
}) {
  const createdAt = new Date(alert.createdAt);
  const dateLabel = Number.isNaN(createdAt.getTime())
    ? "Fecha no disponible"
    : new Intl.DateTimeFormat("es", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(createdAt);

  return (
    <Card className={`border-l-4 ${severityBorder[alert.severity]}`}>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={severityVariant[alert.severity]}>
              {severityLabel[alert.severity]}
            </Badge>
            <Badge variant="neutral">{statusLabel[alert.status]}</Badge>
            <span className="rounded bg-elevated px-2 py-1 text-xs font-medium text-text-secondary">
              {variableLabel[alert.variable]}
            </span>
          </div>
          <p className="text-sm font-medium text-text-primary">{alert.message}</p>
          <p className="text-xs text-text-secondary">
            {alert.node.name} · {alert.node.deviceId} · {dateLabel}
          </p>
        </div>
        {alert.status !== "CERRADA" && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {alert.status === "ACTIVA" && (
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                icon={<Check aria-hidden="true" className="size-4" />}
                onClick={() => onAction(alert.id, "read")}
              >
                Marcar leída
              </Button>
            )}
            {alert.status !== "SILENCIADA" && (
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                icon={<EyeOff aria-hidden="true" className="size-4" />}
                onClick={() => onAction(alert.id, "silence")}
              >
                Silenciar
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              disabled={busy}
              icon={<X aria-hidden="true" className="size-4" />}
              onClick={() => onAction(alert.id, "close")}
            >
              Cerrar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
