import type { ColumnDefinition } from "@gridkitjs/react";
import { DataGrid } from "@gridkitjs/react";

interface Order {
  id: number;
  customer: string;
  status: string;
}

const orders: Order[] = [
  { id: 1, customer: "Alpha", status: "Shipped" },
  { id: 2, customer: "Beta", status: "Pending" },
  { id: 3, customer: "Gamma", status: "Shipped" },
];

const columns: ColumnDefinition<Order>[] = [
  { field: "customer", header: "Customer" },
  { field: "status", header: "Status" },
];

// A server component rendering the grid directly, with no client-only
// wrapper: the package's own "use client" banner has to be enough, and the
// first render has to work on the server.
export default function Page() {
  return (
    <main>
      <DataGrid
        columns={columns}
        dataSource={orders}
        label="Orders"
        groupBy={[{ columnId: "status" }]}
        paginated
      />
    </main>
  );
}
