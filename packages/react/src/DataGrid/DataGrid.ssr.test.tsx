import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataGrid, type ColumnDefinition } from "../index";

interface Row {
  id: string;
  name: string;
  status: string;
}

const rows: Row[] = [
  { id: "1", name: "Alpha", status: "ok" },
  { id: "2", name: "Beta", status: "warn" },
  { id: "3", name: "Gamma", status: "ok" },
];

const columns: ColumnDefinition<Row>[] = [
  { field: "name", header: "Name" },
  { field: "status", header: "Status" },
];

describe("DataGrid on the server", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders to a string with its header cells and rows", () => {
    const error = vi.spyOn(console, "error");
    const warn = vi.spyOn(console, "warn");
    const html = renderToString(
      <DataGrid columns={columns} dataSource={rows} label="Server" />,
    );
    expect(html).toContain("<table");
    expect(html).toMatch(/<th[^>]*>.*Name/);
    expect(html).toMatch(/<th[^>]*>.*Status/);
    expect(html).toContain("Gamma");
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("renders a grouped, paginated grid with a toolbar", () => {
    const error = vi.spyOn(console, "error");
    const html = renderToString(
      <DataGrid
        columns={columns}
        dataSource={rows}
        label="Server"
        groupBy={[{ columnId: "status" }]}
        paginated
        toolbar
      />,
    );
    expect(html).toContain("gridkit-grid-group-row");
    expect(error).not.toHaveBeenCalled();
  });
});
