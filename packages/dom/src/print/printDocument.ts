/** What `printDocument` prints: a document's title, its body's markup and its stylesheet. */
export interface PrintDocumentOptions {
  /** The document's title, as text — what the browser puts in a page's header and names a saved PDF. */
  readonly title: string;
  /** The `<body>`'s markup, as `buildPrintDocument` writes it. */
  readonly bodyHtml: string;
  /** The document's whole stylesheet — `printStyles(page)`, and anything added after it. */
  readonly styles: string;
}

/**
 * What tells a print is over where `afterprint` never comes: the user
 * reaching for the page again, which a print dialog — modal while it is
 * open — allows only once it has closed.
 */
const RETURN_EVENTS = ["pointerdown", "keydown"] as const;

/** Whether a print is open, so a second request while it is can be refused. */
let printing = false;

/**
 * A frame no one sees or reaches. It has no size rather than being hidden
 * with `display: none` or `visibility`, which some browsers then refuse to
 * print.
 */
function createFrame(bodyHtml: string): HTMLIFrameElement {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"></head><body>${bodyHtml}</body></html>`;
  return frame;
}

/** Puts the frame in the page and waits for its document to load. */
function load(frame: HTMLIFrameElement): Promise<Window> {
  return new Promise((resolve, reject) => {
    frame.addEventListener(
      "load",
      () => {
        if (frame.contentWindow === null) {
          reject(new Error("The print frame has no window."));
        } else {
          resolve(frame.contentWindow);
        }
      },
      { once: true },
    );
    document.body.append(frame);
  });
}

/**
 * Gives the loaded document its title and stylesheet. Set through the DOM
 * rather than written into the markup, so neither needs escaping — a
 * `</style>` in the CSS, or a `<` in a title, stays what it is.
 */
function fill(view: Window, { title, styles }: PrintDocumentOptions): void {
  const { document: frameDocument } = view;
  frameDocument.title = title;
  const style = frameDocument.createElement("style");
  style.textContent = styles;
  frameDocument.head.append(style);
}

/**
 * Opens the print dialog for the frame and settles once it has closed: on
 * the frame's `afterprint`, which every current browser fires, or else the
 * next time the user presses a key or the pointer on the page. Not after a
 * set time: where `print()` returns with the dialog still open, a frame
 * taken away under it would print nothing.
 */
function print(view: Window): Promise<void> {
  // A key comes to the frame, which has focus; the pointer to the page, as
  // the frame takes no room.
  const listeners: [Window, string][] = [
    [view, "afterprint"],
    ...RETURN_EVENTS.flatMap((type): [Window, string][] => [
      [view, type],
      [window, type],
    ]),
  ];
  return new Promise((resolve) => {
    function done(): void {
      for (const [target, type] of listeners) {
        target.removeEventListener(type, done, { capture: true });
      }
      resolve();
    }
    for (const [target, type] of listeners) {
      target.addEventListener(type, done, { capture: true });
    }
    // Safari prints the page around a frame that does not have focus.
    view.focus();
    view.print();
  });
}

/**
 * Prints a document through a hidden frame: its own page, holding only
 * `bodyHtml` under `styles`, so what is printed is what was built — every
 * row, not the slice of them a virtualised grid has drawn — and nothing of
 * the page around it. The frame loads, waits for its fonts, opens the
 * print dialog, and is removed once the dialog closes, when the promise
 * resolves; focus goes back where it was. A frame rather than a new window,
 * which a popup blocker would stop.
 *
 * One print at a time: a call while a print is open resolves at once
 * without printing.
 */
export async function printDocument(
  options: PrintDocumentOptions,
): Promise<void> {
  if (printing) {
    return;
  }
  printing = true;
  const previous = document.activeElement;
  const frame = createFrame(options.bodyHtml);
  try {
    const view = await load(frame);
    fill(view, options);
    await view.document.fonts.ready;
    await print(view);
  } finally {
    frame.remove();
    printing = false;
    if (previous instanceof HTMLElement) {
      previous.focus({ preventScroll: true });
    }
  }
}
