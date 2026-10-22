import { createContext, useContext } from "react";

export type ToastKind = "success" | "warning" | "danger" | "info";
export interface ToastInput {
  title: string;
  description?: string;
  type?: ToastKind;
}
export interface ToastContextValue {
  showToast: (toast: ToastInput) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast debe usarse dentro de ToastProvider.");
  return value;
}
