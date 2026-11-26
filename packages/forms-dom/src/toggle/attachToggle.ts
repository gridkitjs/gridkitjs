import {
  nextCheckedValue,
  type FieldController,
  type FieldMessage,
} from "@gridkitjs/forms-core";

/** What a renderer can change about a toggle while it is attached. */
export interface ToggleOptions {
  /** A flip can set `null` (indeterminate): `false` → `true` → `null` → `false`. */
  readonly threeState?: boolean | undefined;
  /**
   * Refuses every flip and stays focusable. A native checkbox ignores the
   * `readonly` attribute, so the renderer says so here.
   */
  readonly readOnly?: boolean | undefined;
}

export interface AttachedToggle {
  /** Replaces the options, from the next event on. */
  readonly setOptions: (options: ToggleOptions) => void;
  /**
   * Removes every listener and clears the control's custom validity. The
   * controller is left as it is, so another control can be attached to it.
   */
  readonly detach: () => void;
}

function hasFocus(control: HTMLElement): boolean {
  const root = control.getRootNode();
  return (
    (root instanceof Document || root instanceof ShadowRoot) &&
    root.activeElement === control
  );
}

function errorText(messages: readonly FieldMessage[]): string {
  return messages.find((message) => message.severity === "error")?.text ?? "";
}

/**
 * Connects a native `<input type="checkbox">`, a checkbox or a
 * `role="switch"`, to a forms-core field controller holding a boolean, so
 * the controller decides what each flip means and the control shows what
 * the controller holds.
 *
 * - The browser's `click`, from a pointer, a label or <kbd>Space</kbd>,
 *   flips the field to `nextCheckedValue` of what it holds, through
 *   `controller.pick` with `source` and `trigger` `"toggle"`: the change
 *   events, then the commit. A flip by Space carries the Space `keydown`
 *   as its `nativeEvent`, a press the `click`.
 * - With `options.readOnly` the click is prevented, so nothing changes.
 * - `focus` and `blur` start and end the edit; leaving commits nothing
 *   more, so the controller should have `commitOnLeave: false`.
 * - A `reset` of the control's form that nobody prevented resets the
 *   field, with `source: "api"`.
 *
 * After every change of the field it writes `checked` (the value is
 * `true`) and `indeterminate` (it is `null`), over whatever the browser
 * did with the click, and holds the field's first error as the control's
 * custom validity, so a plain `<form>` refuses to submit it.
 */
export function attachToggle<D extends object>(
  control: HTMLInputElement,
  controller: FieldController<boolean, D, Event>,
  initialOptions: ToggleOptions = {},
): AttachedToggle {
  let options = initialOptions;
  let attached = true;
  let customValidity = "";
  // The Space keydown whose click is coming: the flip reports the key.
  let spaceKey: KeyboardEvent | null = null;
  const listeners = new AbortController();
  const { signal } = listeners;

  function render(): void {
    if (!attached) {
      return;
    }
    const { value } = controller.getState();
    control.checked = value === true;
    control.indeterminate = value === null;
    const validity = errorText(controller.getMessages());
    if (validity !== customValidity) {
      customValidity = validity;
      control.setCustomValidity(validity);
    }
  }

  function onClick(event: MouseEvent): void {
    const nativeEvent = spaceKey ?? event;
    spaceKey = null;
    if (options.readOnly === true) {
      event.preventDefault();
      return;
    }
    const next = nextCheckedValue(
      controller.getState().value,
      options.threeState === true,
    );
    controller.pick(next, "toggle", "toggle", nativeEvent);
    render();
  }

  function onKeyDown(event: KeyboardEvent): void {
    spaceKey = event.key === " " && !event.defaultPrevented ? event : null;
  }

  // On the document, so the app's own listeners have had their say first.
  function onReset(event: Event): void {
    if (event.defaultPrevented || event.target !== control.form) {
      return;
    }
    controller.reset();
    // The browser's reset, which follows this event, puts back this state.
    control.defaultChecked = controller.getState().value === true;
  }

  control.addEventListener("click", onClick, { signal });
  control.addEventListener("keydown", onKeyDown, { signal });
  control.addEventListener(
    "pointerdown",
    () => {
      spaceKey = null;
    },
    { signal },
  );
  control.addEventListener(
    "focus",
    (event) => {
      controller.focus(event);
    },
    { signal },
  );
  control.addEventListener(
    "blur",
    (event) => {
      spaceKey = null;
      controller.blur(event);
    },
    { signal },
  );
  control.ownerDocument.addEventListener("reset", onReset, { signal });
  const unsubscribe = controller.subscribe(render);

  // A control focused before it was attached (`autofocus`) starts its edit now.
  if (hasFocus(control)) {
    controller.focus(null);
  }
  render();

  return {
    setOptions: (next) => {
      options = next;
    },
    detach: () => {
      if (!attached) {
        return;
      }
      attached = false;
      listeners.abort();
      unsubscribe();
      control.setCustomValidity("");
    },
  };
}
