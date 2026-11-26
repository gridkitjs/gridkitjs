import { describe, expect, test, vi } from "vitest";

import { toFieldMessages } from "./messages/fieldMessage";
import {
  createFieldRegistry,
  summarizeMessages,
  type RegisteredField,
} from "./registry";

interface PlacedField extends RegisteredField {
  readonly place: number;
}

function field(
  id: string,
  place: number,
  messages: Parameters<typeof toFieldMessages>[0] = null,
): PlacedField {
  return { id, place, messages: toFieldMessages(messages, "app") };
}

describe("createFieldRegistry", () => {
  test("lists registered fields in registration order without an order", () => {
    const registry = createFieldRegistry<PlacedField>();
    registry.register(field("b", 2));
    registry.register(field("a", 1));
    expect(registry.getFields().map(({ id }) => id)).toEqual(["b", "a"]);
  });

  test("lists them in the order it was given", () => {
    const registry = createFieldRegistry<PlacedField>(
      (a, b) => a.place - b.place,
    );
    registry.register(field("c", 3));
    registry.register(field("a", 1));
    registry.register(field("b", 2));
    expect(registry.getFields().map(({ id }) => id)).toEqual(["a", "b", "c"]);
  });

  test("keeps the same list until a field registers or unregisters", () => {
    const registry = createFieldRegistry<PlacedField>();
    const unregister = registry.register(field("a", 1));
    const first = registry.getFields();
    expect(registry.getFields()).toBe(first);

    unregister();
    expect(registry.getFields()).not.toBe(first);
    expect(registry.getFields()).toEqual([]);
  });

  test("replaces a field registered again under its id, and the old one's unregister leaves the new one", () => {
    const registry = createFieldRegistry<PlacedField>();
    const unregisterOld = registry.register(field("a", 1, "Old"));
    const updated = field("a", 1, "New");
    registry.register(updated);
    expect(registry.getFields()).toEqual([updated]);

    unregisterOld();
    expect(registry.getFields()).toEqual([updated]);
  });

  test("tells its listeners of every change, until they stop listening", () => {
    const registry = createFieldRegistry<PlacedField>();
    const listener = vi.fn();
    const stop = registry.subscribe(listener);
    const unregister = registry.register(field("a", 1));
    unregister();
    expect(listener).toHaveBeenCalledTimes(2);

    stop();
    registry.register(field("b", 2));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test("reveals every field through the revealers still added", () => {
    const registry = createFieldRegistry<PlacedField>();
    const first = vi.fn();
    const second = vi.fn();
    registry.addRevealer(first);
    const remove = registry.addRevealer(second);
    remove();
    registry.revealAll();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });
});

describe("summarizeMessages", () => {
  const fields = [
    field("name", 1, [
      { text: "Unusual", severity: "warning" },
      "Enter a value",
    ]),
    field("email", 2, { text: "Looks right", severity: "success" }),
    field("city", 3, [{ text: "Far away", severity: "warning" }]),
  ];

  test("lists the chosen severities field by field, the most serious first", () => {
    const summary = summarizeMessages(fields, ["error", "warning"]);
    expect(
      summary.items.map(({ field: { id }, message }) => [id, message.text]),
    ).toEqual([
      ["name", "Enter a value"],
      ["name", "Unusual"],
      ["city", "Far away"],
    ]);
  });

  test("counts each severity it lists, the most serious first", () => {
    expect(
      summarizeMessages(fields, ["success", "warning", "error"]).counts,
    ).toEqual([
      { severity: "error", count: 1 },
      { severity: "warning", count: 2 },
      { severity: "success", count: 1 },
    ]);
  });

  test("lists nothing when no field shows a chosen severity", () => {
    expect(summarizeMessages(fields, ["info"])).toEqual({
      items: [],
      counts: [],
    });
  });
});
