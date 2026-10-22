import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCrop, deleteCrop, listCrops, updateCrop } from "@/api/crops";

export function useCrops(search: string) {
  const queryClient = useQueryClient();
  const cropsQuery = useQuery({
    queryKey: ["crops", search],
    queryFn: () => listCrops(search),
  });
  const invalidateCrops = () => queryClient.invalidateQueries({ queryKey: ["crops"] });

  const createMutation = useMutation({
    mutationFn: createCrop,
    onSuccess: invalidateCrops,
  });
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Parameters<typeof updateCrop>[1];
    }) => updateCrop(id, input),
    onSuccess: invalidateCrops,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteCrop,
    onSuccess: invalidateCrops,
  });

  return { cropsQuery, createMutation, updateMutation, deleteMutation };
}
