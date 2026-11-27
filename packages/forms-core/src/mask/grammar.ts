/** A token of an app's own: one character it accepts, and how it is written. */
export interface MaskTokenDefinition {
  /** Tested against one character, after its digits and full-width forms become ASCII. */
  readonly accept: RegExp;
  /** Whether the slot may stay empty. False by default. */
  readonly optional?: boolean | undefined;
  /** Applied to the character before it is kept; the case tokens still apply after. */
  readonly transform?: ((character: string) => string) | undefined;
}

/** One-character token names, beside the built-in tokens, which they may replace. */
export type MaskTokens = Readonly<Record<string, RegExp | MaskTokenDefinition>>;

/** How letters typed into a slot are written, as `>`, `<` and `|` set it. */
export type MaskLetterCase = "upper" | "lower" | "keep";

/**
 * One place in a compiled pattern: a slot that takes a character, or a
 * literal printed as it is. `section` numbers the optional section (`[ ]`)
 * it sits in, `null` outside one.
 */
export type MaskSlot =
  | {
      readonly kind: "input";
      /** The token that made it: `"0"`, `"L"`, an app's own. */
      readonly token: string;
      readonly accepts: (character: string) => boolean;
      readonly optional: boolean;
      readonly transform: ((character: string) => string) | null;
      readonly letterCase: MaskLetterCase;
      readonly section: number | null;
    }
  | {
      readonly kind: "literal";
      readonly character: string;
      readonly section: number | null;
    };

/** A pattern compiled into its slots. */
export interface CompiledMask {
  readonly pattern: string;
  readonly slots: readonly MaskSlot[];
}

/**
 * A compiled pattern, or why it could not be compiled. `position` is the
 * index in the pattern where the problem starts, `null` for a problem in
 * the custom tokens.
 */
export type MaskCompileResult =
  | { readonly kind: "compiled"; readonly mask: CompiledMask }
  | {
      readonly kind: "error";
      readonly message: string;
      readonly position: number | null;
    };

interface Token {
  readonly accepts: (character: string) => boolean;
  readonly optional: boolean;
  readonly transform: ((character: string) => string) | null;
}

const DIGIT = /^[0-9]$/;
const LETTER = /^\p{L}$/u;
const LETTER_OR_DIGIT = /^[\p{L}0-9]$/u;

function digit(character: string): boolean {
  return DIGIT.test(character);
}

function letter(character: string): boolean {
  return LETTER.test(character);
}

function letterOrDigit(character: string): boolean {
  return LETTER_OR_DIGIT.test(character);
}

const BUILT_IN_TOKENS: Readonly<Record<string, Token>> = {
  "0": { accepts: digit, optional: false, transform: null },
  "9": { accepts: digit, optional: true, transform: null },
  "#": {
    accepts: (character) =>
      digit(character) || character === "+" || character === "-",
    optional: true,
    transform: null,
  },
  L: { accepts: letter, optional: false, transform: null },
  "?": { accepts: letter, optional: true, transform: null },
  "&": {
    accepts: (character) => !/^\s$/u.test(character),
    optional: false,
    transform: null,
  },
  C: { accepts: () => true, optional: true, transform: null },
  A: { accepts: letterOrDigit, optional: false, transform: null },
  a: { accepts: letterOrDigit, optional: true, transform: null },
};

/** Characters the grammar itself uses, which no token may be named. */
const GRAMMAR = new Set(["\\", "[", "]", ">", "<", "|"]);

const CASES: Readonly<Record<string, MaskLetterCase>> = {
  ">": "upper",
  "<": "lower",
  "|": "keep",
};

/** `pattern` tested against a whole character: `g` and `y` make `test` remember where it stopped, so they are dropped. */
function characterTest(pattern: RegExp): (character: string) => boolean {
  const whole = new RegExp(
    `^(?:${pattern.source})$`,
    pattern.flags.replace(/[gy]/g, ""),
  );
  return (character) => whole.test(character);
}

function customToken(definition: RegExp | MaskTokenDefinition): Token {
  if (definition instanceof RegExp) {
    return {
      accepts: characterTest(definition),
      optional: false,
      transform: null,
    };
  }
  return {
    accepts: characterTest(definition.accept),
    optional: definition.optional ?? false,
    transform: definition.transform ?? null,
  };
}

function compileError(
  message: string,
  position: number | null,
): MaskCompileResult {
  return { kind: "error", message, position };
}

/** The built-in tokens with `tokens` laid over them, or why `tokens` cannot be used. */
function tokenTable(
  tokens: MaskTokens | undefined,
): Readonly<Record<string, Token>> | string {
  if (tokens === undefined) {
    return BUILT_IN_TOKENS;
  }
  const table: Record<string, Token> = { ...BUILT_IN_TOKENS };
  for (const [name, definition] of Object.entries(tokens)) {
    if (Array.from(name).length !== 1) {
      return `A token's name is one character, not "${name}"`;
    }
    if (GRAMMAR.has(name)) {
      return `"${name}" is part of the mask grammar and cannot name a token`;
    }
    table[name] = customToken(definition);
  }
  return table;
}

/**
 * Compiles `pattern` on the .NET-style grammar: `0` a digit, `9` an
 * optional digit, `#` an optional digit, `+` or `-`, `L` a letter, `?` an
 * optional letter, `&` any character but a space, `C` any optional
 * character, `A` a letter or digit, `a` an optional one; `>`, `<` and `|`
 * upper-case, lower-case or keep the letters after them; `\` makes the next
 * character a literal; `[ ]` holds an optional section, which appears once
 * one of its slots is filled; anything else is a literal. `tokens` adds
 * one-character tokens of an app's own, or replaces built-in ones.
 *
 * A malformed pattern (an unclosed, nested or stray bracket, an empty
 * section, a trailing `\`, no slot at all) is an error with its position.
 */
export function compileMask(
  pattern: string,
  tokens?: MaskTokens,
): MaskCompileResult {
  const table = tokenTable(tokens);
  if (typeof table === "string") {
    return compileError(table, null);
  }
  const slots: MaskSlot[] = [];
  let letterCase: MaskLetterCase = "keep";
  let section: { readonly id: number; readonly start: number } | null = null;
  let sections = 0;
  let sectionHasInput = false;
  let escaped = false;
  let index = 0;
  for (const character of pattern) {
    const position = index;
    index += character.length;
    if (escaped) {
      slots.push({ kind: "literal", character, section: section?.id ?? null });
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === "[") {
      if (section !== null) {
        return compileError("Optional sections cannot nest", position);
      }
      section = { id: sections, start: position };
      sections += 1;
      sectionHasInput = false;
      continue;
    }
    if (character === "]") {
      if (section === null) {
        return compileError(
          'A "]" closes no section; write "\\]" for the character',
          position,
        );
      }
      if (!sectionHasInput) {
        return compileError(
          "An optional section needs at least one slot",
          section.start,
        );
      }
      section = null;
      continue;
    }
    const nextCase = CASES[character];
    if (nextCase !== undefined) {
      letterCase = nextCase;
      continue;
    }
    const token = table[character];
    if (token === undefined) {
      slots.push({ kind: "literal", character, section: section?.id ?? null });
      continue;
    }
    slots.push({
      kind: "input",
      token: character,
      accepts: token.accepts,
      optional: token.optional,
      transform: token.transform,
      letterCase,
      section: section?.id ?? null,
    });
    sectionHasInput = true;
  }
  if (escaped) {
    return compileError(
      'A "\\" at the end escapes nothing',
      pattern.length - 1,
    );
  }
  if (section !== null) {
    return compileError("This optional section is not closed", section.start);
  }
  if (!slots.some((slot) => slot.kind === "input")) {
    return compileError("A mask needs at least one slot", 0);
  }
  return { kind: "compiled", mask: { pattern, slots } };
}

/** Patterns compiled so far, per token set: a mask compiles on every edit. */
const compiledByTokens = new WeakMap<MaskTokens, Map<string, CompiledMask>>();
const compiledBuiltIn = new Map<string, CompiledMask>();

/**
 * `pattern` compiled with `tokens`, from the cache when it has been before.
 * Throws on a malformed pattern: an input checks its patterns with
 * `compileMask` before it relies on them.
 */
export function compiledPattern(
  pattern: string,
  tokens: MaskTokens | undefined,
): CompiledMask {
  let cache = compiledBuiltIn;
  if (tokens !== undefined) {
    cache = compiledByTokens.get(tokens) ?? new Map<string, CompiledMask>();
    compiledByTokens.set(tokens, cache);
  }
  const cached = cache.get(pattern);
  if (cached !== undefined) {
    return cached;
  }
  const result = compileMask(pattern, tokens);
  if (result.kind === "error") {
    throw new SyntaxError(
      `Mask "${pattern}": ${result.message}${
        result.position === null ? "" : ` (at ${String(result.position)})`
      }`,
    );
  }
  cache.set(pattern, result.mask);
  return result.mask;
}
