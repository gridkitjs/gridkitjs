import type { FormsMessages } from "./messages/formsMessages";
import {
  parsed,
  type FormatContext,
  type ParseContext,
  type ParseResult,
} from "./parse";

/**
 * The value a checkbox takes when it is flipped. Without `threeState`,
 * `false` and `null` go to `true` and `true` to `false`, so an app's
 * `null` (a "select all" over a partial selection) checks on the first
 * flip. With it, `false` → `true` → `null` → `false`.
 */
export function nextCheckedValue(
  value: boolean | null,
  threeState: boolean,
): boolean | null {
  if (value === true) {
    return threeState ? null : false;
  }
  return value === null && threeState ? false : true;
}

/** The words a toggle reads as: one for `true`, one for `false`. */
export interface BooleanWords {
  readonly on: (messages: FormsMessages) => string;
  readonly off: (messages: FormsMessages) => string;
}

/** A checkbox reads "Yes" or "No" (`displayChecked`, `displayUnchecked`). */
export const CHECKBOX_WORDS: BooleanWords = {
  on: (messages) => messages.displayChecked,
  off: (messages) => messages.displayUnchecked,
};

/** A switch reads "On" or "Off" (`displayOn`, `displayOff`). */
export const SWITCH_WORDS: BooleanWords = {
  on: (messages) => messages.displayOn,
  off: (messages) => messages.displayOff,
};

/**
 * A toggle's value as text: its words for `true` and `false`, `""` for
 * `null`. The text a toggle's events carry and display mode shows.
 */
export function booleanFormatter(
  words: BooleanWords,
): (value: boolean | null, context: FormatContext<boolean>) => string {
  return (value, { messages }) => {
    if (value === null) {
      return "";
    }
    return value ? words.on(messages) : words.off(messages);
  };
}

/** Reads a toggle's words back as its value; anything else is `null`. */
export function booleanParser(
  words: BooleanWords,
): (text: string, context: ParseContext<boolean>) => ParseResult<boolean> {
  return (text, { messages }) => {
    if (text === words.on(messages)) {
      return parsed(true);
    }
    return parsed(text === words.off(messages) ? false : null);
  };
}
