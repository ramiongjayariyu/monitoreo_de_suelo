import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/utils/cn";
import { EmptyState, Skeleton } from "./display";

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
}

export function Table<T extends { id: string }>({
  columns,
  rows,
  loading = false,
  emptyTitle = "Sin resultados",
  emptyDescription = "Aún no hay elementos para mostrar.",
  pageSize = 5,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const orderedRows = useMemo(() => {
    if (!sortKey) return rows;
    const column = columns.find((item) => item.key === sortKey);
    if (!column?.sortValue) return rows;

    return [...rows].sort((a, b) => {
      const left = column.sortValue?.(a);
      const right = column.sortValue?.(b);
      const result =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), "es");
      return sortDirection === "asc" ? result : -result;
    });
  }, [columns, rows, sortDirection, sortKey]);

  const pageCount = Math.max(1, Math.ceil(orderedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = orderedRows.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );

  function toggleSort(column: TableColumn<T>) {
    if (!column.sortValue) return;
    if (sortKey === column.key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(column.key);
      setSortDirection("asc");
    }
    setPage(0);
  }

  if (loading) return <Skeleton variant="table" />;
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-hidden rounded-md border border-border-default bg-white">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-elevated text-xs uppercase tracking-wide text-text-secondary">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn("px-4 py-3 font-semibold", column.className)}
                >
                  {column.sortValue ? (
                    <button
                      className="inline-flex items-center gap-1.5 hover:text-primary-700"
                      onClick={() => toggleSort(column)}
                      aria-label={`Ordenar por ${column.header}`}
                    >
                      {column.header}
                      {sortKey === column.key ? (
                        sortDirection === "asc" ? (
                          <ChevronUp aria-hidden="true" className="size-3.5" />
                        ) : (
                          <ChevronDown aria-hidden="true" className="size-3.5" />
                        )
                      ) : (
                        <ChevronsUpDown
                          aria-hidden="true"
                          className="size-3.5 opacity-50"
                        />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {visibleRows.map((row) => (
              <tr key={row.id} className="h-14 hover:bg-base">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn("px-4 py-3 text-text-primary", column.className)}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border-default px-4 py-3 text-xs text-text-secondary">
        <span>
          {orderedRows.length === 0
            ? "0 elementos"
            : `${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, orderedRows.length)} de ${orderedRows.length}`}
        </span>
        <div className="flex gap-2">
          <button
            className="rounded border border-border-default px-3 py-1.5 disabled:cursor-not-allowed disabled:text-text-muted"
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            disabled={currentPage === 0}
          >
            Anterior
          </button>
          <button
            className="rounded border border-border-default px-3 py-1.5 disabled:cursor-not-allowed disabled:text-text-muted"
            onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
            disabled={currentPage >= pageCount - 1}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
