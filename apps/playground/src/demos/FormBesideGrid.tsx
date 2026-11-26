import { useState } from "react";
import { Checkbox, Field, Form, FormLayout, TextInput } from "@gridkitjs/forms";
import { DataGrid, type ColumnDefinition } from "@gridkitjs/react";
import { orders, type Order } from "./walkthroughOrders";

interface EditableOrder extends Order {
  Rush: boolean;
}

const columns: readonly ColumnDefinition<EditableOrder>[] = [
  { field: "Id", width: 70, type: "number" },
  { field: "Customer", width: 140 },
  { field: "Region", width: 110 },
  { field: "Amount", width: 130, type: "currency" },
  { field: "Rush", width: 90, type: "boolean" },
];

const initialRows: readonly EditableOrder[] = orders.map((order) => ({
  ...order,
  Rush: order.Id % 4 === 0,
}));

/**
 * A grid of orders beside a form editing the selected one, so the two can
 * be compared under every preset: the same palette, lines, focus ring and
 * density. Saving writes the form back to the row.
 */
export function FormBesideGrid() {
  const [rows, setRows] = useState(initialRows);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = rows.find((row) => row.Id === selectedId) ?? null;

  function save(form: HTMLFormElement): void {
    const data = new FormData(form);
    const text = (name: string, fallback: string) => {
      const value = data.get(name);
      return typeof value === "string" ? value : fallback;
    };
    setRows((current) =>
      current.map((row) =>
        row.Id === selectedId
          ? {
              ...row,
              Customer: text("customer", row.Customer),
              Region: text("region", row.Region),
              Rush: data.get("rush") === "true",
            }
          : row,
      ),
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <DataGrid
        columns={columns}
        dataSource={rows}
        getRowId={(row) => String(row.Id)}
        label="Orders"
        borders="all"
        selectable={{ rows: "single" }}
        onRowSelectionChange={({ selected: chosen }) => {
          setSelectedId(chosen[0]?.row.Id ?? null);
        }}
      />
      {selected === null ? (
        <p className="text-sm text-gridkit-fg-muted">
          Select an order to edit it.
        </p>
      ) : (
        <Form
          // A new order starts the uncontrolled fields from its values.
          key={selected.Id}
          aria-label={`Order ${String(selected.Id)}`}
          onSubmit={(event) => {
            event.preventDefault();
            save(event.currentTarget);
          }}
        >
          <FormLayout columns={2}>
            <Field label="Customer" required>
              <TextInput name="customer" defaultValue={selected.Customer} />
            </Field>
            <Field label="Region">
              <TextInput name="region" defaultValue={selected.Region} />
            </Field>
            <Checkbox
              name="rush"
              label="Rush order"
              defaultValue={selected.Rush}
            />
          </FormLayout>
          <div>
            <button
              type="submit"
              className="rounded border border-gridkit-line px-3 py-1 text-sm hover:border-gridkit-hover-line"
            >
              Save order {selected.Id}
            </button>
          </div>
        </Form>
      )}
    </div>
  );
}
