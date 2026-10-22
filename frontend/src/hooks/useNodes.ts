import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignNode,
  createNode,
  deleteNode,
  getNodeOptions,
  listNodes,
  updateNode,
  updateNodePosition,
  type NodesFilter,
} from "@/api/nodes";

export function useNodes(filters: NodesFilter) {
  const queryClient = useQueryClient();
  const nodesQuery = useQuery({
    queryKey: ["nodes", filters],
    queryFn: () => listNodes(filters),
  });
  const optionsQuery = useQuery({
    queryKey: ["nodes", "options"],
    queryFn: getNodeOptions,
  });
  const invalidateNodes = () => queryClient.invalidateQueries({ queryKey: ["nodes"] });

  const createMutation = useMutation({
    mutationFn: createNode,
    onSuccess: invalidateNodes,
  });
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Parameters<typeof updateNode>[1];
    }) => updateNode(id, input),
    onSuccess: invalidateNodes,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteNode,
    onSuccess: invalidateNodes,
  });
  const positionMutation = useMutation({
    mutationFn: ({ id, posX, posY }: { id: string; posX: number; posY: number }) =>
      updateNodePosition(id, { posX, posY }),
    onSuccess: invalidateNodes,
  });
  const assignMutation = useMutation({
    mutationFn: ({
      id,
      cropId,
      stateId,
    }: {
      id: string;
      cropId: string | null;
      stateId: string | null;
    }) => assignNode(id, { cropId, stateId }),
    onSuccess: invalidateNodes,
  });

  return {
    nodesQuery,
    optionsQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    positionMutation,
    assignMutation,
  };
}
