import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Info, Search, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button, Checkbox, Input, Label } from "./primitives";
import { ToastContext, type ToastInput, type ToastKind } from "./toast-context";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current
      ?.querySelector<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      )
      ?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-lg",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-default px-6 py-5">
          <div>
            <h2
              id={titleId}
              className="font-display text-xl font-semibold text-text-primary"
            >
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-text-secondary">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-secondary hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Cerrar ventana"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border-default px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-secondary">
        Esta acción puede afectar la información asociada.
      </p>
    </Modal>
  );
}

interface ToastEntry extends ToastInput {
  id: number;
  type: ToastKind;
}

const toastStyle: Record<ToastKind, string> = {
  success: "border-success",
  warning: "border-warning",
  danger: "border-danger",
  info: "border-info",
};

const toastIcon: Record<ToastKind, ReactNode> = {
  success: <Check aria-hidden="true" className="size-4 text-success" />,
  warning: <Info aria-hidden="true" className="size-4 text-warning" />,
  danger: <Info aria-hidden="true" className="size-4 text-danger" />,
  info: <Info aria-hidden="true" className="size-4 text-info" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((toast: ToastInput) => {
    const entry: ToastEntry = {
      ...toast,
      id: ++nextId.current,
      type: toast.type || "info",
    };
    setToasts((items) => [...items, entry].slice(-3));
  }, []);

  useEffect(() => {
    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismiss(toast.id), 5000),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [dismiss, toasts]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions removals"
        className="fixed right-4 top-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === "danger" ? "alert" : "status"}
            className={cn(
              "flex items-start gap-3 rounded-md border-l-4 bg-white p-4 shadow-md",
              toastStyle[toast.type],
            )}
          >
            {toastIcon[toast.type]}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">{toast.title}</p>
              {toast.description && (
                <p className="mt-1 text-xs text-text-secondary">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Cerrar notificación"
              className="rounded p-1 text-text-muted hover:bg-elevated"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-primary-900 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}

export function DatePicker({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}) {
  const rangeId = useId();
  return (
    <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <legend className="mb-2 text-sm font-medium text-text-secondary">
        Rango de fechas
      </legend>
      <DatePicker
        id={`${rangeId}-from`}
        label="Desde"
        value={from}
        onChange={(next) => onChange({ from: next, to })}
      />
      <DatePicker
        id={`${rangeId}-to`}
        label="Hasta"
        value={to}
        onChange={(next) => onChange({ from, to: next })}
      />
    </fieldset>
  );
}

export interface MultiSelectOption {
  value: string;
  label: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
}: {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const filteredOptions = options.filter((option) =>
    option.label.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
  );

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  function toggle(valueToToggle: string) {
    onChange(
      value.includes(valueToToggle)
        ? value.filter((item) => item !== valueToToggle)
        : [...value, valueToToggle],
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-sm border border-border-default bg-white px-3 text-left text-sm text-text-primary shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <span className="truncate">
          {value.length
            ? options
                .filter((option) => value.includes(option.value))
                .map((option) => option.label)
                .join(", ")
            : placeholder}
        </span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-text-muted" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-border-default bg-white p-2 shadow-md">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-2.5 top-2.5 size-4 text-text-muted"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8"
              aria-label={searchPlaceholder}
            />
          </div>
          <ul
            role="listbox"
            aria-multiselectable="true"
            className="mt-2 max-h-48 overflow-y-auto"
          >
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value.includes(option.value)}
                    onClick={() => toggle(option.value)}
                    className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-base"
                  >
                    <Checkbox
                      checked={value.includes(option.value)}
                      readOnly
                      tabIndex={-1}
                    />
                    {option.label}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-2 py-3 text-sm text-text-muted">
                No se encontraron opciones.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
