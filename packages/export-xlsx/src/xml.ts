/**
 * Everything outside XML 1.0's `Char` production: the C0 controls other
 * than tab, line feed and carriage return, and U+FFFE/U+FFFF. Excel refuses
 * a part holding one as corrupt — even escaped as `&#1;` — so they are
 * dropped rather than escaped. A lone surrogate, which no encoding can
 * write, is first replaced by U+FFFD through `toWellFormed`.
 */
const ILLEGAL_CHARACTERS =
  /[^\t\n\r\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu;

const ENTITIES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

/**
 * `text` made safe for an XML part, as element content or inside a
 * double-quoted attribute: the markup characters escaped, the characters
 * XML cannot hold at all removed.
 */
export function escapeXml(text: string): string {
  return text
    .toWellFormed()
    .replace(ILLEGAL_CHARACTERS, "")
    .replace(/[&<>"]/g, (character) => ENTITIES[character] ?? character);
}

/** What every part begins with. */
export const XML_DECLARATION =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
