import { describe, expect, test } from "vitest";

import type { FieldMessage } from "../messages/fieldMessage";
import { fieldReducer, type FieldAction } from "./fieldReducer";
import {
  createFieldState,
  type FieldDraft,
  type FieldPhase,
  type FieldState,
} from "./state";

const PHASES = {
  idle: { kind: "idle" },
  editing: { kind: "editing", initialValue: "start", committedValue: "last" },
  checking: {
    kind: "checking",
    initialValue: "start",
    committedValue: "last",
    trigger: "enter",
    attempt: 1,
    leaving: false,
  },
  leaving: { kind: "leaving", initialValue: "start", committedValue: "last" },
} satisfies Record<FieldPhase<string>["kind"], FieldPhase<string>>;

type PhaseKind = keyof typeof PHASES;

const refusal: FieldMessage = {
  severity: "error",
  text: "Taken",
  code: "refused",
  source: "commit",
};

const typed: FieldDraft<string> = {
  kind: "text",
  text: "now",
  reading: { kind: "value", value: "now" },
};

const garbled: FieldDraft<string> = {
  kind: "text",
  text: "??",
  reading: { kind: "unreadable", message: "Can't read" },
};

/** A field holding "now" in `phase`, with anything else `extra` sets. */
function field(
  phase: PhaseKind,
  extra: Partial<FieldState<string>> = {},
): FieldState<string> {
  return { ...createFieldState("now", []), phase: PHASES[phase], ...extra };
}

function reduce(
  state: FieldState<string>,
  action: FieldAction<string>,
): FieldState<string> {
  return fieldReducer(state, action);
}

describe("focus", () => {
  test("starts editing an idle field, both values the current one", () => {
    expect(reduce(field("idle"), { type: "focus" }).phase).toEqual({
      kind: "editing",
      initialValue: "now",
      committedValue: "now",
    });
  });

  test.each(["editing", "checking"] as const)("is ignored while %s", (kind) => {
    const state = field(kind);
    expect(reduce(state, { type: "focus" })).toBe(state);
  });

  test("brings a leaving field back to editing, keeping both values", () => {
    expect(reduce(field("leaving"), { type: "focus" }).phase).toEqual(
      PHASES.editing,
    );
  });
});

describe("edit", () => {
  const edit = { type: "edit", text: "new" } as const;
  const pending = { kind: "text", text: "new", reading: { kind: "pending" } };

  test("is ignored while idle", () => {
    const state = field("idle");
    expect(reduce(state, edit)).toBe(state);
  });

  test("puts the text in the draft, unread, and clears a refusal", () => {
    const next = reduce(field("editing", { refusal }), edit);
    expect(next.draft).toEqual(pending);
    expect(next.refusal).toBeNull();
    expect(next.phase).toBe(PHASES.editing);
    expect(next.value).toBe("now");
  });

  test("supersedes a pending check", () => {
    const next = reduce(field("checking"), edit);
    expect(next.draft).toEqual(pending);
    expect(next.phase).toEqual(PHASES.editing);
  });

  test("brings a leaving field back to editing", () => {
    const next = reduce(field("leaving"), edit);
    expect(next.draft).toEqual(pending);
    expect(next.phase).toEqual(PHASES.editing);
  });
});

describe("read", () => {
  const read = {
    type: "read",
    reading: { kind: "unreadable", message: "No" },
  } as const;

  test.each(Object.keys(PHASES) as PhaseKind[])(
    "stores how typed text reads while %s",
    (kind) => {
      const next = reduce(
        field(kind, {
          draft: { kind: "text", text: "x", reading: { kind: "pending" } },
        }),
        read,
      );
      expect(next.draft).toEqual({
        kind: "text",
        text: "x",
        reading: { kind: "unreadable", message: "No" },
      });
      expect(next.phase).toBe(PHASES[kind]);
    },
  );

  test.each(Object.keys(PHASES) as PhaseKind[])(
    "is ignored with no typed text while %s",
    (kind) => {
      const state = field(kind);
      expect(reduce(state, read)).toBe(state);
    },
  );
});

describe("change", () => {
  test.each(["idle", "editing", "leaving"] as const)(
    "sets the value and shows it formatted while %s",
    (kind) => {
      const next = reduce(field(kind, { draft: typed, refusal }), {
        type: "change",
        value: "other",
        text: null,
      });
      expect(next.value).toBe("other");
      expect(next.draft).toEqual({ kind: "current" });
      expect(next.refusal).toBeNull();
      expect(next.phase).toBe(PHASES[kind]);
    },
  );

  test("keeps typed text that reads as the value", () => {
    const next = reduce(field("editing"), {
      type: "change",
      value: "12",
      text: "12,",
    });
    expect(next.draft).toEqual({
      kind: "text",
      text: "12,",
      reading: { kind: "value", value: "12" },
    });
  });

  test("supersedes a pending check", () => {
    const next = reduce(field("checking"), {
      type: "change",
      value: "other",
      text: null,
    });
    expect(next.value).toBe("other");
    expect(next.phase).toEqual(PHASES.editing);
  });
});

describe("revert", () => {
  const revert = { type: "revert", draft: { kind: "current" } } as const;

  test.each(["idle", "editing", "leaving"] as const)(
    "replaces the draft while %s",
    (kind) => {
      const next = reduce(field(kind, { draft: typed }), revert);
      expect(next.draft).toEqual({ kind: "current" });
      expect(next.phase).toBe(PHASES[kind]);
    },
  );

  test("is ignored while checking", () => {
    const state = field("checking", { draft: typed });
    expect(reduce(state, revert)).toBe(state);
  });
});

describe("validated", () => {
  const messages: FieldMessage[] = [
    { severity: "warning", text: "Odd", code: null, source: "validate" },
  ];

  test.each(Object.keys(PHASES) as PhaseKind[])(
    "replaces the validation while %s",
    (kind) => {
      const next = reduce(field(kind), { type: "validated", messages });
      expect(next.validation).toBe(messages);
      expect(next.phase).toBe(PHASES[kind]);
    },
  );
});

describe("check", () => {
  const check = {
    type: "check",
    trigger: "tab",
    attempt: 7,
    leaving: true,
  } as const;

  test("starts checking an edit, keeping both values", () => {
    expect(reduce(field("editing"), check).phase).toEqual({
      kind: "checking",
      initialValue: "start",
      committedValue: "last",
      trigger: "tab",
      attempt: 7,
      leaving: true,
    });
  });

  test.each(["idle", "checking", "leaving"] as const)(
    "is ignored while %s",
    (kind) => {
      const state = field(kind);
      expect(reduce(state, check)).toBe(state);
    },
  );
});

describe("accept", () => {
  test.each(["editing", "checking"] as const)(
    "commits the value and keeps editing from %s",
    (kind) => {
      const next = reduce(field(kind, { draft: typed, refusal }), {
        type: "accept",
        next: "editing",
      });
      expect(next.phase).toEqual({
        kind: "editing",
        initialValue: "start",
        committedValue: "now",
      });
      expect(next.draft).toEqual({ kind: "current" });
      expect(next.refusal).toBeNull();
      expect(next.revealed).toBe(true);
    },
  );

  test("moves to leaving, committed, for Tab", () => {
    expect(
      reduce(field("editing"), { type: "accept", next: "leaving" }).phase,
    ).toEqual({
      kind: "leaving",
      initialValue: "start",
      committedValue: "now",
    });
  });

  test.each(["editing", "checking"] as const)(
    "ends the edit from %s when leaving",
    (kind) => {
      const next = reduce(field(kind), { type: "accept", next: "idle" });
      expect(next.phase).toEqual({ kind: "idle" });
      expect(next.revealed).toBe(true);
    },
  );

  test("keeps text that cannot be read", () => {
    const next = reduce(field("editing", { draft: garbled }), {
      type: "accept",
      next: "editing",
    });
    expect(next.draft).toBe(garbled);
  });

  test.each(["idle", "leaving"] as const)("is ignored while %s", (kind) => {
    const state = field(kind);
    expect(reduce(state, { type: "accept", next: "editing" })).toBe(state);
  });
});

describe("refuse", () => {
  test.each(["editing", "checking"] as const)(
    "stores the refusal and keeps editing from %s, values kept",
    (kind) => {
      const next = reduce(field(kind, { draft: typed }), {
        type: "refuse",
        message: refusal,
        next: "editing",
      });
      expect(next.refusal).toBe(refusal);
      expect(next.revealed).toBe(true);
      expect(next.phase).toEqual(PHASES.editing);
      expect(next.draft).toBe(typed);
      expect(next.value).toBe("now");
    },
  );

  test.each(["editing", "checking"] as const)(
    "ends the edit from %s when leaving",
    (kind) => {
      const next = reduce(field(kind), {
        type: "refuse",
        message: refusal,
        next: "idle",
      });
      expect(next.refusal).toBe(refusal);
      expect(next.phase).toEqual({ kind: "idle" });
    },
  );

  test.each(["idle", "leaving"] as const)("is ignored while %s", (kind) => {
    const state = field(kind);
    expect(
      reduce(state, { type: "refuse", message: refusal, next: "editing" }),
    ).toBe(state);
  });
});

describe("blur", () => {
  test("is ignored while idle", () => {
    const state = field("idle");
    expect(reduce(state, { type: "blur" })).toBe(state);
  });

  test("ends an edit that commits nothing, showing its messages", () => {
    const next = reduce(field("editing", { draft: garbled }), { type: "blur" });
    expect(next.phase).toEqual({ kind: "idle" });
    expect(next.revealed).toBe(true);
    expect(next.draft).toBe(garbled);
  });

  test("notes on a pending check that focus has gone", () => {
    expect(reduce(field("checking"), { type: "blur" }).phase).toEqual({
      ...PHASES.checking,
      leaving: true,
    });
  });

  test("ends a field Tab has committed", () => {
    expect(reduce(field("leaving"), { type: "blur" }).phase).toEqual({
      kind: "idle",
    });
  });
});

describe("sync", () => {
  const sync = { type: "sync", value: "prop", equal: false } as const;

  test("adopts a different value while idle, over any draft", () => {
    const next = reduce(field("idle", { draft: garbled, refusal }), sync);
    expect(next.value).toBe("prop");
    expect(next.draft).toEqual({ kind: "current" });
    expect(next.refusal).toBeNull();
  });

  test.each(["idle", "editing", "leaving"] as const)(
    "is ignored for an equal value while %s",
    (kind) => {
      const state = field(kind);
      expect(reduce(state, { ...sync, equal: true })).toBe(state);
    },
  );

  test.each(["editing", "leaving"] as const)(
    "adopts the value while %s with the value shown, as the committed one",
    (kind) => {
      const next = reduce(field(kind), sync);
      expect(next.value).toBe("prop");
      expect(next.phase).toEqual({ ...PHASES[kind], committedValue: "prop" });
    },
  );

  test.each(["editing", "leaving"] as const)(
    "is ignored while %s with typed text",
    (kind) => {
      const state = field(kind, { draft: typed });
      expect(reduce(state, sync)).toBe(state);
    },
  );

  test("is ignored while checking", () => {
    const state = field("checking");
    expect(reduce(state, sync)).toBe(state);
  });
});

describe("reveal", () => {
  test.each(Object.keys(PHASES) as PhaseKind[])(
    "shows messages from now on while %s",
    (kind) => {
      const next = reduce(field(kind), { type: "reveal" });
      expect(next.revealed).toBe(true);
      expect(next.phase).toBe(PHASES[kind]);
    },
  );

  test("leaves a revealed field as it is", () => {
    const state = field("editing", { revealed: true });
    expect(reduce(state, { type: "reveal" })).toBe(state);
  });
});
