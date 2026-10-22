import { useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Badge, Button, useToast } from "@/components/common";
import { useAlerts } from "@/hooks/useAlerts";
import { AlertCard } from "./alert-card";

export function AlertBell() {
  const [open, setOpen] = useState(false);
  const { alertsQuery, statusMutation } = useAlerts({ take: 10 }, true);
  const { showToast } = useToast();
  const alerts = alertsQuery.data?.alerts ?? [];
  const activeCount = alertsQuery.data?.activeCount ?? 0;

  async function handleAction(id: string, action: "read" | "silence" | "close") {
    try {
      await statusMutation.mutateAsync({ id, action });
    } catch (error) {
      const message =
        axios.isAxiosError(error) && typeof error.response?.data?.message === "string"
          ? error.response.data.message
          : "Intenta de nuevo en unos momentos.";
      showToast({
        title: "No se pudo actualizar la alerta",
        description: message,
        type: "danger",
      });
    }
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative size-10 min-h-10 px-0"
        aria-label={`Notificaciones, ${activeCount} alertas activas`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell aria-hidden="true" className="size-5" />
        {activeCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {activeCount > 99 ? "99+" : activeCount}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-[min(26rem,calc(100vw-2rem))] rounded-md border border-border-default bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">Notificaciones</p>
              <p className="text-xs text-text-muted">{activeCount} alertas activas</p>
            </div>
            <Link
              to="/alerts"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-primary-700 hover:underline"
            >
              Ver todas
            </Link>
          </div>
          <div className="max-h-[min(70vh,32rem)] space-y-2 overflow-y-auto p-3">
            {alertsQuery.isPending ? (
              <p className="p-4 text-sm text-text-secondary">Cargando alertas…</p>
            ) : alertsQuery.isError ? (
              <p role="alert" className="p-4 text-sm text-danger">
                No se pudieron cargar las alertas.
              </p>
            ) : alerts.length === 0 ? (
              <p className="p-4 text-sm text-text-secondary">No hay alertas recientes.</p>
            ) : (
              alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  busy={statusMutation.isPending}
                  onAction={(id, action) => void handleAction(id, action)}
                />
              ))
            )}
          </div>
          {activeCount > 0 && (
            <div className="border-t border-border-default px-4 py-2">
              <Badge variant="danger">{activeCount} activas</Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
