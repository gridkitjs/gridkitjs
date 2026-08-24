import { useState } from "react";

export function useEventLog(limit = 6) {
  const [entries, setEntries] = useState<readonly string[]>([]);

  function record(entry: string): void {
    setEntries((previous) => [entry, ...previous].slice(0, limit));
  }

  return { entries, record };
}

export function EventLog({ entries }: { entries: readonly string[] }) {
  return (
    <ol className="mt-4 min-h-24 space-y-1 rounded-lg border border-gray-300 p-3 text-xs dark:border-gray-700">
      {entries.length === 0 ? (
        <li className="text-gray-500">
          Interact with the grid above to see its callbacks fire.
        </li>
      ) : (
        entries.map((entry, index) => (
          <li key={`${entry}-${String(index)}`}>
            <code>{entry}</code>
          </li>
        ))
      )}
    </ol>
  );
}
