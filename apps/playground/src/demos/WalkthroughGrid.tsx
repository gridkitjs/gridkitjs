import { useState } from "react";
import type { GridContextMenuOptions } from "@gridkitjs/core";
import { DataGrid } from "@gridkitjs/react";
import { orderColumns, orders, type Order } from "./walkthroughOrders";

/**
 * A small grid with the features a screen-reader pass walks through: a
 * toolbar with search and the column chooser, sorting, filter menus, row and
 * cell selection, a context menu with a submenu, and a pager over three
 * pages. Nothing else sits around it, so the reading order is the grid's own.
 */
export function WalkthroughGrid() {
  const [log, setLog] = useState<readonly string[]>([]);

  function markAs(status: string, orderId: number | undefined): void {
    setLog((current) =>
      [`Order ${String(orderId)} marked ${status}`, ...current].slice(0, 5),
    );
  }

  const contextMenu: GridContextMenuOptions<Order> = {
    cell: ({ defaults }) => [
      ...defaults,
      "separator",
      {
        type: "submenu",
        id: "order.mark",
        label: "Mark as",
        items: [
          {
            type: "item",
            id: "order.markPaid",
            label: "Paid",
            onSelect: ({ row }) => {
              markAs("paid", row?.row.Id);
            },
          },
          {
            type: "item",
            id: "order.markSent",
            label: "Sent",
            onSelect: ({ row }) => {
              markAs("sent", row?.row.Id);
            },
          },
        ],
      },
    ],
  };

  return (
    <div>
      <DataGrid
        columns={orderColumns}
        dataSource={orders}
        getRowId={(row) => String(row.Id)}
        label="Orders"
        borders="all"
        sortableColumns
        filterableColumns
        selectable={{ rows: "multiple", cells: "single" }}
        contextMenu={contextMenu}
        toolbar={{
          items: [
            "search",
            "separator",
            "sort.clearAll",
            "filter.clearAll",
            "column.choose",
          ],
        }}
        paginated
        defaultPagination={{ pageIndex: 0, pageSize: 5 }}
      />
      <ol className="mt-2 text-sm text-gray-600" aria-label="Order actions">
        {log.length === 0 ? (
          <li>Order actions you choose are logged here.</li>
        ) : (
          log.map((entry, index) => <li key={index}>{entry}</li>)
        )}
      </ol>
    </div>
  );
}
