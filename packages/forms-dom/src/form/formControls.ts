/** The form controls that take part in a form's validation and navigation. */
type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Input types Enter moves on from: single-line text, a checkbox, a switch. */
const ENTER_MOVES_FROM = new Set([
  "text",
  "search",
  "email",
  "tel",
  "url",
  "password",
  "number",
  "checkbox",
]);

/** Input types that hold no value a user types or picks. */
const NOT_EDITABLE = new Set(["hidden", "button", "submit", "reset", "image"]);

function isFormControl(element: Element): element is FormControl {
  return (
    element.localName === "input" ||
    element.localName === "select" ||
    element.localName === "textarea"
  );
}

/** The controls of `form`, its `form`-attribute ones included, in document order. */
function controlsOf(form: HTMLFormElement): FormControl[] {
  return [...form.elements].filter(isFormControl);
}

/**
 * The first control of `form`, in document order, that holds an invalid
 * value: a field showing an error, which forms sets as the control's
 * custom validity, or a native constraint of the app's own control such as
 * `required`. `null` when every control is valid. A disabled or read-only
 * control is never invalid, as for the browser's own validation.
 */
export function findFirstInvalidControl(
  form: HTMLFormElement,
): HTMLElement | null {
  return (
    controlsOf(form).find(
      (control) => control.willValidate && !control.validity.valid,
    ) ?? null
  );
}

/**
 * The control a link to `target` should focus: `target` itself when it can
 * take focus, else the first control inside it, as for a group of inputs.
 */
export function focusTargetIn(target: HTMLElement): HTMLElement | null {
  if (isFormControl(target) || target.matches("button, [tabindex]")) {
    return target;
  }
  return target.querySelector<HTMLElement>(
    "input:not([type=hidden]), select, textarea, button, [tabindex]",
  );
}

/** Whether a control can be moved to: enabled, editable and drawn. */
function canMoveTo(control: FormControl): boolean {
  if (control instanceof HTMLInputElement && NOT_EDITABLE.has(control.type)) {
    return false;
  }
  const readOnly =
    ("readOnly" in control && control.readOnly) ||
    control.getAttribute("aria-readonly") === "true";
  return !control.disabled && !readOnly && control.getClientRects().length > 0;
}

/**
 * Makes Enter in a single-line text field, a checkbox or a switch of
 * `form` move focus to the next control a user can change, in document
 * order, rather than submit the form. From the last one, Enter submits as
 * it would without this. Enter with a modifier, while an input method is
 * composing, or already handled (a field refusing its commit prevents it)
 * is left alone, as are a textarea, a select, a button and a link.
 * `detach` removes the listener.
 */
export function attachEnterNavigation(form: HTMLFormElement): {
  readonly detach: () => void;
} {
  function onKeyDown(event: KeyboardEvent): void {
    const { target } = event;
    if (
      event.key !== "Enter" ||
      event.defaultPrevented ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      !(target instanceof HTMLInputElement) ||
      !ENTER_MOVES_FROM.has(target.type)
    ) {
      return;
    }
    event.preventDefault();
    const controls = controlsOf(form);
    const next = controls
      .slice(controls.indexOf(target) + 1)
      .find((control) => canMoveTo(control));
    if (next === undefined) {
      form.requestSubmit();
    } else {
      next.focus();
    }
  }

  form.addEventListener("keydown", onKeyDown);
  return {
    detach: () => {
      form.removeEventListener("keydown", onKeyDown);
    },
  };
}

/**
 * Orders two elements as they come in the document, for sorting: negative
 * when `a` comes first.
 */
export function compareDocumentOrder(a: Node, b: Node): number {
  if (a === b) {
    return 0;
  }
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
    ? -1
    : 1;
}
