import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AlertCard } from "./alert-card";
import type { Alert } from "@/types";

const alert: Alert = {
  id: "alert-1",
  nodeId: "node-1",
  variable: "humidity",
  value: 48,
  rangeMin: 20,
  rangeMax: 40,
  severity: "CRITICA",
  status: "ACTIVA",
  message: "La humedad superó el rango esperado.",
  createdAt: "2026-10-22T12:00:00.000Z",
  node: { id: "node-1", name: "Nodo norte", deviceId: "AGRO-01" },
};

describe("AlertCard", () => {
  it("presenta la alerta y activa acciones por teclado", () => {
    const onAction = vi.fn();
    render(<AlertCard alert={alert} onAction={onAction} />);

    expect(screen.getByText("Crítica")).toBeInTheDocument();
    expect(screen.getByText("La humedad superó el rango esperado.")).toBeInTheDocument();
    const closeButton = screen.getByRole("button", { name: "Cerrar" });
    closeButton.focus();
    fireEvent.keyDown(closeButton, { key: "Enter" });
    fireEvent.click(closeButton);
    expect(onAction).toHaveBeenCalledWith("alert-1", "close");
  });
});
