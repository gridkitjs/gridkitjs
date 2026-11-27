import { describe, expect, test } from "vitest";

import { stepNumber, type StepRequest } from "./stepNumber";

const request: StepRequest = {
  value: "0",
  direction: "up",
  size: "step",
  step: "1",
  largeStep: "10",
  min: null,
  max: null,
};

function step(changes: Partial<StepRequest>): string | null {
  return stepNumber({ ...request, ...changes });
}

describe("stepNumber", () => {
  test("steps exactly: 0.1 by 0.2 is 0.3 on a grid from 0.1, and by 0.1 is 0.2", () => {
    expect(step({ value: "0.1", step: "0.2", min: "0.1" })).toBe("0.3");
    expect(step({ value: "0.1", step: "0.1" })).toBe("0.2");
    expect(step({ value: "0.3", step: "0.1", direction: "down" })).toBe("0.2");
  });

  test("steps a 20-digit amount exactly", () => {
    expect(step({ value: "12345678901234567890.12", step: "0.01" })).toBe(
      "12345678901234567890.13",
    );
  });

  test("from empty, starts at 0, or at a limit that leaves 0 out", () => {
    expect(step({ value: null })).toBe("0");
    expect(step({ value: null, direction: "down" })).toBe("0");
    expect(step({ value: null, min: "5" })).toBe("5");
    expect(step({ value: null, max: "-5", direction: "down" })).toBe("-5");
    expect(step({ value: null, min: "-5", max: "5" })).toBe("0");
  });

  test("from off the grid, goes to the grid value that way", () => {
    expect(step({ value: "1.37", step: "0.5" })).toBe("1.5");
    expect(step({ value: "1.37", step: "0.5", direction: "down" })).toBe("1");
    expect(step({ value: "-1.37", step: "0.5" })).toBe("-1");
  });

  test("counts the grid from min", () => {
    expect(step({ value: "1", min: "0.25" })).toBe("1.25");
    expect(step({ value: "1.25", min: "0.25" })).toBe("2.25");
  });

  test("a large step moves by largeStep", () => {
    expect(step({ value: "3", size: "large" })).toBe("13");
    expect(step({ value: "3", size: "large", direction: "down" })).toBe("-7");
  });

  test("stays within min and max", () => {
    expect(step({ value: "9.5", max: "10" })).toBe("10");
    expect(step({ value: "10", max: "10" })).toBe("10");
    expect(step({ value: "0", min: "0", direction: "down" })).toBe("0");
    expect(step({ value: "150", max: "100" })).toBe("100");
  });

  test("edge goes to the limit, and nowhere without one", () => {
    expect(step({ value: "3", size: "edge", max: "100" })).toBe("100");
    expect(
      step({ value: "3", size: "edge", direction: "down", min: "-2.50" }),
    ).toBe("-2.5");
    expect(step({ value: "3", size: "edge" })).toBe("3");
    expect(step({ value: null, size: "edge" })).toBeNull();
  });

  test("throws for a step that is not above zero", () => {
    expect(() => step({ step: "0" })).toThrow(RangeError);
  });
});
