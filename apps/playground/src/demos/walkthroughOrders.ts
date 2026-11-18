import type { ColumnDefinition } from "@gridkitjs/react";

export interface Order {
  Id: number;
  Customer: string;
  Region: string;
  Units: number;
  Amount: number;
}

const customers = ["Acme", "Globex", "Initech", "Umbrella", "Hooli", "Stark"];
const regions = ["North", "South", "East", "West"];

/** Twelve orders: three per region, two per customer. */
export const orders: readonly Order[] = Array.from(
  { length: 12 },
  (_unused, index) => ({
    Id: index + 1,
    Customer: customers[index % customers.length] ?? "Acme",
    Region: regions[index % regions.length] ?? "North",
    Units: 1 + ((index * 7) % 20),
    Amount: 120 + ((index * 53) % 880),
  }),
);

export const orderColumns: readonly ColumnDefinition<Order>[] = [
  { field: "Id", width: 70, type: "number" },
  { field: "Customer", width: 140 },
  { field: "Region", width: 110 },
  { field: "Units", width: 90, type: "number" },
  { field: "Amount", width: 130, type: "currency" },
];
