import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./overlays";

describe("Modal", () => {
  it("asocia el título, enfoca el primer control y conserva el foco con teclado", () => {
    const onClose = vi.fn();
    render(
      <>
        <button type="button">Abrir</button>
        <Modal open onClose={onClose} title="Confirmar cambio">
          <button type="button">Guardar</button>
        </Modal>
      </>,
    );

    const dialog = screen.getByRole("dialog", { name: "Confirmar cambio" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const closeButton = screen.getByRole("button", { name: "Cerrar ventana" });
    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
