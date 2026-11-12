import { useState } from "react";
import type { GridMessages } from "@gridkitjs/core";
import {
  createColumnValueOptionsCache,
  type ColumnValueOptions,
} from "@gridkitjs/core/renderer";
import type { DataGridController } from "../useGridController";

/** Rows to count before the grid has any: one array, so the cache keeps its lists. */
const NO_ROWS: readonly never[] = [];

/**
 * The values a column's filter checklist lists, counted over the rows the
 * other columns' filters keep. Held by the panel host for the grid's whole
 * life, so reopening a column's checklist hands back the list it counted
 * last time rather than counting every row again — until the rows, the
 * columns, the locale, `messages` or another column's filter change.
 *
 * `messages` is the grid's own resolved object, which keeps its identity
 * while the `messages` prop does: the cache compares it by identity.
 */
export default function useFilterValueCache<Row>(
  controller: DataGridController<Row>,
  messages: GridMessages,
): (columnId: string) => ColumnValueOptions {
  const [cache] = useState(createColumnValueOptionsCache<Row>);

  return (columnId) => {
    const { dataSource = NO_ROWS, locale } = controller.getOptions();
    return cache.get(
      dataSource,
      controller.getView().dataColumns,
      controller.getState().filter,
      columnId,
      locale === undefined ? { messages } : { locale, messages },
    );
  };
}
