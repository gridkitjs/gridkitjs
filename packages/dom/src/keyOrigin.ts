/**
 * Where a key pressed inside a grid came from, as `keyOrigin` sorts it:
 *
 * - `"text-entry"`: a control that uses every key itself, the navigation
 *   keys included, to move a caret or change a value.
 * - `"control"`: another interactive control, which uses Space and Enter to
 *   activate but has no use for the navigation keys.
 * - `"grid"`: the grid's own markup, a cell or the grid itself.
 */
export type KeyOrigin = "text-entry" | "control" | "grid";

/** Input types that hold no text, whose keys are Space and Enter alone. */
const TEXTLESS_INPUTS = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "image",
  "radio",
  "reset",
  "submit",
]);

/** Widget roles whose arrow, Home and End keys move a caret or change a value. */
const TEXT_ENTRY_ROLES = new Set([
  "combobox",
  "searchbox",
  "slider",
  "spinbutton",
  "textbox",
]);

/** Widget roles activated with Space or Enter. */
const CONTROL_ROLES = new Set([
  "button",
  "checkbox",
  "link",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "radio",
  "switch",
  "tab",
]);

/** Elements the HTML specification counts as interactive content. */
const CONTROL_SELECTOR =
  "button, a[href], area[href], summary, iframe, embed, audio[controls], video[controls]";

function isTextEntry(target: Element): boolean {
  if (target instanceof HTMLInputElement) {
    return !TEXTLESS_INPUTS.has(target.type);
  }
  return (
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable) ||
    TEXT_ENTRY_ROLES.has(target.getAttribute("role") ?? "")
  );
}

function isControl(target: Element): boolean {
  return (
    target instanceof HTMLInputElement ||
    target.matches(CONTROL_SELECTOR) ||
    CONTROL_ROLES.has(target.getAttribute("role") ?? "")
  );
}

/**
 * Sorts a key event's `target` by who the key belongs to, so a grid can
 * leave the keys of a control a template rendered in a cell to that control.
 *
 * Text entry is a text-like `<input>` (every type but the textless ones
 * below, `range` and `number` included, whose arrows change their value), a
 * `<textarea>`, a `<select>`, anything content-editable, and an element with
 * the role `textbox`, `searchbox`, `combobox`, `spinbutton` or `slider`.
 *
 * A control is any other `<input>` (`button`, `checkbox`, `color`, `file`,
 * `image`, `radio`, `reset`, `submit`), the rest of the HTML specification's
 * interactive content (`<button>`, a link, `<summary>`, an `<iframe>` or
 * `<embed>`, media with controls), and an element with the role `button`,
 * `checkbox`, `radio`, `switch`, `link`, `tab` or a menu item.
 *
 * Anything else is the grid: its cells, the grid's own element, and markup a
 * template draws that is no control, however focusable.
 */
export function keyOrigin(target: EventTarget | null): KeyOrigin {
  if (!(target instanceof Element)) {
    return "grid";
  }
  if (isTextEntry(target)) {
    return "text-entry";
  }
  return isControl(target) ? "control" : "grid";
}
