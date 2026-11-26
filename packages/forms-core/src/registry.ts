import { sortFieldMessages, type FieldMessage } from "./messages/fieldMessage";
import { severityRank, type Severity } from "./messages/severity";

/** What a form knows of one of its fields: enough to list its messages. */
export interface RegisteredField {
  /** Unique in the form: the id of the element a message links to. */
  readonly id: string;
  /** The messages the field shows, in its own order. */
  readonly messages: readonly FieldMessage[];
}

/**
 * The fields of one form, for a summary of their messages, and the fields'
 * ways to reveal their messages, for a submit attempt. A renderer creates
 * one per form; fields register and unregister themselves.
 */
export interface FieldRegistry<F extends RegisteredField> {
  /**
   * Adds `field`, in place of a field registered under the same id, and
   * returns what removes it again.
   */
  readonly register: (field: F) => () => void;
  /**
   * Adds what shows one field's messages, as a commit attempt would, and
   * returns what removes it again.
   */
  readonly addRevealer: (reveal: () => void) => () => void;
  /** Shows every field's messages, as a submit attempt does. */
  readonly revealAll: () => void;
  /**
   * Every registered field, in the order the registry was created with.
   * The same array until a field registers or unregisters.
   */
  readonly getFields: () => readonly F[];
  /** Calls `listener` whenever the fields change, and returns what stops it. */
  readonly subscribe: (listener: () => void) => () => void;
}

/**
 * A registry of a form's fields, listed in `order`, or in the order they
 * registered without one. A renderer passes its fields' place in the page,
 * which forms-core cannot see.
 */
export function createFieldRegistry<F extends RegisteredField>(
  order?: (a: F, b: F) => number,
): FieldRegistry<F> {
  const fields = new Map<string, F>();
  const revealers = new Set<() => void>();
  const listeners = new Set<() => void>();
  let listed: readonly F[] | null = null;

  function changed(): void {
    listed = null;
    for (const listener of [...listeners]) {
      listener();
    }
  }

  return {
    register(field) {
      fields.set(field.id, field);
      changed();
      return () => {
        if (fields.get(field.id) === field) {
          fields.delete(field.id);
          changed();
        }
      };
    },
    addRevealer(reveal) {
      revealers.add(reveal);
      return () => {
        revealers.delete(reveal);
      };
    },
    revealAll() {
      for (const reveal of [...revealers]) {
        reveal();
      }
    },
    getFields() {
      if (listed === null) {
        const all = [...fields.values()];
        listed = order === undefined ? all : all.sort(order);
      }
      return listed;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** One line of a message summary: a message and the field showing it. */
export interface SummaryItem<F extends RegisteredField> {
  readonly field: F;
  readonly message: FieldMessage;
}

/** How many messages of one severity a summary lists. */
export interface SeverityCount {
  readonly severity: Severity;
  readonly count: number;
}

/** What a message summary lists. */
export interface MessageSummary<F extends RegisteredField> {
  /** Field by field in their order, each field's most serious first. */
  readonly items: readonly SummaryItem<F>[];
  /** Most serious first, leaving out a severity with none. */
  readonly counts: readonly SeverityCount[];
}

/** The messages of `fields` whose severity is one of `severities`, with their counts. */
export function summarizeMessages<F extends RegisteredField>(
  fields: readonly F[],
  severities: readonly Severity[],
): MessageSummary<F> {
  const wanted = new Set(severities);
  const items = fields.flatMap((field) =>
    sortFieldMessages(field.messages)
      .filter((message) => wanted.has(message.severity))
      .map((message) => ({ field, message })),
  );
  const counts = new Map<Severity, number>();
  for (const { message } of items) {
    counts.set(message.severity, (counts.get(message.severity) ?? 0) + 1);
  }
  return {
    items,
    counts: [...counts]
      .map(([severity, count]) => ({ severity, count }))
      .sort((a, b) => severityRank(a.severity) - severityRank(b.severity)),
  };
}
