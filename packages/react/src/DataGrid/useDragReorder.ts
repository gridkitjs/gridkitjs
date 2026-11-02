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
   * Whether the gesture that just ended was a drag rather than a click, for
   * a press that has something of its own to do with a click.
   *
   * Reading it clears it, so that a press which never opened a drag at all
   * does not see the last one's answer.
   */
  justDragged: () => boolean;
}

/**
 * `@gridkitjs/dom`'s `startDragReorder`, the pointer mechanics behind every
 * drag-to-reorder gesture in the grid, with what it reports held as state
 * for the header and the group-by bar to draw. A column header drag and a
 * group-by chip drag (`useColumnDrag`, `useGroupByDrag`) share it, so they
 * can only ever differ in their own hit-testing (`resolveTarget`).
 */
export default function useDragReorder<Target>({
  resolveTarget,
  onDrop,
}: UseDragReorderOptions<Target>): DragReorderApi<Target> {
  const [drag, setDrag] = useState<DragReorderState<Target>>(NO_DRAG);
  const dragged = useRef(false);

  function justDragged(): boolean {
    const answer = dragged.current;
    dragged.current = false;
    return answer;
  }

  function startDrag(
    id: string,
    grabElement: HTMLElement,
    event: ReactPointerEvent<HTMLElement>,
  ): void {
    startDragReorder(id, grabElement, event, {
      resolveTarget,
      onState(state) {
        // Latched for the `click` that follows the release, which is the
        // only thing that can tell a drag apart from a press in the same
        // spot.
        if (state.draggedId !== null) {
          dragged.current = true;
        }
        setDrag(state);
      },
      onDrop,
    });
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
