import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-md border border-border-default bg-white shadow-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-border-default px-5 py-4",
        className,
      )}
    >
      <div>
        <h2 className="font-display text-lg font-semibold text-text-primary">{title}</h2>
        {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardContent({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

const badgeStyles: Record<BadgeVariant, string> = {
  success: "bg-primary-100 text-primary-900",
  warning: "bg-orange-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-sky-100 text-sky-800",
  neutral: "bg-elevated text-text-secondary",
};

export function Badge({
  variant = "neutral",
  className,
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        badgeStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const Pill = Badge;

export type SemaphoreStatus = "optimal" | "warning" | "critical" | "offline";

const semaphoreStyles: Record<SemaphoreStatus, { dot: string; label: string }> = {
  optimal: { dot: "bg-success", label: "Óptimo" },
  warning: { dot: "bg-warning", label: "Advertencia" },
  critical: { dot: "bg-danger", label: "Crítico" },
  offline: { dot: "bg-neutral", label: "Sin conexión" },
};

export function Semaphore({
  status,
  label,
}: {
  status: SemaphoreStatus;
  label?: string;
}) {
  const state = semaphoreStyles[status];
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary">
      <span aria-hidden="true" className={cn("size-2.5 rounded-full", state.dot)} />
      {label || state.label}
    </span>
  );
}

export function Skeleton({
  variant = "text",
  className,
}: {
  variant?: "text" | "card" | "table";
  className?: string;
}) {
  if (variant === "card") {
    return (
      <div
        aria-label="Cargando contenido"
        className={cn("h-36 animate-pulse rounded-md bg-elevated", className)}
      />
    );
  }

  if (variant === "table") {
    return (
      <div className={cn("space-y-3", className)} aria-label="Cargando tabla">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="h-10 animate-pulse rounded-sm bg-elevated" />
        ))}
      </div>
    );
  }

  return (
    <span
      aria-label="Cargando texto"
      className={cn(
        "inline-block h-4 w-full animate-pulse rounded bg-elevated",
        className,
      )}
    />
  );
}

export function Spinner({ label = "Cargando" }: { label?: string }) {
  return (
    <span
      role="status"
      className="inline-flex items-center gap-2 text-sm text-text-secondary"
    >
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-primary-100 border-t-primary-700"
      />
      {label}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-md border border-dashed border-border-default bg-white px-6 py-8 text-center">
      {icon && <div className="mb-3 text-primary-500">{icon}</div>}
      <h3 className="font-display font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-text-secondary">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
