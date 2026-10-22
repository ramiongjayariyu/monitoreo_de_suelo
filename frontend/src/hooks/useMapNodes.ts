import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMapNodes,
  updateNodePosition,
  type MapNodeRecord,
  type MapNodesFilter,
} from "@/api/nodes";
import { connectSocket, socket } from "@/api/socket";
import { useAuth } from "@/context/AuthContext";

export function useMapNodes(filters: MapNodesFilter) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const mapQuery = useQuery({
    queryKey: ["map-nodes", filters],
    queryFn: () => getMapNodes(filters),
  });

  useEffect(() => {
    if (!user) return;
    const refreshMap = () => {
      void queryClient.invalidateQueries({ queryKey: ["map-nodes"] });
    };
    socket.on("reading:new", refreshMap);
    socket.on("alert:new", refreshMap);
    socket.on("alert:updated", refreshMap);
    socket.on("node:status", refreshMap);
    if (!socket.connected) {
      try {
        connectSocket();
      } catch (error) {
        console.error("No se pudo iniciar la conexión en vivo del mapa.", error);
      }
    }
    return () => {
      socket.off("reading:new", refreshMap);
      socket.off("alert:new", refreshMap);
      socket.off("alert:updated", refreshMap);
      socket.off("node:status", refreshMap);
    };
  }, [queryClient, user]);

  const positionMutation = useMutation({
    mutationFn: ({ id, posX, posY }: { id: string; posX: number; posY: number }) =>
      updateNodePosition(id, { posX, posY }),
    onMutate: async ({ id, posX, posY }) => {
      await queryClient.cancelQueries({ queryKey: ["map-nodes"] });
      const previous = queryClient.getQueriesData<MapNodesResponse>({
        queryKey: ["map-nodes"],
      });
      queryClient.setQueriesData<MapNodesResponse>(
        { queryKey: ["map-nodes"] },
        (current) =>
          current?.map((node) => (node.id === id ? { ...node, posX, posY } : node)),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([queryKey, value]) => {
        queryClient.setQueryData(queryKey, value);
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["map-nodes"] }),
  });

  return { mapQuery, positionMutation };
}

type MapNodesResponse = MapNodeRecord[];
