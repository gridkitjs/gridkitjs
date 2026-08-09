import type React from "react";
import type {
  ComponentFixtures,
  MountResult,
} from "@playwright/experimental-ct-react";

const DEFAULT_WIDTH = 640;

export interface MountGridOptions {
  /**
   * The mounting container's width in pixels. Explicit and known rather than
   * left to the viewport, so `resizeMode="fit"` has a deterministic width to
   * fit to and container-resize assertions have a fixed starting point.
   */
  width?: number;
}

/**
 * Wraps CT's `mount()` with the plumbing every grid test needs: a container
 * of a known width, and a wait for the grid itself to be visible before the
 * test proceeds.
 *
 * Waits for either `role="grid"` or `role="treegrid"` — a grid with an
 * active `groupBy` (or `defaultGroupBy`) renders the latter, per
 * `DataGrid.tsx`'s own note on why the role switches dynamically.
 */
export async function mountGrid(
  mount: ComponentFixtures["mount"],
  ui: React.JSX.Element,
  options?: MountGridOptions,
): Promise<MountResult> {
  const width = options?.width ?? DEFAULT_WIDTH;
  const root = await mount(<div style={{ width }}>{ui}</div>);
  await root
    .getByRole("grid")
    .or(root.getByRole("treegrid"))
    .waitFor({ state: "visible" });
  return root;
}

/**
 * Re-renders a grid mounted with `mountGrid` — new props (a changed
 * `dataSource`, a new `width` to simulate a container resize) without
 * unmounting, so component state (selection, sizing, order) survives the
 * update exactly as it would across a real prop change.
 */
export async function updateGrid(
  root: MountResult,
  ui: React.JSX.Element,
  options?: MountGridOptions,
): Promise<void> {
  const width = options?.width ?? DEFAULT_WIDTH;
  await root.update(<div style={{ width }}>{ui}</div>);
}
