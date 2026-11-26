/** A stretch of a control's text, counted in UTF-16 code units as `selectionStart` is. */
export interface TextRange {
  readonly start: number;
  readonly end: number;
}

let graphemes: Intl.Segmenter | undefined;

/** Characters as a reader sees them: an emoji or a letter with its accents is one. */
function graphemeSegmenter(): Intl.Segmenter {
  graphemes ??= new Intl.Segmenter(undefined, { granularity: "grapheme" });
  return graphemes;
}

function graphemeStartBefore(text: string, index: number): number {
  let start = index;
  for (const segment of graphemeSegmenter().segment(text.slice(0, index))) {
    start = segment.index;
  }
  return start;
}

function graphemeEndAfter(text: string, index: number): number {
  const segments = graphemeSegmenter().segment(text.slice(index));
  const first = segments[Symbol.iterator]().next();
  return first.done ? index : index + first.value.segment.length;
}

/** Back over spaces, then over the word before them, as Ctrl+Backspace deletes. */
function wordStartBefore(text: string, index: number): number {
  const word = /\S*\s*$/u.exec(text.slice(0, index))?.[0] ?? "";
  return index - word.length;
}

function wordEndAfter(text: string, index: number): number {
  const word = /^\s*\S*/u.exec(text.slice(index))?.[0] ?? "";
  return index + word.length;
}

function lineStartBefore(text: string, index: number): number {
  return text.lastIndexOf("\n", index - 1) + 1;
}

function lineEndAfter(text: string, index: number): number {
  const end = text.indexOf("\n", index);
  return end === -1 ? text.length : end;
}

/** What a deletion with nothing selected removes around `caret`. */
function deletedAround(
  text: string,
  caret: number,
  inputType: string,
): TextRange {
  switch (inputType) {
    case "deleteContentBackward":
      return { start: graphemeStartBefore(text, caret), end: caret };
    case "deleteContentForward":
      return { start: caret, end: graphemeEndAfter(text, caret) };
    case "deleteWordBackward":
      return { start: wordStartBefore(text, caret), end: caret };
    case "deleteWordForward":
      return { start: caret, end: wordEndAfter(text, caret) };
    case "deleteSoftLineBackward":
    case "deleteHardLineBackward":
      return { start: lineStartBefore(text, caret), end: caret };
    case "deleteSoftLineForward":
    case "deleteHardLineForward":
      return { start: caret, end: lineEndAfter(text, caret) };
    case "deleteEntireSoftLine":
      return {
        start: lineStartBefore(text, caret),
        end: lineEndAfter(text, caret),
      };
    default:
      return { start: caret, end: caret };
  }
}

function splice(text: string, { start, end }: TextRange, insert: string) {
  return text.slice(0, start) + insert + text.slice(end);
}

/**
 * The text a browser edit will leave, worked out before the browser makes
 * it: `text` with `range` (the selection, or the text an input method is
 * composing) edited as the `beforeinput` event's `inputType` says,
 * inserting `data`. A deletion with nothing selected removes a character,
 * a word or a line around the caret, as its type says; a word ends at
 * white space.
 *
 * `null` for an edit only the browser can work out: undo and redo, a
 * spelling correction (it replaces a word the event does not locate),
 * swapping two characters, and any type it does not know.
 */
export function applyEdit(
  text: string,
  range: TextRange,
  inputType: string,
  data: string | null,
): string | null {
  switch (inputType) {
    case "insertLineBreak":
    case "insertParagraph":
      return splice(text, range, "\n");
    case "insertReplacementText":
    case "insertTranspose":
      return null;
  }
  if (inputType.startsWith("insert")) {
    return splice(text, range, data ?? "");
  }
  if (inputType.startsWith("delete")) {
    return splice(
      text,
      range.start === range.end
        ? deletedAround(text, range.start, inputType)
        : range,
      "",
    );
  }
  return null;
}
