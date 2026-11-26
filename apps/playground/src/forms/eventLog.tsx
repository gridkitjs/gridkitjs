import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

/**
 * What a component reports: any of the fields every forms event carries.
 * A forms event object fits as it is, and a field it lacks stays empty in
 * the log.
 */
export interface ReportedEvent {
  readonly value?: unknown;
  readonly previousValue?: unknown;
  readonly text?: string;
  readonly source?: string;
  readonly trigger?: string;
  readonly nativeEvent?: { readonly type: string } | null;
}

export interface LogEntry {
  /** Counts up from 1 in the order events were reported; clearing keeps counting. */
  readonly id: number;
  /** The component that reported it, as its section names it. */
  readonly component: string;
  /** The handler that fired (`onChange`), or the native event's type. */
  readonly name: string;
  readonly event: ReportedEvent;
}

// Enough to follow a few edits; older entries drop off so the table stays
// quick to redraw on every keystroke.
const MAX_ENTRIES = 200;

interface LogState {
  readonly entries: readonly LogEntry[];
  readonly nextId: number;
}

type LogAction =
  | {
      readonly kind: "report";
      readonly component: string;
      readonly name: string;
      readonly event: ReportedEvent;
    }
  | { readonly kind: "clear" };

function logReducer(state: LogState, action: LogAction): LogState {
  switch (action.kind) {
    case "report": {
      const entry: LogEntry = {
        id: state.nextId,
        component: action.component,
        name: action.name,
        event: action.event,
      };
      return {
        entries: [...state.entries, entry].slice(-MAX_ENTRIES),
        nextId: state.nextId + 1,
      };
    }
    case "clear":
      return { entries: [], nextId: state.nextId };
  }
}

type Report = (component: string, name: string, event: ReportedEvent) => void;

interface EventLogValue {
  readonly entries: readonly LogEntry[];
  readonly clear: () => void;
}

// Two contexts, so a reporting component does not redraw on every entry.
const ReportContext = createContext<Report | null>(null);
const EventLogContext = createContext<EventLogValue | null>(null);

const INITIAL_STATE: LogState = { entries: [], nextId: 1 };

/** Collects the events every component on the page reports, in order. */
export function EventLogProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [state, dispatch] = useReducer(logReducer, INITIAL_STATE);

  const report = useCallback<Report>((component, name, event) => {
    dispatch({ kind: "report", component, name, event });
  }, []);
  const log = useMemo<EventLogValue>(
    () => ({
      entries: state.entries,
      clear: () => {
        dispatch({ kind: "clear" });
      },
    }),
    [state.entries],
  );

  return (
    <ReportContext value={report}>
      <EventLogContext value={log}>{children}</EventLogContext>
    </ReportContext>
  );
}

function useReport(): Report {
  const report = useContext(ReportContext);
  if (report === null) {
    throw new Error("useEventReporter needs an EventLogProvider above it.");
  }
  return report;
}

/**
 * A reporter for `component`: `reporter("onChange")` is a handler that logs
 * each event it is called with under that name, so a section wires a
 * component with `onChange={reporter("onChange")}`.
 */
export function useEventReporter(
  component: string,
): (name: string) => (event: ReportedEvent) => void {
  const report = useReport();
  return useCallback(
    (name: string) => (event: ReportedEvent) => {
      report(component, name, event);
    },
    [report, component],
  );
}

/** The logged entries, oldest first, and `clear` to empty the log. */
export function useEventLog(): EventLogValue {
  const value = useContext(EventLogContext);
  if (value === null) {
    throw new Error("useEventLog needs an EventLogProvider above it.");
  }
  return value;
}
