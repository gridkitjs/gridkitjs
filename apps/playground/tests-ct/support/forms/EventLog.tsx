import { useCallback, useState } from "react";

/** The fields of any forms event a spec checks; every forms event fits. */
export interface AnyFieldEvent {
  readonly value: unknown;
  readonly previousValue?: unknown;
  readonly text: string;
  readonly previousText?: string;
  readonly source?: string;
  readonly trigger?: string;
  readonly changed?: boolean;
  readonly initialValue?: unknown;
  readonly valid?: boolean;
  readonly cancelable?: boolean;
  readonly input?: {
    readonly inputType: string | null;
    readonly data: string | null;
    readonly isComposing: boolean;
  } | null;
  readonly nativeEvent: { readonly type: string } | null;
}

/** One handler call as the log keeps it: plain data a spec can read back. */
export interface LoggedEvent {
  readonly name: string;
  readonly value: unknown;
  readonly previousValue?: unknown;
  readonly text: string;
  readonly previousText?: string;
  readonly source?: string;
  readonly trigger?: string;
  readonly changed?: boolean;
  readonly initialValue?: unknown;
  readonly valid?: boolean;
  readonly cancelable?: boolean;
  readonly inputType?: string | null;
  readonly data?: string | null;
  readonly isComposing?: boolean;
  /** The native event's type, `null` for a change the app made. */
  readonly native: string | null;
}

function toLogged(name: string, event: AnyFieldEvent): LoggedEvent {
  const { input, nativeEvent, ...fields } = event;
  return {
    name,
    ...fields,
    ...(input === undefined || input === null
      ? {}
      : {
          inputType: input.inputType,
          data: input.data,
          isComposing: input.isComposing,
        }),
    native: nativeEvent?.type ?? null,
  };
}

/**
 * Records every handler call in order: `record("onChange")` is a handler
 * that logs each event it is called with under that name. `clear` empties
 * the record, so a spec can check what one action fires.
 */
export function useEventRecorder(): {
  readonly events: readonly LoggedEvent[];
  readonly record: (name: string) => (event: AnyFieldEvent) => void;
  readonly clear: () => void;
} {
  const [events, setEvents] = useState<readonly LoggedEvent[]>([]);
  const record = useCallback(
    (name: string) => (event: AnyFieldEvent) => {
      const logged = toLogged(name, event);
      setEvents((current) => [...current, logged]);
    },
    [],
  );
  const clear = useCallback(() => {
    setEvents([]);
  }, []);
  return { events, record, clear };
}

/**
 * The recorded calls, oldest first: each item reads as its handler's name
 * with the event's source or trigger, and holds the whole event as JSON in
 * `data-event` for `loggedEvents` to read.
 */
export function EventList({
  events,
}: {
  readonly events: readonly LoggedEvent[];
}) {
  return (
    <ol aria-label="Events">
      {events.map((event, index) => (
        <li key={index} data-event={JSON.stringify(event)}>
          {[event.name, event.source, event.trigger]
            .filter((part) => part !== undefined)
            .join(" ")}
        </li>
      ))}
    </ol>
  );
}
