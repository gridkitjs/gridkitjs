/** A print as its dialog opened: what the frame's document held at that moment. */
export interface RecordedPrint {
  readonly title: string;
  readonly styles: string;
  readonly bodyHtml: string;
  /** The frame's `aria-hidden`, and its size on the page. */
  readonly frame: {
    readonly ariaHidden: string | null;
    readonly width: number;
    readonly height: number;
  };
}

/** What the frame holds as its dialog opens. */
function readPrint(
  frame: HTMLIFrameElement,
  frameDocument: Document,
): RecordedPrint {
  return {
    title: frameDocument.title,
    styles: frameDocument.head.textContent,
    bodyHtml: frameDocument.body.innerHTML,
    frame: {
      ariaHidden: frame.getAttribute("aria-hidden"),
      width: frame.offsetWidth,
      height: frame.offsetHeight,
    },
  };
}

/**
 * Records every print `printDocument` opens, standing in for its dialog: no
 * headless browser shows one, and each fakes it its own way — Chromium's
 * `print()` fires `beforeprint` and `afterprint` and returns, WebKit's fires
 * neither, and Firefox's never returns. A frame's `print` reads what the
 * frame holds, then fires `afterprint` as a dialog closing at once would.
 * It is set from a capturing `load` listener on the page's document, which
 * runs before the frame's own: `printDocument` may call `print()` without
 * leaving the task its listener runs in. Returns the way to stop recording.
 */
export function recordPrints(
  onPrint: (print: RecordedPrint) => void,
): () => void {
  function standIn(event: Event): void {
    const frame = event.target;
    if (!(frame instanceof HTMLIFrameElement) || frame.contentWindow === null) {
      return;
    }
    const view = frame.contentWindow;
    view.print = () => {
      onPrint(readPrint(frame, view.document));
      setTimeout(() => {
        view.dispatchEvent(new Event("afterprint"));
      });
    };
  }
  document.addEventListener("load", standIn, { capture: true });
  return () => {
    document.removeEventListener("load", standIn, { capture: true });
  };
}
