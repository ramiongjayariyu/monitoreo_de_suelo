import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./error-boundary";

function BrokenPage(): never {
  throw new Error("Render failed");
}

describe("ErrorBoundary", () => {
  it("reemplaza fallos de render con un mensaje accesible y registra el error", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <BrokenPage />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudo mostrar esta pantalla",
    );
    expect(consoleError).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Recargar aplicación" })).toBeEnabled();
  });
});
