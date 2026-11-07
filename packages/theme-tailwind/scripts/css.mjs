/**
 * Reads the package's stylesheets into blocks and declarations: enough to
 * see which custom properties each block declares and what reads them, not
 * a general CSS parser.
 *
 * Comments are dropped and whitespace in selectors and values is collapsed,
 * so a value Prettier wraps over several lines reads as it would on one.
 * Anything this stylesheet does not use, such as an `@import` statement or
 * a block inside a custom property's value, throws rather than being
 * misread.
 */

/**
 * @typedef {object} CssDeclaration
 * @property {string} property
 * @property {string} value
 */

/**
 * @typedef {object} CssBlock
 * @property {string} prelude The selector or at-rule before the `{`, or
 *   `""` for the stylesheet itself.
 * @property {CssDeclaration[]} declarations
 * @property {CssBlock[]} blocks The blocks nested inside it, in order.
 */

/**
 * @param {string} text
 * @returns {string}
 */
export function collapseWhitespace(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\( /g, "(")
    .replace(/ \)/g, ")")
    .trim();
}

/**
 * @param {string} prelude
 * @returns {CssBlock}
 */
function emptyBlock(prelude) {
  return { prelude, declarations: [], blocks: [] };
}

/**
 * @param {CssBlock} block
 * @param {string} text Everything since the last `;`, `{` or `}`.
 */
function addDeclaration(block, text) {
  const declaration = collapseWhitespace(text);
  if (declaration === "") {
    return;
  }
  const colon = declaration.indexOf(":");
  if (declaration.startsWith("@") || colon === -1) {
    throw new Error(`Not a declaration: ${declaration}`);
  }
  block.declarations.push({
    property: declaration.slice(0, colon).trim(),
    value: declaration.slice(colon + 1).trim(),
  });
}

/**
 * @param {string} css
 * @returns {CssBlock} The stylesheet, as a block with an empty prelude.
 */
export function parseCss(css) {
  const sheet = emptyBlock("");
  const open = [sheet];
  let text = "";
  let parens = 0;

  for (let i = 0; i < css.length; i++) {
    const char = css.charAt(i);
    const block = open.at(-1) ?? sheet;

    if (char === "/" && css.charAt(i + 1) === "*") {
      const end = css.indexOf("*/", i + 2);
      if (end === -1) {
        throw new Error("Unclosed comment");
      }
      text += " ";
      i = end + 1;
    } else if (char === '"' || char === "'") {
      let end = i + 1;
      while (end < css.length && css.charAt(end) !== char) {
        end += css.charAt(end) === "\\" ? 2 : 1;
      }
      text += css.slice(i, end + 1);
      i = end;
    } else if (char === "(") {
      parens++;
      text += char;
    } else if (char === ")") {
      parens--;
      text += char;
    } else if (parens > 0) {
      text += char;
    } else if (char === "{") {
      const child = emptyBlock(collapseWhitespace(text));
      block.blocks.push(child);
      open.push(child);
      text = "";
    } else if (char === "}") {
      addDeclaration(block, text);
      if (open.length === 1) {
        throw new Error("Unmatched }");
      }
      open.pop();
      text = "";
    } else if (char === ";") {
      addDeclaration(block, text);
      text = "";
    } else {
      text += char;
    }
  }

  if (open.length !== 1) {
    throw new Error("Unclosed block");
  }
  addDeclaration(sheet, text);
  return sheet;
}

/**
 * The custom properties a block declares itself, not those of the blocks
 * nested in it.
 *
 * @param {CssBlock} block
 * @returns {Map<string, string>} Each property's value, by name.
 */
export function customProperties(block) {
  /** @type {Map<string, string>} */
  const properties = new Map();
  for (const { property, value } of block.declarations) {
    if (!property.startsWith("--")) {
      continue;
    }
    if (properties.has(property)) {
      throw new Error(`${block.prelude} declares ${property} twice`);
    }
    properties.set(property, value);
  }
  return properties;
}

/**
 * The one block directly inside `parent` with this prelude.
 *
 * @param {CssBlock} parent
 * @param {string} prelude
 * @returns {CssBlock}
 */
export function childBlock(parent, prelude) {
  const matches = parent.blocks.filter((block) => block.prelude === prelude);
  const [match] = matches;
  if (match === undefined || matches.length > 1) {
    throw new Error(`Expected one "${prelude}" block, found ${matches.length}`);
  }
  return match;
}

/**
 * Every declaration in a block and the blocks nested in it, skipping any
 * block `skip` returns true for.
 *
 * @param {CssBlock} block
 * @param {(block: CssBlock) => boolean} [skip]
 * @returns {CssDeclaration[]}
 */
export function allDeclarations(block, skip = () => false) {
  return [
    ...block.declarations,
    ...block.blocks
      .filter((child) => !skip(child))
      .flatMap((child) => allDeclarations(child, skip)),
  ];
}
