import type { MountResult } from "@playwright/experimental-ct-react";

/**
 * The `aria-rowindex` of every row the grid exposes, header and footer
 * included, in DOM order, as numbers; a row without one reads `NaN`, so it
 * can never pass for a real index.
 */
export async function ariaRowIndexes(root: MountResult): Promise<number[]> {
  return root
    .locator('[role="row"]')
    .evaluateAll((rows) =>
      rows.map((row) => Number(row.getAttribute("aria-rowindex") ?? NaN)),
    );
}

/** The grid's `aria-rowcount`, as a number, whether it is a grid or a treegrid. */
export async function ariaRowCount(root: MountResult): Promise<number> {
  const value = await root
    .locator('[role="grid"], [role="treegrid"]')
    .getAttribute("aria-rowcount");
  return Number(value ?? NaN);
}

/** `count` consecutive integers starting at `from`. */
export function consecutive(from: number, count: number): number[] {
  return Array.from({ length: count }, (_unused, index) => from + index);
}
