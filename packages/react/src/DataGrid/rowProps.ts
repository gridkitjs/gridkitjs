import type { ResolvedRow, RowProps } from "@gridkitjs/core";

export type RowAttributes = Readonly<Record<`data-${string}`, string>>;

/** What `GridRow` is handed from `getRowProps`, both always present. */
export interface ResolvedRowProps {
  readonly className: string;
  readonly attributes: RowAttributes;
}

/** Shared by every row without attributes, so each compares equal to the last. */
export const NO_ATTRIBUTES: RowAttributes = {};

const NO_ROW_PROPS: ResolvedRowProps = {
  className: "",
  attributes: NO_ATTRIBUTES,
};

function sameAttributes(a: RowAttributes, b: RowAttributes): boolean {
  const keys = Object.keys(a) as (keyof RowAttributes)[];
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => a[key] === b[key])
  );
}

/**
 * Runs `getRowProps` over the rows about to render, keeping each row's
 * attributes the same object as last time while they read the same.
 *
 * `GridRow` is memoised, and `getRowProps` returns a fresh attributes object
 * on every call — often from an inline arrow that is itself new on every
 * render — so handing those objects straight through would redraw every row
 * on every render. The class is a string and compares by value already.
 *
 * Remembers only the rows of the latest call, so a virtualized grid scrolled
 * over many rows holds no more than the ones on screen.
 */
export function createRowPropsResolver<Row>(): (
  rows: readonly ResolvedRow<Row>[],
  getRowProps: ((row: ResolvedRow<Row>) => RowProps) | undefined,
) => (rowId: string) => ResolvedRowProps {
  let previous = new Map<string, RowAttributes>();
  return (rows, getRowProps) => {
    if (getRowProps === undefined) {
      previous = new Map();
      return () => NO_ROW_PROPS;
    }
    const resolved = new Map<string, ResolvedRowProps>();
    const attributesById = new Map<string, RowAttributes>();
    for (const entry of rows) {
      const { className = "", attributes = NO_ATTRIBUTES } = getRowProps(entry);
      const last = previous.get(entry.rowId);
      const stable =
        last !== undefined && sameAttributes(last, attributes)
          ? last
          : attributes;
      attributesById.set(entry.rowId, stable);
      resolved.set(entry.rowId, { className, attributes: stable });
    }
    previous = attributesById;
    return (rowId) => resolved.get(rowId) ?? NO_ROW_PROPS;
  };
}
