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

/**
 * Records every print `printDocument` opens, as the frame's `beforeprint`
 * fires: headless Chromium has no dialog, so its `print()` returns at once
 * and the frame is gone straight after — this is the moment to read it. The
 * frame is caught as it is added to `document.body`, before it loads, so
 * its `load` listener runs after `printDocument`'s own. Returns the way to
 * stop recording.
 */
export function recordPrints(
  onPrint: (print: RecordedPrint) => void,
): () => void {
  function watch(frame: HTMLIFrameElement): void {
    frame.addEventListener(
      "load",
      () => {
        frame.contentWindow?.addEventListener("beforeprint", () => {
          const frameDocument = frame.contentDocument;
          if (frameDocument !== null) {
            onPrint({
              title: frameDocument.title,
              styles: frameDocument.head.textContent,
              bodyHtml: frameDocument.body.innerHTML,
              frame: {
                ariaHidden: frame.getAttribute("aria-hidden"),
                width: frame.offsetWidth,
                height: frame.offsetHeight,
              },
            });
          }
        });
      },
      { once: true },
    );
  }
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof HTMLIFrameElement) {
          watch(node);
        }
      }
    }
  });
  observer.observe(document.body, { childList: true });
  return () => {
    observer.disconnect();
  };
}
