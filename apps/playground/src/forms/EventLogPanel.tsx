import { useId, useLayoutEffect, useRef } from "react";
import { useEventLog, type LogEntry } from "./eventLog";

/**
 * A logged value as code would write it, so an empty string, spaces and
 * `null` stay told apart. A field the event lacks shows nothing.
 */
function formatValue(value: unknown): string {
  switch (typeof value) {
    case "undefined":
      return "";
    case "string":
    case "object":
      return JSON.stringify(value);
    default:
      return String(value);
  }
}

const COLUMNS: readonly {
  readonly heading: string;
  readonly cell: (entry: LogEntry) => string;
}[] = [
  { heading: "value", cell: ({ event }) => formatValue(event.value) },
  {
    heading: "previousValue",
    cell: ({ event }) => formatValue(event.previousValue),
  },
  { heading: "text", cell: ({ event }) => formatValue(event.text) },
  { heading: "source", cell: ({ event }) => event.source ?? "" },
  { heading: "trigger", cell: ({ event }) => event.trigger ?? "" },
  { heading: "native", cell: ({ event }) => event.nativeEvent?.type ?? "" },
];

/** Every event the page's components report, oldest first. */
export function EventLogPanel() {
  const { entries, clear } = useEventLog();
  const headingId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keeps the newest entry in view as entries arrive.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (scroller !== null) {
      scroller.scrollTop = scroller.scrollHeight;
    }
  }, [entries]);

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-h-0 flex-1 flex-col"
    >
      <header className="flex items-center gap-3 border-b border-gridkit-line px-4 py-3">
        <h2 id={headingId} className="font-semibold">
          Event log
        </h2>
        <span className="text-sm text-gridkit-fg-muted">
          {entries.length === 1
            ? "1 event"
            : `${String(entries.length)} events`}
        </span>
        <button
          type="button"
          className="ms-auto rounded border border-gridkit-line px-3 py-1 text-sm hover:border-gridkit-hover-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gridkit-accent"
          onClick={clear}
        >
          Clear
        </button>
      </header>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        {/* Logged values read as code, left to right, on a right-to-left page too. */}
        <table
          dir="ltr"
          aria-labelledby={headingId}
          className="w-full border-collapse font-mono text-xs"
        >
          <thead className="sticky top-0 bg-gridkit-surface-muted text-gridkit-fg-muted">
            <tr>
              <th scope="col" className="px-2 py-1.5 text-end font-medium">
                #
              </th>
              <th scope="col" className="px-2 py-1.5 text-start font-medium">
                event
              </th>
              {COLUMNS.map((column) => (
                <th
                  key={column.heading}
                  scope="col"
                  className="px-2 py-1.5 text-start font-medium"
                >
                  {column.heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-t border-gridkit-line align-top"
              >
                <td className="px-2 py-1 text-end text-gridkit-fg-muted tabular-nums">
                  {entry.id}
                </td>
                <td className="px-2 py-1 whitespace-nowrap">
                  <span className="font-semibold">{entry.name}</span>
                  <span className="block text-gridkit-fg-muted">
                    {entry.component}
                  </span>
                </td>
                {COLUMNS.map((column) => {
                  const text = column.cell(entry);
                  return (
                    <td key={column.heading} className="px-2 py-1" title={text}>
                      <div className="max-w-36 overflow-hidden text-ellipsis whitespace-pre">
                        {text}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <p className="px-4 py-6 text-sm text-gridkit-fg-muted">
            Use a component on the page and its events show here, oldest first.
          </p>
        )}
      </div>
    </section>
  );
}
