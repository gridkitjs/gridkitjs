import { defineColumnsFromRows } from "@gridkitjs/core";
import { DataGrid } from "@gridkitjs/react";

interface Order {
  id: number;
  customer: string;
  amount: number;
}

const orders: Order[] = [
  { id: 1, customer: "Alpha", amount: 1250.5 },
  { id: 2, customer: "Beta", amount: 80 },
  { id: 3, customer: "Gamma", amount: 19.99 },
];

const columns = defineColumnsFromRows(orders);

export function App() {
  return (
    <DataGrid
      columns={columns}
      dataSource={orders}
      label="Orders"
      paginated
      toolbar
    />
  );
}
