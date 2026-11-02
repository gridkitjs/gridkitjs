import { useEffect, useRef, useState } from "react";
import { DataGrid, type ColumnDefinition } from "@gridkitjs/react";

interface ServerMetric {
  Server: string;
  Region: string;
  "CPU %": number;
  "Mem %": number;
  "Req/s": number;
  "p99 (ms)": number;
}

const servers: readonly { name: string; region: string }[] = [
  { name: "web-01", region: "us-east" },
  { name: "web-02", region: "us-east" },
  { name: "web-03", region: "us-west" },
  { name: "api-01", region: "us-west" },
  { name: "api-02", region: "eu-west" },
  { name: "worker-01", region: "eu-west" },
];

function randomWalk(value: number, spread: number, min: number, max: number) {
  const next = value + (Math.random() - 0.5) * spread;
  return Math.min(max, Math.max(min, next));
}

/** Mocks a metrics feed: an in-memory snapshot, nudged on an interval, "pushed" through a promise to stand in for a websocket/poll tick. */
function fetchNextMetricsTick(
  previous: readonly ServerMetric[],
): Promise<readonly ServerMetric[]> {
  const next = previous.map((row) => ({
    ...row,
    "CPU %": Math.round(randomWalk(row["CPU %"], 18, 2, 99)),
    "Mem %": Math.round(randomWalk(row["Mem %"], 6, 10, 95)),
    "Req/s": Math.round(randomWalk(row["Req/s"], 120, 0, 2000)),
    "p99 (ms)": Math.round(randomWalk(row["p99 (ms)"], 40, 8, 900)),
  }));
  const latencyMs = 30 + Math.random() * 120;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(next);
    }, latencyMs);
  });
}

const initialMetrics: readonly ServerMetric[] = servers.map((server) => ({
  Server: server.name,
  Region: server.region,
  "CPU %": Math.round(randomWalk(40, 30, 2, 99)),
  "Mem %": Math.round(randomWalk(50, 20, 10, 95)),
  "Req/s": Math.round(randomWalk(400, 300, 0, 2000)),
  "p99 (ms)": Math.round(randomWalk(120, 100, 8, 900)),
}));

const numericFields = ["CPU %", "Mem %", "Req/s", "p99 (ms)"] as const;

function metricDeltaClassName(
  row: ServerMetric,
  field: (typeof numericFields)[number],
  previous: ReadonlyMap<string, ServerMetric>,
): string {
  const prevRow = previous.get(row.Server);
  if (!prevRow) return "";
  const delta = row[field] - prevRow[field];
  if (delta === 0) return "";
  return delta > 0 ? "text-red-600 font-semibold" : "text-emerald-600";
}

/**
 * A grid fed by data that changes on its own, on a timer, standing in for a
 * websocket/poll-driven feed. Each tick fetches a full next snapshot
 * (`fetchNextMetricsTick`, promise-based like a real request) and swaps in a
 * new `dataSource` array — the grid has no special "live" mode, it just
 * re-renders on prop change. Cell colour reflects that tick's delta.
 */
export function LiveMetricsGrid() {
  const [metrics, setMetrics] =
    useState<readonly ServerMetric[]>(initialMetrics);
  const previousRef = useRef<ReadonlyMap<string, ServerMetric>>(new Map());
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (paused) return;
    let cancelled = false;

    const interval = setInterval(() => {
      void fetchNextMetricsTick(metrics).then((next) => {
        if (cancelled) return;
        previousRef.current = new Map(metrics.map((row) => [row.Server, row]));
        setMetrics(next);
        setTick((count) => count + 1);
      });
    }, 700);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [metrics, paused]);

  const metricColumns: readonly ColumnDefinition<ServerMetric>[] = [
    { field: "Server" },
    { field: "Region" },
    ...numericFields.map((field): ColumnDefinition<ServerMetric> => ({
      field,
      type: "number",
      cellTemplate: ({ value, row }) => (
        <span className={metricDeltaClassName(row, field, previousRef.current)}>
          {String(value)}
        </span>
      ),
    })),
  ];

  return (
    <div>
      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          className="rounded border border-gray-300 px-2 py-1"
          onClick={() => {
            setPaused((value) => !value);
          }}
        >
          {paused ? "Resume" : "Pause"}
        </button>
        <span className="text-gray-600">tick {tick} — updates every 700ms</span>
      </div>
      <div className="mt-2">
        <DataGrid
          selectable={{
            cells: "single",
            columns: "multiple",
            rows: "multiple",
          }}
          reorderableColumns
          resizableColumns
          columns={metricColumns}
          dataSource={metrics}
          getRowId={(row) => row.Server}
          label="Live server metrics"
          borders="horizontal"
          sortableColumns
        />
      </div>
    </div>
  );
}
