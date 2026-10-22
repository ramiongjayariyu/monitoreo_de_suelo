import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table } from "./data-table";

interface Row {
  id: string;
  name: string;
  value: number;
}

const columns = [
  { key: "name", header: "Nombre", render: (row: Row) => row.name },
  {
    key: "value",
    header: "Valor",
    render: (row: Row) => row.value,
    sortValue: (row: Row) => row.value,
  },
];

describe("Table", () => {
  it("ordena filas y pagina con controles correctamente etiquetados", () => {
    render(
      <Table
        columns={columns}
        rows={[
          { id: "b", name: "Beta", value: 2 },
          { id: "a", name: "Alfa", value: 1 },
          { id: "c", name: "Gamma", value: 3 },
        ]}
        pageSize={2}
      />,
    );

    const sortButton = screen.getByRole("button", {
      name: "Ordenar por Valor",
    });
    sortButton.focus();
    fireEvent.click(sortButton);

    const table = screen.getByRole("table");
    const firstPageRows = within(table).getAllByRole("row");
    expect(firstPageRows[1]).toHaveTextContent("Alfa");
    expect(firstPageRows[2]).toHaveTextContent("Beta");

    const nextButton = screen.getByRole("button", { name: "Siguiente" });
    nextButton.focus();
    fireEvent.click(nextButton);
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Gamma");
    expect(screen.getByText("3–3 de 3")).toBeInTheDocument();
  });
});
