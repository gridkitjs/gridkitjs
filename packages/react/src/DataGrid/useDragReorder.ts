import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  NO_DRAG,
  startDragReorder,
  type DragReorderHandlers,
  type DragReorderState,
} from "@gridkitjs/dom";
import useGestureSignal from "./useGestureSignal";

type UseDragReorderOptions<Target> = Pick<
  DragReorderHandlers<Target>,
  "resolveTarget" | "onDrop"
>;

export interface DragReorderApi<Target> extends DragReorderState<Target> {
  startDrag: (
    id: string,
    grabElement: HTMLElement,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  /**
   * Whether `id`'s last press opened a drag, so the `click` that follows its
   * release is not a click, for a press that has something of its own to do
   * with one.
   *
   * Reading it clears it, and so does the next drag's press, so a press that
   * never opened a drag — on an item that cannot be dragged, or after a drag
   * cancelled with Escape and released elsewhere — does not see the last
   * one's answer.
   */
  justDragged: (id: string) => boolean;
}

/**
 * `@gridkitjs/dom`'s `startDragReorder`, the pointer mechanics behind every
 * drag-to-reorder gesture in the grid, with what it reports held as state
 * for the header and the group-by bar to draw. A column header drag and a
 * group-by chip drag (`useColumnDrag`, `useGroupByDrag`) share it, so they
 * can only ever differ in their own hit-testing (`resolveTarget`).
 *
 * The drag ends with the component, and with its grab element should a
 * render remove it (`useGestureSignal`).
 */
export default function useDragReorder<Target>({
  resolveTarget,
  onDrop,
}: UseDragReorderOptions<Target>): DragReorderApi<Target> {
  const [drag, setDrag] = useState<DragReorderState<Target>>(NO_DRAG);
  /**
   * The item whose press opened a drag, held for the `click` that follows
   * the release: the only thing that can tell a drag apart from a press in
   * the same spot.
   */
  const openedDragId = useRef<string | null>(null);
  const startGesture = useGestureSignal();

  function justDragged(id: string): boolean {
    const answer = openedDragId.current === id;
    openedDragId.current = null;
    return answer;
  }

  function startDrag(
    id: string,
    grabElement: HTMLElement,
    event: ReactPointerEvent<HTMLElement>,
  ): void {
    const started = startGesture(grabElement, (signal) =>
      startDragReorder(id, grabElement, event, {
        resolveTarget,
        onState(state) {
          if (state.draggedId !== null) {
            openedDragId.current = state.draggedId;
          }
          setDrag(state);
        },
        onDrop,
        signal,
      }),
    );
    // Only a press that began a drag clears it, so a second finger landing
    // mid-drag leaves the drag under way its answer. The new drag reports
    // nothing before its first move, so this never clears what it set.
    if (started) {
      openedDragId.current = null;
    }
  }

  // A new object each render, as `useColumnDrag`/`useColumnResize` return:
  // the handlers close over `resolveTarget`/`onDrop`, and a stable identity
  // would buy nothing.
  return {
    draggedId: drag.draggedId,
    dropTarget: drag.dropTarget,
    ghostTransform: drag.ghostTransform,
    startDrag,
    justDragged,
  };
}
