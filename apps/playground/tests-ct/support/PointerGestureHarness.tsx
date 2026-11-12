import { useRef, useState, type PointerEvent } from "react";
import { beginColumnResize } from "@gridkitjs/core/renderer";
import { startColumnResizeGesture, startDragReorder } from "@gridkitjs/dom";

interface PointerGestureHarnessProps {
  /** Whether each gesture's signal is aborted before the press starts it. */
  readonly abortedBeforePress?: boolean;
}

/**
 * A "Grab" element that starts `startDragReorder` and a "Handle" that starts
 * `startColumnResizeGesture`, each with the signal of a fresh
 * `AbortController` that the "Abort" button aborts. What each starter
 * returned and how each gesture ended is logged where a spec can read it,
 * with the moves it reported counted apart so the log stays readable.
 */
export default function PointerGestureHarness({
  abortedBeforePress = false,
}: PointerGestureHarnessProps) {
  const gesture = useRef<AbortController | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);

  function record(entry: string): void {
    setLog((current) => [...current, entry]);
  }

  function countMove(): void {
    setMoves((count) => count + 1);
  }

  function nextSignal(): AbortSignal {
    const controller = new AbortController();
    if (abortedBeforePress) {
      controller.abort();
    }
    gesture.current = controller;
    return controller.signal;
  }

  function startDrag(event: PointerEvent<HTMLElement>): void {
    const started = startDragReorder("item", event.currentTarget, event, {
      resolveTarget: () => "target",
      onState: (state) => {
        if (state.kind === "idle") {
          record("drag ended");
        } else {
          countMove();
        }
      },
      onDrop: () => {
        record("dropped");
      },
      signal: nextSignal(),
    });
    record(`drag started ${String(started)}`);
  }

  function startResize(event: PointerEvent<HTMLElement>): void {
    const session = beginColumnResize({ field: "width" }, 100, event.clientX);
    const started = startColumnResizeGesture(
      event.currentTarget,
      event,
      session,
      {
        onMove: countMove,
        onEnd: (width) => {
          record(`resize ended ${String(width)}`);
        },
        onCancel: () => {
          record("resize cancelled");
        },
        signal: nextSignal(),
      },
    );
    record(`resize started ${String(started)}`);
  }

  return (
    <div>
      <div
        id="grab"
        style={{ width: 120, height: 40 }}
        onPointerDown={startDrag}
      >
        Grab
      </div>
      <div
        id="handle"
        style={{ width: 120, height: 40 }}
        onPointerDown={startResize}
      >
        Handle
      </div>
      <button
        type="button"
        onClick={() => {
          gesture.current?.abort();
        }}
      >
        Abort
      </button>
      <output data-testid="log">{log.join("; ")}</output>
      <output data-testid="moves">{moves}</output>
    </div>
  );
}
