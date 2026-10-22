import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAlerts,
  updateAlertStatus,
  type AlertFilters,
  type AlertsResponse,
} from "@/api/alerts";
import { useToast } from "@/components/common";
import { useAuth } from "@/context/AuthContext";
import { connectSocket, disconnectSocket, socket } from "@/api/socket";
import type { AlertStatus } from "@/types";

export function useAlerts(filters: AlertFilters = {}, realtime = false) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const alertsQuery = useQuery({
    queryKey: ["alerts", filters],
    queryFn: () => listAlerts(filters),
  });

  useEffect(() => {
    if (!realtime || !user) return;
    let connectionWarningShown = false;
    const handleNewAlert = (alert: {
      message: string;
      severity: string;
      node?: { name: string };
    }) => {
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      showToast({
        title: "Nueva alerta de monitoreo",
        description: `${alert.node?.name || "Nodo"}: ${alert.message}`,
        type: alert.severity === "CRITICA" ? "danger" : "warning",
      });
    };
    const handleAlertUpdate = () => {
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
    };
    const handleReading = () => {
      void queryClient.invalidateQueries({ queryKey: ["nodes"] });
    };
    const handleConnectionError = () => {
      if (connectionWarningShown) return;
      connectionWarningShown = true;
      showToast({
        title: "Sin conexión en tiempo real",
        description: "Las alertas se actualizarán al restablecer la conexión.",
        type: "warning",
      });
    };

    socket.on("alert:new", handleNewAlert);
    socket.on("alert:updated", handleAlertUpdate);
    socket.on("reading:new", handleReading);
    socket.on("connect_error", handleConnectionError);
    try {
      if (!socket.connected) connectSocket();
    } catch (error) {
      handleConnectionError();
      console.error("No se pudo iniciar la conexión de notificaciones.", error);
    }

    return () => {
      socket.off("alert:new", handleNewAlert);
      socket.off("alert:updated", handleAlertUpdate);
      socket.off("reading:new", handleReading);
      socket.off("connect_error", handleConnectionError);
      disconnectSocket();
    };
  }, [queryClient, realtime, showToast, user]);

  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "read" | "silence" | "close" }) =>
      updateAlertStatus(id, action),
    onMutate: async ({ id, action }) => {
      await queryClient.cancelQueries({ queryKey: ["alerts"] });
      const previous = queryClient.getQueriesData<AlertsResponse>({
        queryKey: ["alerts"],
      });
      const nextStatus: AlertStatus =
        action === "read" ? "LEIDA" : action === "silence" ? "SILENCIADA" : "CERRADA";
      queryClient.setQueriesData<AlertsResponse>({ queryKey: ["alerts"] }, (current) => {
        if (!current) return current;
        const target = current.alerts.find((alert) => alert.id === id);
        return {
          ...current,
          activeCount:
            target?.status === "ACTIVA"
              ? Math.max(0, current.activeCount - 1)
              : current.activeCount,
          alerts: current.alerts.map((alert) =>
            alert.id === id ? { ...alert, status: nextStatus } : alert,
          ),
        };
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([queryKey, value]) => {
        queryClient.setQueryData(queryKey, value);
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  return { alertsQuery, statusMutation };
}
