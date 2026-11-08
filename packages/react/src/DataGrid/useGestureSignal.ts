import { useEffect, useRef } from "react";

interface Gesture {
  /** The element the gesture listens on, which `@gridkitjs/dom` captured. */
  readonly element: HTMLElement;
  readonly controller: AbortController;
}

/**
 * Starts a gesture on `element` with `start`, handing it the `AbortSignal`
 * that ends it, and returns whatever `start` said about whether it began.
 */
export type StartGesture = (
  element: HTMLElement,
  start: (signal: AbortSignal) => boolean,
) => boolean;

/**
 * One `AbortSignal` per pointer gesture, for `@gridkitjs/dom`'s
 * `startDragReorder`/`startColumnResizeGesture`, whose `handlers.signal`
 * cancels the gesture as Escape does.
 *
 * A gesture that begins aborts the one before it; a press that begins none,
 * such as a second finger landing mid-drag, leaves it alone. The signal
 * aborts when the component unmounts, or after any render that has taken the
 * gesture's element out of the document: a header whose column is hidden
 * mid-drag goes with every listener the gesture had on it, so nothing else
 * would ever end what the grid draws for the gesture. Aborting a gesture that
 * has already ended does nothing.
 */
export default function useGestureSignal(): StartGesture {
  const gesture = useRef<Gesture | null>(null);

  useEffect(() => {
    const current = gesture.current;
    if (current !== null && !current.element.isConnected) {
      gesture.current = null;
      current.controller.abort();
    }
  });

  useEffect(
    () => () => {
      gesture.current?.controller.abort();
    },
    [],
  );

  return function startGesture(element, start) {
    const controller = new AbortController();
    if (!start(controller.signal)) {
      return false;
    }
    gesture.current?.controller.abort();
    gesture.current = { element, controller };
    return true;
  };
}
