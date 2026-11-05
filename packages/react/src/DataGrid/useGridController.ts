import { useState, useSyncExternalStore, type ReactNode } from "react";
import {
  createGridController,
  type GridController,
  type GridControllerOptions,
  type GridState,
  type GridView,
} from "@gridkitjs/core";

/** The grid's controller, bound to React's node type for its columns. */
export type DataGridController<Row> = GridController<Row, ReactNode>;

export interface GridControllerBinding<Row> {
  controller: DataGridController<Row>;
  /** The state this render draws — re-read on every change the controller commits. */
  state: GridState<Row>;
  view: GridView<Row, ReactNode>;
}

/**
 * The grid's controller, created once and handed the current props on every
 * render. The controller holds every slice of state and derives the view, so
 * this hook only keeps React in step with it: `setOptions` runs during render,
 * so the view drawn always matches the props drawn, and the subscription
 * re-renders the grid when an action commits.
 *
 * `getState` is the snapshot: the controller hands back the same object until
 * a slice changes, which is exactly the stability `useSyncExternalStore`
 * needs, and a change the props made (a controlled slice) is already in it by
 * the time it is read here. It is the server snapshot too: on the server and
 * while hydrating, the controller has seen only the props, so both sides read
 * the same initial state.
 */
export default function useGridController<Row>(
  options: GridControllerOptions<Row, ReactNode>,
): GridControllerBinding<Row> {
  const [controller] = useState(() =>
    createGridController<Row, ReactNode>(options),
  );
  controller.setOptions(options);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
  return { controller, state, view: controller.getView() };
}
