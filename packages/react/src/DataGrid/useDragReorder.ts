import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { DropSide } from "@gridkitjs/core";
import { startPointerGesture } from "./pointerGesture";

/**
 * How far the pointer travels before a press becomes a drag. Below it the
 * gesture is still a click, which is what leaves the pressed element free to
 * take one — shared by every drag-to-reorder gesture in the grid.
 */
const DRAG_THRESHOLD = 4;

/**
 * The closest ancestor of (or the element itself at) `(x, y)` matching
 * `selector`. `closest` is what makes the whole matched element the target:
 * a hit on a descendant (a header's label, a chip's remove button) resolves
 * to it.
 */
export function elementAt(
  x: number,
  y: number,
  selector: string,
): Element | null {
  return document.elementFromPoint(x, y)?.closest(selector) ?? null;
}

/** Which half of `element` `x` falls in. */
export function sideOf(element: Element, x: number): DropSide {
  const rect = element.getBoundingClientRect();
  return x < rect.left + rect.width / 2 ? "before" : "after";
}

interface UseDragReorderOptions<Target> {
  /**
   * Where a drop at `(clientX, clientY)` would land, or `null` for nowhere
   * valid — including a gap `id` already occupies, the same "promises only
   * moves that happen" contract every reorder here keeps. Called on every
   * pointer move once the drag has opened; in full control of its own
   * hit-testing, against one destination or several.
   */
  resolveTarget: (
    clientX: number,
    clientY: number,
    id: string,
  ) => Target | null;
  onDrop: (target: Target, id: string) => void;
}

export interface DragReorderApi<Target> {
  /** The item being dragged, for as long as the drag lasts. */
  draggedId: string | null;
  /** Where it would land if released now. */
  dropTarget: Target | null;
  /** Where the element trailing the pointer sits, as a CSS `transform`. */
  ghostTransform: string | null;
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
 * The pointer mechanics behind every drag-to-reorder gesture in the grid —
 * capture, the drag threshold, the trailing ghost, and the click/drag
 * disambiguation `justDragged` reports — extracted so a column header drag
 * and a group-by chip drag (`useColumnDrag`, `useGroupByDrag`) share one
 * implementation and can only ever drift apart in their own hit-testing
 * (`resolveTarget`), not in how a pointer becomes a drag.
 *
 * Pointer events rather than HTML5 drag-and-drop, for the same reason
 * `useColumnDrag` originally chose them: `dragenter`/`dragleave` fire per
 * descendant, so a dragged item's own inner markup would each report the
 * target leaving and re-entering as the pointer crossed them.
 */
export default function useDragReorder<Target>({
  resolveTarget,
  onDrop,
}: UseDragReorderOptions<Target>): DragReorderApi<Target> {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<Target | null>(null);
  const [ghostTransform, setGhostTransform] = useState<string | null>(null);
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
    const { pointerId, clientX: startX } = event;
    const grabX = startX - grabElement.getBoundingClientRect().left;
    let dragging = false;
    let target: Target | null = null;

    /** Keeps the grab offset, so the pointer holds the spot it picked up. */
    function placeGhost(x: number, y: number): void {
      setGhostTransform(`translate(${String(x - grabX)}px, ${String(y)}px)`);
    }

    function reset(): void {
      setGhostTransform(null);
      setDraggedId(null);
      setDropTarget(null);
    }

    startPointerGesture(grabElement, pointerId, {
      onMove(moveEvent) {
        const { clientX, clientY } = moveEvent;

        if (!dragging) {
          if (Math.abs(clientX - startX) < DRAG_THRESHOLD) {
            return;
          }
          dragging = true;
          // Latched for the `click` that follows the release, which is the
          // only thing that can tell a drag apart from a press in the same
          // spot.
          dragged.current = true;
          setDraggedId(id);
        }

        placeGhost(clientX, clientY);

        target = resolveTarget(clientX, clientY, id);
        setDropTarget(target);
      },
      onEnd() {
        const dropped = target;
        reset();
        if (dragging && dropped !== null) {
          onDrop(dropped, id);
        }
      },
      // Escape and a cancelled pointer both leave the order as it was.
      onCancel() {
        target = null;
        reset();
      },
    });
  }

  // A new object each render, as `useColumnDrag`/`useColumnResize` return:
  // the handlers close over `resolveTarget`/`onDrop`, and a stable identity
  // would buy nothing.
  return {
    draggedId,
    dropTarget,
    ghostTransform,
    startDrag,
    justDragged,
  };
}
