import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboard, type DashboardFilters } from "@/api/dashboard";
import { connectSocket, socket } from "@/api/socket";
import { useAuth } from "@/context/AuthContext";

export function useDashboard(filters: DashboardFilters) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isLive, setIsLive] = useState(socket.connected);
  const [readingVersion, setReadingVersion] = useState(0);
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", filters],
    queryFn: () => getDashboard(filters),
  });

  useEffect(() => {
    if (!user) return;
    const refreshDashboard = () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    };
    const handleReading = () => setReadingVersion((version) => version + 1);
    const handleConnect = () => setIsLive(true);
    const handleDisconnect = () => setIsLive(false);

    socket.on("dashboard:update", refreshDashboard);
    socket.on("alert:new", refreshDashboard);
    socket.on("alert:updated", refreshDashboard);
    socket.on("reading:new", handleReading);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    if (!socket.connected) {
      try {
        connectSocket();
      } catch (error) {
        console.error("No se pudo iniciar la conexión del dashboard en vivo.", error);
      }
    }

    return () => {
      socket.off("dashboard:update", refreshDashboard);
      socket.off("alert:new", refreshDashboard);
      socket.off("alert:updated", refreshDashboard);
      socket.off("reading:new", handleReading);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [queryClient, user]);

  return { dashboardQuery, isLive, readingVersion };
}
