import { describe, expect, test } from "vitest";

import { inlineStep } from "./direction";

describe("inlineStep", () => {
  test("moves right to the next and left to the previous by default", () => {
    expect(inlineStep("ArrowRight")).toBe(1);
    expect(inlineStep("ArrowLeft")).toBe(-1);
  });

  test("reads the same in left-to-right", () => {
    expect(inlineStep("ArrowRight", "ltr")).toBe(1);
    expect(inlineStep("ArrowLeft", "ltr")).toBe(-1);
  });

  test("moves left to the next and right to the previous in right-to-left", () => {
    expect(inlineStep("ArrowLeft", "rtl")).toBe(1);
    expect(inlineStep("ArrowRight", "rtl")).toBe(-1);
  });

  test("takes no other key in either direction", () => {
    for (const key of ["ArrowUp", "ArrowDown", "Home", "End", "a"]) {
      expect(inlineStep(key, "ltr")).toBeNull();
      expect(inlineStep(key, "rtl")).toBeNull();
    }
  });
});
