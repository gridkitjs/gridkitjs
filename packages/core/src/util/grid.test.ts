import { describe, expect, test } from "vitest";

import type { ColumnDefinition, FieldPath } from "../types";
import {
  accessDotted,
  alignmentForType,
  buildKeyShortcuts,
  defineColumnsFromRows,
  resolveColumnLabel,
  resolveRowId,
} from "./grid";

interface Application {
  Id: number;
  Name: string;
  Owner: { Name: string };
}

interface SampleRow {
  Id: number;
  Tags: readonly string[];
  CreatedAt: Date;
  Application: Application;
}

/**
 * One row, built fresh. A function rather than an index into `sampleRows`,
 * which `noUncheckedIndexedAccess` types as possibly undefined.
 */
function sampleRow(): SampleRow {
  return {
    Id: 1,
    Tags: ["a"],
    CreatedAt: new Date(0),
    Application: { Id: 9, Name: "Portal", Owner: { Name: "Ada" } },
  };
}

const sampleRows: readonly SampleRow[] = [sampleRow()];

function fieldsOf(columns: readonly { field: string }[]): string[] {
  return columns.map((column) => column.field);
}

describe("defineColumnsFromRows", () => {
  test("derives one column per field, in key order", () => {
    const columns = defineColumnsFromRows([{ Id: 1, Name: "a" }]);

    expect(fieldsOf(columns)).toEqual(["Id", "Name"]);
  });

  test("flattens a nested object without emitting the object itself", () => {
    const columns = defineColumnsFromRows(sampleRows);

    expect(fieldsOf(columns)).toEqual([
      "Id",
      "Tags",
      "CreatedAt",
      "Application.Id",
      "Application.Name",
    ]);
  });

  test("skips objects nested more than one level deep", () => {
    const columns = defineColumnsFromRows([
      { Application: { Owner: { Name: "Ada" }, Id: 9 } },
    ]);

    expect(fieldsOf(columns)).toEqual(["Application.Id"]);
  });

  test("contributes nothing for an object with no leaf properties", () => {
    const columns = defineColumnsFromRows([
      { Id: 1, Application: { Owner: { Name: "Ada" } } },
    ]);

    expect(fieldsOf(columns)).toEqual(["Id"]);
  });

  test("treats arrays and dates as single cell values", () => {
    const columns = defineColumnsFromRows([
      { Tags: ["a", "b"], CreatedAt: new Date(0) },
    ]);

    expect(fieldsOf(columns)).toEqual(["Tags", "CreatedAt"]);
  });

  test("treats null as a leaf rather than something to drill into", () => {
    const columns = defineColumnsFromRows([{ Id: 1, Application: null }]);

    expect(fieldsOf(columns)).toEqual(["Id", "Application"]);
  });

  test("unions sparse rows in first-seen order without duplicates", () => {
    const columns = defineColumnsFromRows([
      { Id: 1, Name: "a" },
      { Id: 2, Status: "ok" },
      { Id: 3, Name: "b" },
    ]);

    expect(fieldsOf(columns)).toEqual(["Id", "Name", "Status"]);
  });

  test("returns nothing for empty input or rows that are not objects", () => {
    expect(defineColumnsFromRows([])).toEqual([]);
    expect(defineColumnsFromRows(["a", "b"])).toEqual([]);
  });
});

describe("FieldPath", () => {
  test("covers flat keys and one level of nesting", () => {
    const valid = [
      "Id",
      "Tags",
      "CreatedAt",
      "Application.Id",
      "Application.Name",
    ] satisfies FieldPath<SampleRow>[];

    expect(valid).toHaveLength(5);
  });

  test("excludes nested objects themselves and anything deeper", () => {
    const invalid: string[] = [
      // @ts-expect-error a nested object holds no cell value of its own
      "Application" satisfies FieldPath<SampleRow>,
      // @ts-expect-error two levels deep is beyond an addressable path
      "Application.Owner.Name" satisfies FieldPath<SampleRow>,
    ];

    expect(invalid).toHaveLength(2);
  });

  test("still accepts an arbitrary string, since it only drives DX", () => {
    const column: ColumnDefinition<SampleRow> = { field: "Application.Nmae" };

    expect(column.field).toBe("Application.Nmae");
  });
});

describe("ColumnDefinition", () => {
  test("widens to a richer node type, as @gridkitjs/react relies on", () => {
    // Stands in for ReactNode so this package stays framework-agnostic.
    const widened: readonly ColumnDefinition<SampleRow, string | object>[] =
      defineColumnsFromRows(sampleRows);

    expect(widened).toHaveLength(5);
  });

  test("accepts a headerTemplate as either content or a lazy function", () => {
    const columns: readonly ColumnDefinition<SampleRow>[] = [
      { field: "Id", headerTemplate: "Identifier" },
      { field: "Application.Name", headerTemplate: () => "App name" },
    ];
    const [, lazy] = columns;

    expect(typeof lazy?.headerTemplate).toBe("function");
  });

  test("calls cellTemplate with the value, its row and the row index", () => {
    const row = sampleRow();
    const column: ColumnDefinition<SampleRow> = {
      field: "Application.Name",
      cellTemplate: ({ value, row: given, rowIndex }) =>
        `${String(rowIndex)}:${String(value)}:${String(given.Id)}`,
    };

    expect(
      column.cellTemplate?.({
        value: accessDotted(row, column.field),
        row,
        rowIndex: 0,
        datasetIndex: 0,
        rowId: "1",
        selected: false,
      }),
    ).toBe("0:Portal:1");
  });

  test("hands a cellTemplate its row's id and whether it is selected", () => {
    const column: ColumnDefinition<SampleRow> = {
      field: "Id",
      cellTemplate: ({ rowId, selected }) => `${rowId}:${String(selected)}`,
    };

    expect(
      column.cellTemplate?.({
        value: 1,
        row: sampleRow(),
        rowIndex: 0,
        datasetIndex: 0,
        rowId: "app-1",
        selected: true,
      }),
    ).toBe("app-1:true");
  });

  test("widens cellTemplate with the node type, as a header does", () => {
    const marker = { node: true };
    const column: ColumnDefinition<SampleRow, string | object> = {
      field: "Id",
      cellTemplate: () => marker,
    };

    expect(
      column.cellTemplate?.({
        value: 1,
        row: sampleRow(),
        rowIndex: 0,
        datasetIndex: 0,
        rowId: "0",
        selected: false,
      }),
    ).toBe(marker);
  });

  test("accepts an optional wrap config, unread by core itself", () => {
    const column: ColumnDefinition<SampleRow> = {
      field: "Id",
      wrap: { header: true, cells: true },
    };

    expect(column.wrap).toEqual({ header: true, cells: true });
  });

  test("accepts optional cellClassName and headerClassName, unused by core itself", () => {
    const column: ColumnDefinition<SampleRow> = {
      field: "Id",
      cellClassName: "italic",
      headerClassName: "italic",
    };

    expect(column.cellClassName).toBe("italic");
    expect(column.headerClassName).toBe("italic");
  });
});

describe("alignmentForType", () => {
  test("aligns every numeric type right", () => {
    expect(alignmentForType("number")).toBe("right");
    expect(alignmentForType("decimal")).toBe("right");
    expect(alignmentForType("currency")).toBe("right");
    expect(alignmentForType("percent")).toBe("right");
  });

  test("aligns everything else left", () => {
    expect(alignmentForType("string")).toBe("left");
    expect(alignmentForType("boolean")).toBe("left");
    expect(alignmentForType("date")).toBe("left");
    expect(alignmentForType("time")).toBe("left");
    expect(alignmentForType("dateTime")).toBe("left");
  });

  test("aligns a number derived from data right, as an inferred column does", () => {
    const [id, name] = defineColumnsFromRows([{ Id: 1, Name: "a" }]);

    expect(id?.alignment).toBe("right");
    expect(name?.alignment).toBe("left");
  });
});

describe("resolveColumnLabel", () => {
  test("takes the headerTemplate as given", () => {
    expect(
      resolveColumnLabel<SampleRow, string>({
        field: "Id",
        headerTemplate: "#",
      }),
    ).toBe("#");
  });

  test("calls a lazy headerTemplate", () => {
    expect(
      resolveColumnLabel<SampleRow, string>({
        field: "Id",
        headerTemplate: () => "Identifier",
      }),
    ).toBe("Identifier");
  });

  test("reads a label off the field path when no headerTemplate is set", () => {
    expect(resolveColumnLabel<SampleRow, string>({ field: "Id" })).toBe("Id");
    expect(
      resolveColumnLabel<SampleRow, string>({ field: "Application.Id" }),
    ).toBe("Application Id");
  });

  test("keeps an empty headerTemplate rather than falling back to the field", () => {
    expect(
      resolveColumnLabel<SampleRow, string>({
        field: "Id",
        headerTemplate: "",
      }),
    ).toBe("");
  });
});

describe("resolveRowId", () => {
  test("takes the id getRowId gives", () => {
    expect(resolveRowId(sampleRow(), 3, (row) => String(row.Id))).toBe("1");
  });

  test("hands getRowId the position alongside the row", () => {
    expect(
      resolveRowId(
        sampleRow(),
        3,
        (row, index) => `${String(index)}-${String(row.Id)}`,
      ),
    ).toBe("3-1");
  });

  test("falls back to the position when no getRowId is given", () => {
    expect(resolveRowId(sampleRow(), 3)).toBe("3");
    expect(resolveRowId(sampleRow(), 3, undefined)).toBe("3");
  });

  /** An id is a string wherever it comes from, so state keys stay comparable. */
  test("gives a string for the fallback as much as for a getRowId", () => {
    expect(typeof resolveRowId(sampleRow(), 0)).toBe("string");
  });
});

describe("accessDotted", () => {
  test("accesses a value at a dotted path", () => {
    const obj = { foo: { bar: { baz: "qux" } } };

    expect(accessDotted(obj, "foo.bar.baz")).toBe("qux");
  });
});

describe("buildKeyShortcuts", () => {
  test("names every capability the column has", () => {
    expect(
      buildKeyShortcuts({
        reorderable: true,
        resizable: true,
        sortable: true,
        groupable: true,
      }),
    ).toBe(
      "Control+ArrowLeft Control+ArrowRight Alt+ArrowLeft Alt+ArrowRight Alt+Enter Alt+ArrowUp Alt+ArrowDown",
    );
  });

  test("omits a capability the column does not have", () => {
    expect(
      buildKeyShortcuts({
        reorderable: false,
        resizable: true,
        sortable: false,
        groupable: false,
      }),
    ).toBe("Alt+ArrowLeft Alt+ArrowRight Alt+Enter");
  });

  test("is empty for a column with none of the four", () => {
    expect(
      buildKeyShortcuts({
        reorderable: false,
        resizable: false,
        sortable: false,
        groupable: false,
      }),
    ).toBe("");
  });
});
