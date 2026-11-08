import {
  mayStartGesture,
  startPointerGesture,
  type PointerPress,
} from "./pointerGesture";

/**
 * How far the pointer travels before a press becomes a drag. Below it the
 * gesture is still a click, which is what leaves the pressed element free to
 * take one.
 */
const DRAG_THRESHOLD = 4;

/** What a renderer draws while a reorder drag is open. */
export interface DragReorderState<Target> {
  /** The item being dragged, once the press has become a drag. */
  readonly draggedId: string | null;
  /** Where it would land if released now, `null` for nowhere valid. */
  readonly dropTarget: Target | null;
  /** Where the element trailing the pointer sits, as a CSS `transform`. */
  readonly ghostTransform: string | null;
}

/** The state while nothing is dragged — the one a drag reports when it ends. */
export const NO_DRAG: DragReorderState<never> = {
  draggedId: null,
  dropTarget: null,
  ghostTransform: null,
};

export interface DragReorderHandlers<Target> {
  /**
   * Where a drop at `(clientX, clientY)` would land, or `null` for nowhere
   * valid — including a gap `id` already occupies, so a drop target only
   * ever promises a move that happens. Called on every pointer move once the
   * drag has opened. `resolveColumnDropTarget` and
   * `resolveGroupByDropTarget` are the grid's own.
   */
  readonly resolveTarget: (
    clientX: number,
    clientY: number,
    id: string,
  ) => Target | null;
  /** Every change to what the renderer draws, `NO_DRAG` once the drag ends. */
  readonly onState: (state: DragReorderState<Target>) => void;
  /** The pointer was released over a valid target. */
  readonly onDrop: (target: Target, id: string) => void;
  /**
   * Cancels the drag when aborted, as Escape does: `onState(NO_DRAG)`, no
   * drop. For a renderer whose dragged element goes away mid-drag, so what
   * it draws for the drag ends with it. Already aborted, no drag starts.
   */
  readonly signal?: AbortSignal;
}

/**
 * The pointer mechanics behind every drag-to-reorder gesture in the grid — a
 * column header dragged among the others or into the group-by bar, a
 * group-by chip dragged within it: capture, the drag threshold, and the ghost
 * trailing the pointer, holding the spot it was picked up by. Returns whether
 * a gesture began; only the main button of the primary pointer starts one,
 * and not once `handlers.signal` has aborted.
 *
 * The press is left to its default, so the pressed element still takes focus;
 * until the pointer has travelled `DRAG_THRESHOLD` pixels nothing is
 * reported, so a press that never moves stays a click. Escape, a cancelled
 * pointer or an aborted signal leaves the order as it was.
 *
 * Pointer events rather than HTML5 drag-and-drop: `dragenter`/`dragleave`
 * fire per descendant, so a dragged item's own inner markup would each report
 * the target leaving and re-entering as the pointer crossed them.
 */
export function startDragReorder<Target>(
  id: string,
  grabElement: HTMLElement,
  press: PointerPress,
  handlers: DragReorderHandlers<Target>,
): boolean {
  if (!mayStartGesture(press, handlers.signal)) {
    return false;
  }

  const { pointerId, clientX: startX } = press;
  const grabX = startX - grabElement.getBoundingClientRect().left;
  let dragging = false;
  let target: Target | null = null;

  startPointerGesture(
    grabElement,
    pointerId,
    {
      onMove(moveEvent) {
        const { clientX, clientY } = moveEvent;
        if (!dragging) {
          if (Math.abs(clientX - startX) < DRAG_THRESHOLD) {
            return;
          }
          dragging = true;
        }
        target = handlers.resolveTarget(clientX, clientY, id);
        handlers.onState({
          draggedId: id,
          dropTarget: target,
          ghostTransform: `translate(${String(clientX - grabX)}px, ${String(clientY)}px)`,
        });
      },
      onEnd() {
        const dropped = target;
        handlers.onState(NO_DRAG);
        if (dragging && dropped !== null) {
          handlers.onDrop(dropped, id);
        }
      },
      onCancel() {
        target = null;
        handlers.onState(NO_DRAG);
      },
    },
    handlers.signal,
  );
  return true;
}
