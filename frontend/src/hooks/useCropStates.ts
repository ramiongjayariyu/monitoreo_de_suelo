import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateCropState,
  createCropState,
  deleteCropState,
  getCropStates,
  updateCropState,
} from "@/api/crops";

export function useCropStates(cropId: string) {
  const queryClient = useQueryClient();
  const statesQuery = useQuery({
    queryKey: ["crop-states", cropId],
    queryFn: () => getCropStates(cropId),
    enabled: Boolean(cropId),
  });

  function invalidateRelatedData() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ["crop-states", cropId] }),
      queryClient.invalidateQueries({ queryKey: ["crops"] }),
      queryClient.invalidateQueries({ queryKey: ["nodes"] }),
    ]);
  }

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createCropState>[1]) =>
      createCropState(cropId, input),
    onSuccess: invalidateRelatedData,
  });
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Parameters<typeof updateCropState>[1];
    }) => updateCropState(id, input),
    onSuccess: invalidateRelatedData,
  });
  const activateMutation = useMutation({
    mutationFn: activateCropState,
    onSuccess: invalidateRelatedData,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteCropState,
    onSuccess: invalidateRelatedData,
  });

  return {
    statesQuery,
    createMutation,
    updateMutation,
    activateMutation,
    deleteMutation,
  };
}
