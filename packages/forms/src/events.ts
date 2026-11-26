import type * as core from "@gridkitjs/forms-core";
import type { NoDetails } from "@gridkitjs/forms-core";

// The forms-core events with the browser's `Event` as their native event,
// so a React app never names the native event type.

/** What every forms event carries. */
export type FieldEventBase<V> = core.FieldEventBase<V, Event>;

/** The text changed: every keystroke, paste, drop or deletion. */
export type FieldInputEvent<
  V,
  D extends object = NoDetails,
> = core.FieldInputEvent<V, D, Event>;

/** The value changed. */
export type FieldChangeEvent<
  V,
  D extends object = NoDetails,
> = core.FieldChangeEvent<V, D, Event>;

/** The field's messages were worked out again. */
export type FieldValidateEvent<
  V,
  D extends object = NoDetails,
> = core.FieldValidateEvent<V, D, Event>;

/** The user is done: the value is committed. */
export type FieldCommitEvent<
  V,
  D extends object = NoDetails,
> = core.FieldCommitEvent<V, D, Event>;

/** A text edit is about to happen, and may be prevented or rewritten. */
export type FieldBeforeInputEvent<
  V,
  D extends object = NoDetails,
> = core.FieldBeforeInputEvent<V, D, Event>;

/** The value is about to change, and may be prevented or replaced. */
export type FieldBeforeChangeEvent<
  V,
  D extends object = NoDetails,
> = core.FieldBeforeChangeEvent<V, D, Event>;

/** The value is about to be committed, and may be refused, after a wait. */
export type FieldBeforeCommitEvent<
  V,
  D extends object = NoDetails,
> = core.FieldBeforeCommitEvent<V, D, Event>;

/** The field gained or lost focus. */
export type FieldFocusEvent<V> = core.FieldFocusEvent<V, Event>;

/** Every handler a field calls, each optional. */
export type FieldHandlers<V, D extends object = NoDetails> = core.FieldHandlers<
  V,
  D,
  Event
>;
