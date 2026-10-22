import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TerrainCanvas, type TerrainNode } from "./terrain-canvas";

const node: TerrainNode = {
  id: "node-1",
  deviceId: "AGRO-01",
  name: "Nodo norte",
  x: 50,
  y: 50,
  status: "optimal",
  readings: {
    humidity: 35,
    ph: 6.5,
    salinity: 1,
    soilTemp: 23,
    ambientTemp: 26,
  },
  timestamp: "2026-10-22T12:00:00.000Z",
  cropName: "Maíz",
  stateName: "Crecimiento",
  battery: 90,
  alertMessage: null,
};

describe("TerrainCanvas", () => {
  it("permite seleccionar un nodo y acercar el mapa con controles accesibles", () => {
    const onSelectNode = vi.fn();
    render(
      <TerrainCanvas
        nodes={[node]}
        canMove={false}
        selectedId={null}
        onSelectNode={onSelectNode}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Nodo norte/i }));
    expect(onSelectNode).toHaveBeenCalledWith("node-1");

    fireEvent.click(screen.getByRole("button", { name: "Acercar" }));
    expect(screen.getByText("110%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cuadrícula" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
