/** What `writeClipboard` puts on the clipboard: the same copy as plain text and as HTML. */
export interface ClipboardContent {
  readonly text: string;
  readonly html: string;
}

/**
 * The one legacy call, typed as GridKit uses it. `document.execCommand` is
 * deprecated and has no replacement for a browser without the async
 * Clipboard API — which is the only browser this is reached in.
 */
interface LegacyCopyDocument {
  execCommand(commandId: "copy"): boolean;
}

/** Writes both types through the async Clipboard API, where the browser has `ClipboardItem`. */
async function writeItem(
  clipboard: Clipboard,
  { text, html }: ClipboardContent,
): Promise<void> {
  await clipboard.write([
    new ClipboardItem({
      "text/plain": new Blob([text], { type: "text/plain" }),
      "text/html": new Blob([html], { type: "text/html" }),
    }),
  ]);
}

/**
 * Copies through the `copy` event, the way pages did before the async API:
 * a one-shot listener sets both types on the event's `clipboardData`, and
 * `execCommand("copy")` fires it. The command copies the focused selection,
 * so an off-screen field holding the text is focused and selected for it —
 * which also leaves the text on the clipboard should a browser give the
 * listener no `clipboardData` — and focus goes back where it was after.
 */
function copyThroughEvent({ text, html }: ClipboardContent): boolean {
  const previous = document.activeElement;
  const field = document.createElement("textarea");
  field.value = text;
  field.readOnly = true;
  field.setAttribute("aria-hidden", "true");
  field.style.position = "fixed";
  field.style.top = "0";
  field.style.left = "-9999px";
  document.body.append(field);

  function onCopy(event: ClipboardEvent): void {
    if (event.clipboardData === null) {
      return;
    }
    event.clipboardData.setData("text/plain", text);
    event.clipboardData.setData("text/html", html);
    event.preventDefault();
  }

  document.addEventListener("copy", onCopy, { capture: true, once: true });
  try {
    field.focus({ preventScroll: true });
    field.select();
    const legacy: LegacyCopyDocument = document;
    return legacy.execCommand("copy");
  } finally {
    document.removeEventListener("copy", onCopy, { capture: true });
    field.remove();
    if (previous instanceof HTMLElement) {
      previous.focus({ preventScroll: true });
    }
  }
}

/** Input types with no text of their own to copy, whose copy key the page may take. */
const TEXTLESS_INPUTS = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLInputElement && !TEXTLESS_INPUTS.has(target.type)) ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

/**
 * Whether a copy key pressed at `target` belongs to the browser: pressed in a
 * text field, or with text highlighted anywhere on the page. Either way the
 * user means the text in front of them, and a grid copying its own cell
 * instead would take that from them.
 */
export function isNativeCopy(target: EventTarget | null): boolean {
  const selection = document.getSelection();
  return isTextField(target) || (selection !== null && !selection.isCollapsed);
}

/**
 * Puts `content` on the clipboard as both `text/plain` and `text/html`, so a
 * paste into a spreadsheet splits into cells and one into a word processor
 * keeps its table. Call it from a user's gesture — a key press, a menu
 * choice — as browsers allow the clipboard only then.
 *
 * Tries each way a browser offers, best first: the async Clipboard API with
 * a `ClipboardItem` holding both types; then its `writeText`, plain text
 * alone, where `ClipboardItem` is missing or refused; then the legacy `copy`
 * event, for a page outside a secure context, where the async API is not
 * there at all. Rejects only when every one fails.
 */
export async function writeClipboard(content: ClipboardContent): Promise<void> {
  const attempts: (() => Promise<void>)[] = [];
  // Absent outside a secure context, whatever the DOM types say.
  const clipboard = navigator.clipboard as Clipboard | undefined;
  if (clipboard !== undefined) {
    if (typeof ClipboardItem === "function") {
      attempts.push(() => writeItem(clipboard, content));
    }
    attempts.push(() => clipboard.writeText(content.text));
  }
  let failure: unknown = null;
  for (const attempt of attempts) {
    try {
      await attempt();
      return;
    } catch (error) {
      failure = error;
    }
  }
  if (!copyThroughEvent(content)) {
    throw new Error("The browser refused to write to the clipboard.", {
      cause: failure,
    });
  }
}
