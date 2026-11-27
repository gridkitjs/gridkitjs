import { compiledPattern, type CompiledMask, type MaskTokens } from "./grammar";
import {
  caretAfter,
  fits,
  isComplete,
  itemsOf,
  layOut,
  maskCharacter,
  rawOf,
  readExact,
  writeCells,
  type LayoutMode,
  type MaskCell,
  type MaskItem,
  type MaskLayout,
  type MaskWriting,
  type PlacedItem,
} from "./layout";

/** A pattern, several tried in order as the text grows, or a function choosing one from the raw text. */
export type MaskSource = string | readonly string[] | ((raw: string) => string);

/** A mask: its pattern, its own tokens and how it prints. */
export interface MaskOptions {
  readonly mask: MaskSource;
  /** One-character names, beside the built-in tokens, which they may replace. */
  readonly tokens?: MaskTokens | undefined;
  /** One character, shown in empty slots while focused; `"_"` by default, `""` for none. */
  readonly promptCharacter?: string | undefined;
  /** Whose rules `>` and `<` change case by; the runtime's by default. */
  readonly locale?: Intl.LocalesArgument;
}

/** Text in a masked control, with the selection. */
export interface MaskedText {
  readonly text: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
}

/** A browser edit, as `beforeinput` reports it. */
export interface MaskEdit {
  readonly inputType: string;
  /** The text inserted; `null` for a deletion. */
  readonly data: string | null;
}

/** What a mask makes of some text. */
export interface MaskDetails {
  /** Only the characters typed into input slots. */
  readonly raw: string;
  /** With literals, without prompt characters, cut after the last character typed. */
  readonly formatted: string;
  /** Every required slot (of the pattern in use, and of each optional section begun) is filled. */
  readonly complete: boolean;
  /** The pattern in use. */
  readonly pattern: string;
}

/** What an edit leaves. */
export interface MaskResult extends MaskDetails {
  /** The text to show, prompt characters included while focused. */
  readonly text: string;
  readonly caret: number;
  /** False when the edit changed nothing the mask accepts (a letter in a digit slot): the input refuses it. */
  readonly accepted: boolean;
}

/** Whether a mask's value is only the characters typed, or the text with its literals. */
export type MaskValueFormat = "raw" | "formatted";

/** A pattern's text read into cells, and the items an edit works on. */
interface TextReading {
  readonly layout: Pick<MaskLayout, "mask" | "cells">;
  readonly items: readonly PlacedItem[];
  /** Whether characters other than prompt characters had to be dropped to read the text. */
  readonly dropped: boolean;
}

/**
 * Edits that cannot be refused or come whole from elsewhere: a paste, a
 * drop, autofill or a correction, and the text an input method composed.
 * Their characters that fit nowhere are dropped and the rest go in.
 */
const LENIENT_INPUT = new Set([
  "insertFromPaste",
  "insertFromPasteAsQuotation",
  "insertFromDrop",
  "insertFromYank",
  "insertReplacementText",
  "insertCompositionText",
  "insertFromComposition",
]);

function promptOf(options: MaskOptions): string {
  return options.promptCharacter ?? "_";
}

function compiled(options: MaskOptions, pattern: string): CompiledMask {
  return compiledPattern(pattern, options.tokens);
}

function characterItems(text: string): MaskItem[] {
  return Array.from(text, (character) => ({
    kind: "character",
    character: maskCharacter(character),
  }));
}

/**
 * The patterns `items` may be laid into: the one pattern, every one of
 * several in order, or the one a function picks for the raw text the items
 * make when laid leniently into `current` (the pattern before the edit).
 */
function candidates(
  options: MaskOptions,
  items: readonly MaskItem[],
  current: CompiledMask | null,
): readonly [CompiledMask, ...CompiledMask[]] {
  const { mask } = options;
  if (typeof mask === "string") {
    return [compiled(options, mask)];
  }
  if (typeof mask !== "function") {
    const [first, ...rest] = mask;
    if (first === undefined) {
      throw new TypeError("A mask needs at least one pattern");
    }
    return [
      compiled(options, first),
      ...rest.map((pattern) => compiled(options, pattern)),
    ];
  }
  const start = current ?? compiled(options, mask(""));
  const provisional = layOut(start, items, "lenient", options.locale);
  return [compiled(options, mask(rawOf(provisional.cells)))];
}

/** `items` laid into the first pattern that holds every one of them, in order; `null` when none does. */
function fittingLayout(
  options: MaskOptions,
  items: readonly MaskItem[],
  current: CompiledMask | null,
): MaskLayout | null {
  for (const mask of candidates(options, items, current)) {
    const layout = layOut(mask, items, "truncate", options.locale);
    if (fits(layout)) {
      return layout;
    }
  }
  return null;
}

/** `items` laid into the pattern that keeps most of their characters, the first of equals. */
function bestLayout(
  options: MaskOptions,
  items: readonly MaskItem[],
  mode: LayoutMode,
  current: CompiledMask | null,
): MaskLayout {
  const [first, ...rest] = candidates(options, items, current);
  let best = layOut(first, items, mode, options.locale);
  for (const mask of rest) {
    const layout = layOut(mask, items, mode, options.locale);
    if (layout.kept > best.kept) {
      best = layout;
    }
  }
  return best;
}

/** `text` laid in as a paste would be, prompt characters left out. */
function readLeniently(
  options: MaskOptions,
  text: string,
  current: CompiledMask | null,
): TextReading {
  const prompt = promptOf(options);
  const typed: { readonly character: string; readonly at: number }[] = [];
  let index = 0;
  for (const character of text) {
    if (character !== prompt) {
      typed.push({ character: maskCharacter(character), at: index });
    }
    index += character.length;
  }
  const layout = bestLayout(
    options,
    typed.map(({ character }) => ({ kind: "character", character })),
    "lenient",
    current,
  );
  const at = layout.mask.slots.map(() => text.length);
  layout.landed.forEach((slot, item) => {
    if (slot !== null) {
      at[slot] = typed[item]?.at ?? text.length;
    }
  });
  return {
    layout,
    items: itemsOf(layout.mask, layout.cells, at),
    dropped: layout.landed.some((slot) => slot === null),
  };
}

function readIn(
  options: MaskOptions,
  mask: CompiledMask,
  text: string,
): TextReading | null {
  const reading = readExact(mask, text, promptOf(options), options.locale);
  return (
    reading && {
      layout: { mask, cells: reading.cells },
      items: itemsOf(mask, reading.cells, reading.at),
      dropped: false,
    }
  );
}

/**
 * Reads the text on screen back into the mask: as the first pattern that
 * wrote it, or, for text no pattern wrote (after an undo), laid in as a
 * paste. A function mask is read with the pattern it picks for the text's
 * raw characters.
 */
function readText(options: MaskOptions, text: string): TextReading {
  const { mask } = options;
  if (typeof mask !== "function") {
    for (const pattern of typeof mask === "string" ? [mask] : mask) {
      const reading = readIn(options, compiled(options, pattern), text);
      if (reading !== null) {
        return reading;
      }
    }
    return readLeniently(options, text, null);
  }
  const start = compiled(options, mask(""));
  const first =
    readIn(options, start, text) ?? readLeniently(options, text, start);
  const picked = compiled(options, mask(rawOf(first.layout.cells)));
  if (picked === start) {
    return first;
  }
  return readIn(options, picked, text) ?? readLeniently(options, text, picked);
}

function resultOf(
  options: MaskOptions,
  { mask, cells }: Pick<MaskLayout, "mask" | "cells">,
  focused: boolean,
  caretSlot: (writing: MaskWriting) => number,
  accepted: boolean,
): MaskResult {
  const writing = writeCells(mask, cells, focused, promptOf(options));
  return {
    ...detailsOf(options, mask, cells),
    text: writing.text,
    caret: caretSlot(writing),
    accepted,
  };
}

/** The slot item `index` landed in, or the last one before it that landed. */
function slotBefore(
  landed: readonly (number | null)[],
  index: number,
): number | null {
  for (let item = Math.min(index, landed.length) - 1; item >= 0; item -= 1) {
    const slot = landed[item];
    if (slot !== undefined && slot !== null) {
      return slot;
    }
  }
  return null;
}

/** Whether items `a` and `b` (in that order) are characters next to each other in the text: one group. */
function sameGroup(a: PlacedItem | undefined, b: PlacedItem | undefined) {
  return (
    a !== undefined &&
    b !== undefined &&
    a.item.kind === "character" &&
    b.item.kind === "character" &&
    b.at - a.at === a.item.character.length
  );
}

/**
 * The items a deletion with nothing selected removes, as `[from, to)`:
 * the item before the caret (or after it, forward), stepping over
 * literals; a word removes the group of characters around it, between
 * literals; a line, every item on that side. `null` when there is none.
 */
function deletedItems(
  items: readonly PlacedItem[],
  caret: number,
  inputType: string,
): readonly [from: number, to: number] | null {
  const before = items.filter(({ at }) => at < caret).length;
  const forward = inputType.endsWith("Forward");
  if (forward ? before >= items.length : before === 0) {
    return null;
  }
  if (inputType.includes("Line")) {
    return forward ? [before, items.length] : [0, before];
  }
  let from = forward ? before : before - 1;
  let to = from + 1;
  if (inputType.includes("Word")) {
    while (forward && sameGroup(items[to - 1], items[to])) {
      to += 1;
    }
    while (!forward && sameGroup(items[from - 1], items[from])) {
      from -= 1;
    }
  }
  return [from, to];
}

/**
 * What `edit` does to `current` under the mask. A selection removes the
 * characters in it; Backspace removes the character before the caret and
 * Delete the one after it, stepping over literals; the characters after
 * move back, and one that no longer fits is dropped with the rest. An
 * insert fills the slots from the caret, each character the next slot that
 * accepts it, and a character equal to the next literal steps past it
 * (skipping optional slots before it). Typing is strict: a character no
 * slot takes, or one that would push another out, refuses the whole edit.
 * A paste, a drop, autofill or composed text is lenient: what fits nowhere
 * is dropped. The pattern is chosen again for what the edit leaves.
 *
 * The caret goes after the last character inserted and past the literals
 * after it; after a deletion, to where the first removed character was.
 * Undo, redo and other edits the mask cannot place leave `accepted` false.
 */
export function applyMaskEdit(
  options: MaskOptions,
  current: MaskedText,
  edit: MaskEdit,
  focused: boolean,
): MaskResult {
  const reading = readText(options, current.text);
  const start = Math.min(current.selectionStart, current.selectionEnd);
  const end = Math.max(current.selectionStart, current.selectionEnd);
  const refused = () =>
    resultOf(
      options,
      reading.layout,
      focused,
      () => Math.min(start, current.text.length),
      false,
    );
  const inserting = edit.inputType.startsWith("insert");
  if (!inserting && !edit.inputType.startsWith("delete")) {
    return refused();
  }
  let items = reading.items;
  if (start < end) {
    items = items.filter(({ at }) => at < start || at >= end);
  } else if (!inserting) {
    const range = deletedItems(items, start, edit.inputType);
    if (range === null) {
      return refused();
    }
    items = [...items.slice(0, range[0]), ...items.slice(range[1])];
  }
  const position = items.filter(({ at }) => at < start).length;
  const inserted = inserting ? characterItems(edit.data ?? "") : [];
  const next = [
    ...items.slice(0, position).map(({ item }) => item),
    ...inserted,
    ...items.slice(position).map(({ item }) => item),
  ];
  const shownMask = reading.layout.mask;
  const layout =
    inserting && !LENIENT_INPUT.has(edit.inputType)
      ? fittingLayout(options, next, shownMask)
      : bestLayout(
          options,
          next,
          inserting ? "lenient" : "truncate",
          shownMask,
        );
  if (layout === null) {
    return refused();
  }
  const insertedLanded = layout.landed.slice(
    position,
    position + inserted.length,
  );
  if (inserted.length > 0 && insertedLanded.every((slot) => slot === null)) {
    return refused();
  }
  const result = resultOf(
    options,
    layout,
    focused,
    (writing) =>
      caretAfter(
        layout.mask,
        layout.cells,
        writing,
        slotBefore(layout.landed, position + inserted.length),
      ),
    true,
  );
  return result.text === current.text ? refused() : result;
}

/**
 * `raw` laid into the mask, as a value from the app or a commit shows it,
 * with the caret at the first empty slot. Laid in leniently, so a
 * formatted value (with its literals) reads too.
 */
export function formatMasked(
  options: MaskOptions,
  raw: string,
  focused: boolean,
): MaskResult {
  const items = characterItems(raw);
  const layout = bestLayout(options, items, "lenient", null);
  return resultOf(
    options,
    layout,
    focused,
    (writing) =>
      caretAfter(
        layout.mask,
        layout.cells,
        writing,
        slotBefore(layout.landed, items.length),
      ),
    true,
  );
}

/** Whether `raw` can still become complete by typing more: some pattern takes every character of it, in order. */
export function isValidMaskStart(options: MaskOptions, raw: string): boolean {
  return fittingLayout(options, characterItems(raw), null) !== null;
}

/** What the mask makes of `text`, focused or display text alike. */
export function maskDetails(options: MaskOptions, text: string): MaskDetails {
  const { layout } = readText(options, text);
  return detailsOf(options, layout.mask, layout.cells);
}

function detailsOf(
  options: MaskOptions,
  mask: CompiledMask,
  cells: readonly MaskCell[],
): MaskDetails {
  return {
    raw: rawOf(cells),
    formatted: writeCells(mask, cells, false, promptOf(options)).text,
    complete: isComplete(mask, cells),
    pattern: mask.pattern,
  };
}

/** `text` read by the mask, and whether reading it had to drop characters. */
export function readMasked(
  options: MaskOptions,
  text: string,
): MaskDetails & { readonly dropped: boolean } {
  const { layout, dropped } = readText(options, text);
  return { ...detailsOf(options, layout.mask, layout.cells), dropped };
}
