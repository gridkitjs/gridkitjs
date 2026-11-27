import { digitValue, isDigit } from "../number/digits";
import type { CompiledMask, MaskSlot } from "./grammar";

// The mask's model: a compiled pattern's slots, each input slot filled,
// empty or skipped (an optional slot typed past). An edit works on items,
// the characters typed and the steps past literals that skipped slots,
// laid into the slots in order with no holes. The engine keeps nothing
// between edits: it reads the text on screen back into cells, edits the
// items, lays them out again and writes the text.

/** What one input slot holds. Entries for literals stay empty. */
export type MaskCell =
  | { readonly kind: "filled"; readonly character: string }
  | { readonly kind: "skipped" }
  | { readonly kind: "empty" };

/**
 * What an edit moves around: a character for an input slot, or a step past
 * the literal `literal`, leaving the optional slots before it skipped
 * (typing "." after "19" in an IPv4 mask).
 */
export type MaskItem =
  | { readonly kind: "character"; readonly character: string }
  | { readonly kind: "jump"; readonly literal: string };

/** An item, and the index in the text where it was read. */
export interface PlacedItem {
  readonly item: MaskItem;
  readonly at: number;
}

/**
 * What laying out does with an item no slot takes: `truncate` drops it
 * with every item after it, `lenient` (a paste) drops it alone.
 */
export type LayoutMode = "truncate" | "lenient";

/** Items laid into a pattern. */
export interface MaskLayout {
  readonly mask: CompiledMask;
  readonly cells: readonly MaskCell[];
  /** For each item, the slot it filled or the literal it stepped past; `null` when dropped. */
  readonly landed: readonly (number | null)[];
  /** How many characters found a slot. */
  readonly kept: number;
}

const EMPTY: MaskCell = { kind: "empty" };
const SKIPPED: MaskCell = { kind: "skipped" };

/**
 * `character` as a mask keeps it: a decimal digit of any script as its
 * ASCII digit, a full-width form (from an input method) as its ASCII.
 */
export function maskCharacter(character: string): string {
  if (isDigit(character)) {
    return String(digitValue(character));
  }
  const code = character.codePointAt(0) ?? 0;
  if (code >= 0xff01 && code <= 0xff5e) {
    return String.fromCodePoint(code - 0xfee0);
  }
  return code === 0x3000 ? " " : character;
}

/** `character` as `slot` keeps it, after its transform and case; `null` when the slot refuses it. */
function accepted(
  slot: Extract<MaskSlot, { kind: "input" }>,
  character: string,
  locale: Intl.LocalesArgument,
): string | null {
  if (!slot.accepts(character)) {
    return null;
  }
  const kept = slot.transform === null ? character : slot.transform(character);
  switch (slot.letterCase) {
    case "upper":
      return kept.toLocaleUpperCase(locale);
    case "lower":
      return kept.toLocaleLowerCase(locale);
    case "keep":
      return kept;
  }
}

/**
 * Places `item` in the first slot from `from` that takes it, into `cells`.
 * A character fills the next input slot that accepts it, crossing
 * literals; one equal to a literal it reaches steps past it. Either may
 * skip optional slots that refuse it on the way, which are then marked
 * skipped; a required slot that refuses it stops it. A slot that accepts
 * the character wins over a literal after it.
 */
function place(
  slots: readonly MaskSlot[],
  cells: MaskCell[],
  from: number,
  item: MaskItem,
  locale: Intl.LocalesArgument,
): number | null {
  const skipped: number[] = [];
  const settle = (slot: number, cell: MaskCell | null) => {
    for (const index of skipped) {
      cells[index] = SKIPPED;
    }
    if (cell !== null) {
      cells[slot] = cell;
    }
    return slot;
  };
  const character = item.kind === "jump" ? item.literal : item.character;
  for (let index = from; index < slots.length; index += 1) {
    const slot = slots[index];
    if (slot === undefined) {
      break;
    }
    if (slot.kind === "literal") {
      if (slot.character === character) {
        return settle(index, null);
      }
      continue;
    }
    if (item.kind === "character") {
      const kept = accepted(slot, character, locale);
      if (kept !== null) {
        return settle(index, { kind: "filled", character: kept });
      }
    }
    if (!slot.optional) {
      return null;
    }
    skipped.push(index);
  }
  return null;
}

/** `items` laid into `mask` from its start. */
export function layOut(
  mask: CompiledMask,
  items: readonly MaskItem[],
  mode: LayoutMode,
  locale: Intl.LocalesArgument,
): MaskLayout {
  const cells: MaskCell[] = mask.slots.map(() => EMPTY);
  const landed: (number | null)[] = [];
  let next = 0;
  let kept = 0;
  let stopped = false;
  for (const item of items) {
    const slot = stopped ? null : place(mask.slots, cells, next, item, locale);
    if (slot === null) {
      stopped = mode === "truncate";
      landed.push(null);
      continue;
    }
    landed.push(slot);
    next = slot + 1;
    if (item.kind === "character") {
      kept += 1;
    }
  }
  return { mask, cells, landed, kept };
}

/** Whether every item found a place. */
export function fits(layout: MaskLayout): boolean {
  return layout.landed.every((slot) => slot !== null);
}

/**
 * The items a layout holds, each at the text index `at` gives its slot: a
 * character per filled slot, and a jump at each literal that follows
 * skipped slots.
 */
export function itemsOf(
  mask: CompiledMask,
  cells: readonly MaskCell[],
  at: readonly number[],
): PlacedItem[] {
  const items: PlacedItem[] = [];
  let skipping = false;
  mask.slots.forEach((slot, index) => {
    const cell = cells[index] ?? EMPTY;
    if (slot.kind === "literal") {
      if (skipping) {
        items.push({
          item: { kind: "jump", literal: slot.character },
          at: at[index] ?? 0,
        });
        skipping = false;
      }
    } else if (cell.kind === "filled") {
      items.push({
        item: { kind: "character", character: cell.character },
        at: at[index] ?? 0,
      });
      skipping = false;
    } else if (cell.kind === "skipped") {
      skipping = true;
    }
  });
  return items;
}

/** Cells read from text, with the text index of each slot (where it would be, when not printed). */
export interface MaskReading {
  readonly cells: readonly MaskCell[];
  readonly at: readonly number[];
}

/**
 * Reads `text` as `mask` writes it, focused or not: a prompt character is
 * an empty slot, an optional slot facing a character it refuses is
 * skipped, and a literal that is not there was not printed. `null` when the
 * text is not this pattern's: a required slot refuses its character, a
 * required slot is empty before a filled one, or text is left over.
 */
export function readExact(
  mask: CompiledMask,
  text: string,
  prompt: string,
  locale: Intl.LocalesArgument,
): MaskReading | null {
  const characters = Array.from(text);
  const cells: MaskCell[] = [];
  const at: number[] = [];
  let next = 0;
  let index = 0;
  for (const slot of mask.slots) {
    at.push(index);
    const typed = characters[next];
    if (slot.kind === "literal") {
      cells.push(EMPTY);
      if (typed === slot.character) {
        next += 1;
        index += typed.length;
      }
      continue;
    }
    if (typed === undefined || (prompt !== "" && typed === prompt)) {
      cells.push(EMPTY);
    } else {
      const kept = accepted(slot, maskCharacter(typed), locale);
      if (kept !== null) {
        cells.push({ kind: "filled", character: kept });
      } else if (slot.optional) {
        cells.push(SKIPPED);
        continue;
      } else {
        return null;
      }
    }
    if (typed !== undefined) {
      next += 1;
      index += typed.length;
    }
  }
  if (next < characters.length) {
    return null;
  }
  const last = cells.findLastIndex((cell) => cell.kind === "filled");
  for (let slot = 0; slot < last; slot += 1) {
    const definition = mask.slots[slot];
    if (definition?.kind === "input" && cells[slot]?.kind === "empty") {
      if (!definition.optional) {
        return null;
      }
      cells[slot] = SKIPPED;
    }
  }
  return { cells, at };
}

/** The sections with a filled slot: only they print. */
function filledSections(
  mask: CompiledMask,
  cells: readonly MaskCell[],
): ReadonlySet<number> {
  const sections = new Set<number>();
  mask.slots.forEach((slot, index) => {
    if (slot.section !== null && cells[index]?.kind === "filled") {
      sections.add(slot.section);
    }
  });
  return sections;
}

/** Text written from cells, with where each slot starts in it (`offsets[slots.length]` is the end). */
export interface MaskWriting {
  readonly text: string;
  readonly offsets: readonly number[];
}

/**
 * The text cells show. While focused: literals, filled characters, the
 * prompt in each empty slot, nothing for skipped slots, and nothing of an
 * optional section with no slot filled; with no prompt character, the text
 * ends at the first empty slot. Otherwise (display, and the formatted
 * value): literals and filled characters up to the last filled slot.
 */
export function writeCells(
  mask: CompiledMask,
  cells: readonly MaskCell[],
  focused: boolean,
  prompt: string,
): MaskWriting {
  const sections = filledSections(mask, cells);
  const last = cells.findLastIndex((cell) => cell.kind === "filled");
  const offsets: number[] = [];
  let text = "";
  let ended = false;
  mask.slots.forEach((slot, index) => {
    offsets.push(text.length);
    const hidden =
      ended ||
      (slot.section !== null && !sections.has(slot.section)) ||
      (!focused && index > last);
    if (hidden) {
      return;
    }
    if (slot.kind === "literal") {
      text += slot.character;
      return;
    }
    const cell = cells[index] ?? EMPTY;
    if (cell.kind === "filled") {
      text += cell.character;
    } else if (cell.kind === "empty") {
      if (prompt === "") {
        ended = true;
      } else {
        text += prompt;
      }
    }
  });
  offsets.push(text.length);
  return { text, offsets };
}

/**
 * Where the caret goes after the slot `slot` (`null` for the start of the
 * text): after what it prints, then past the literals and skipped slots
 * that follow, so typing goes on at the next input slot.
 */
export function caretAfter(
  mask: CompiledMask,
  cells: readonly MaskCell[],
  { offsets }: MaskWriting,
  slot: number | null,
): number {
  let caret = slot === null ? 0 : (offsets[slot + 1] ?? 0);
  for (
    let index = slot === null ? 0 : slot + 1;
    index < mask.slots.length;
    index += 1
  ) {
    const definition = mask.slots[index];
    if (definition?.kind === "input" && cells[index]?.kind !== "skipped") {
      break;
    }
    caret = offsets[index + 1] ?? caret;
  }
  return caret;
}

/** The filled characters alone. */
export function rawOf(cells: readonly MaskCell[]): string {
  return cells
    .map((cell) => (cell.kind === "filled" ? cell.character : ""))
    .join("");
}

/** Every required slot is filled: those outside sections, and those of each section begun. */
export function isComplete(
  mask: CompiledMask,
  cells: readonly MaskCell[],
): boolean {
  const sections = filledSections(mask, cells);
  return mask.slots.every(
    (slot, index) =>
      slot.kind === "literal" ||
      slot.optional ||
      (slot.section !== null && !sections.has(slot.section)) ||
      cells[index]?.kind === "filled",
  );
}
