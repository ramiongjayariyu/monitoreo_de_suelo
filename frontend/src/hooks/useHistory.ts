import { useQuery } from "@tanstack/react-query";
import {
  compareHistory,
  getHistory,
  getHistoryCorrelation,
  type HistoryResult,
} from "@/api/history";
import type { HistoryGranularity, HistoryRange } from "@/api/history";
import type { SoilVariable } from "@/types";

export function useHistory({
  nodeIds,
  variable,
  granularity,
  range,
  correlation,
}: {
  nodeIds: string[];
  variable: SoilVariable;
  granularity: HistoryGranularity;
  range: HistoryRange;
  correlation: { varA: SoilVariable; varB: SoilVariable } | null;
}) {
  const historyQuery = useQuery<HistoryResult>({
    queryKey: ["history", nodeIds, variable, granularity, range],
    queryFn: () =>
      nodeIds.length > 1
        ? compareHistory({
            nodeIds,
            variable,
            granularity,
            ...range,
          })
        : getHistory({
            nodeId: nodeIds[0],
            variable,
            granularity,
            ...range,
          }),
    enabled: nodeIds.length > 0 && Boolean(range.from) && Boolean(range.to),
  });
  const correlationQuery = useQuery({
    queryKey: ["history", "correlation", nodeIds[0], correlation, range],
    queryFn: () => {
      if (!correlation || nodeIds.length !== 1) {
        throw new Error("Se requiere un nodo y dos variables para correlacionar.");
      }
      return getHistoryCorrelation({
        nodeId: nodeIds[0],
        ...correlation,
        ...range,
      });
    },
    enabled:
      nodeIds.length === 1 &&
      correlation !== null &&
      correlation.varA !== correlation.varB &&
      Boolean(range.from) &&
      Boolean(range.to),
  });
  return { historyQuery, correlationQuery };
}
