import { describe, expect, test } from "vitest";

import { mostSevere } from "./severity";

describe("mostSevere", () => {
  test("picks an error over every other severity", () => {
    expect(mostSevere(["success", "info", "error", "warning"])).toBe("error");
  });

  test("ranks warning, then info, then success", () => {
    expect(mostSevere(["success", "warning", "info"])).toBe("warning");
    expect(mostSevere(["success", "info"])).toBe("info");
    expect(mostSevere(["success"])).toBe("success");
  });

  test("reads any iterable, repeats included", () => {
    expect(mostSevere(new Set(["info", "warning"] as const))).toBe("warning");
    expect(mostSevere(["info", "info"])).toBe("info");
  });

  test("is null when there is nothing to rank", () => {
    expect(mostSevere([])).toBeNull();
  });
});
