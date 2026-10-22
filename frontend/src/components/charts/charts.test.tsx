import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KPICard } from "./charts";

describe("KPICard", () => {
  it("expone la métrica y su unidad como contenido legible", () => {
    render(
      <KPICard
        label="Humedad"
        value={36.5}
        unit="%"
        variable="humidity"
        data={[34, 35, 36, 36.5]}
      />,
    );

    expect(screen.getByText("Humedad")).toBeInTheDocument();
    expect(screen.getByText(/36\.5/)).toBeInTheDocument();
    expect(screen.getByText("%")).toBeInTheDocument();
  });
});
