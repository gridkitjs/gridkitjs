import { describe, expect, test } from "vitest";

import { compileMask, type CompiledMask, type MaskSlot } from "./grammar";

function compiled(pattern: string, tokens?: Parameters<typeof compileMask>[1]) {
  const result = compileMask(pattern, tokens);
  if (result.kind === "error") {
    throw new Error(result.message);
  }
  return result.mask;
}

/** Each slot as a short string: "0", "9?", "L>", literal "'-'", "§1" for a section. */
function describeSlots({ slots }: CompiledMask): string[] {
  return slots.map((slot: MaskSlot) => {
    const section = slot.section === null ? "" : `§${String(slot.section)}`;
    if (slot.kind === "literal") {
      return `'${slot.character}'${section}`;
    }
    const cased =
      slot.letterCase === "upper"
        ? ">"
        : slot.letterCase === "lower"
          ? "<"
          : "";
    return `${slot.token}${slot.optional ? "?" : ""}${cased}${section}`;
  });
}

/** Which of `characters` the single slot of `pattern` accepts. */
function accepted(pattern: string, characters: readonly string[]) {
  const slot = compiled(pattern).slots[0];
  if (slot?.kind !== "input") {
    throw new Error("not an input slot");
  }
  return characters.filter((character) => slot.accepts(character));
}

describe("compileMask: tokens", () => {
  const sample = ["5", "a", "Z", "é", "Ж", "+", "-", " ", ".", "_"];

  test.each([
    ["0", ["5"], false],
    ["9", ["5"], true],
    ["#", ["5", "+", "-"], true],
    ["L", ["a", "Z", "é", "Ж"], false],
    ["?", ["a", "Z", "é", "Ж"], true],
    ["&", ["5", "a", "Z", "é", "Ж", "+", "-", ".", "_"], false],
    ["C", sample, true],
    ["A", ["5", "a", "Z", "é", "Ж"], false],
    ["a", ["5", "a", "Z", "é", "Ж"], true],
  ])("%s accepts %j, optional %s", (token, accepts, optional) => {
    expect(accepted(token, sample)).toEqual(accepts);
    expect(describeSlots(compiled(token))).toEqual([
      `${token}${optional ? "?" : ""}`,
    ]);
  });

  test("anything else is a literal, the culture's separators included", () => {
    expect(describeSlots(compiled("0.,:/$-0"))).toEqual([
      "0",
      "'.'",
      "','",
      "':'",
      "'/'",
      "'$'",
      "'-'",
      "0",
    ]);
  });

  test("a backslash makes the next character a literal", () => {
    expect(describeSlots(compiled("\\0\\\\\\[0"))).toEqual([
      "'0'",
      "'\\'",
      "'['",
      "0",
    ]);
  });

  test("> < and | set the case of the slots after them", () => {
    expect(describeSlots(compiled("L>L<L|L"))).toEqual(["L", "L>", "L<", "L"]);
  });

  test("brackets hold an optional section", () => {
    expect(describeSlots(compiled("00000[-0000]"))).toEqual([
      "0",
      "0",
      "0",
      "0",
      "0",
      "'-'§0",
      "0§0",
      "0§0",
      "0§0",
      "0§0",
    ]);
    expect(describeSlots(compiled("0[9].0[9]"))).toEqual([
      "0",
      "9?§0",
      "'.'",
      "0",
      "9?§1",
    ]);
  });
});

describe("compileMask: custom tokens", () => {
  test("a regex for one character adds a required token", () => {
    const mask = compiled("HH", { H: /[0-9a-f]/i });
    expect(describeSlots(mask)).toEqual(["H", "H"]);
    const slot = mask.slots[0];
    expect(
      slot?.kind === "input" &&
        ["a", "F", "9", "g"].filter((c) => slot.accepts(c)),
    ).toEqual(["a", "F", "9"]);
  });

  test("a regex is tested against the whole character, whatever its flags", () => {
    const mask = compiled("X", { X: /a|b/g });
    const slot = mask.slots[0];
    expect(
      slot?.kind === "input" && ["a", "a", "ab", "b"].map(slot.accepts),
    ).toEqual([true, true, false, true]);
  });

  test("a definition may be optional and transform the character", () => {
    const mask = compiled("X", {
      X: { accept: /[xy]/, optional: true, transform: (c) => `${c}!` },
    });
    const slot = mask.slots[0];
    expect(slot?.kind === "input" && slot.optional).toBe(true);
    expect(slot?.kind === "input" && slot.transform?.("x")).toBe("x!");
  });

  test("a custom token replaces a built-in one", () => {
    const mask = compiled("L", { L: /[A-Za-z]/ });
    const slot = mask.slots[0];
    expect(
      slot?.kind === "input" && ["a", "é", "Z"].filter((c) => slot.accepts(c)),
    ).toEqual(["a", "Z"]);
  });
});

describe("compileMask: malformed patterns", () => {
  test.each([
    ["000[-0", "This optional section is not closed", 3],
    ["0[0[0]]", "Optional sections cannot nest", 3],
    ["0[]", "An optional section needs at least one slot", 1],
    ["0[-]", "An optional section needs at least one slot", 1],
    ["00]", 'A "]" closes no section; write "\\]" for the character', 2],
    ["00\\", 'A "\\" at the end escapes nothing', 2],
    ["()-", "A mask needs at least one slot", 0],
    ["", "A mask needs at least one slot", 0],
  ])("%j: %s at %i", (pattern, message, position) => {
    expect(compileMask(pattern)).toEqual({ kind: "error", message, position });
  });

  test("a token named with more than one character, or with the grammar's", () => {
    expect(compileMask("0", { HH: /a/ })).toEqual({
      kind: "error",
      message: 'A token\'s name is one character, not "HH"',
      position: null,
    });
    expect(compileMask("0", { "[": /a/ })).toEqual({
      kind: "error",
      message: '"[" is part of the mask grammar and cannot name a token',
      position: null,
    });
  });
});
