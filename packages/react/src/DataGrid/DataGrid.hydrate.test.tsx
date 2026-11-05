// @vitest-environment jsdom
import { act, useRef } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  DataGrid,
  usePaginationState,
  type ColumnDefinition,
  type DataGridApi,
} from "../index";

interface Row {
  id: string;
  name: string;
  status: string;
}

const rows: Row[] = [
  { id: "1", name: "Alpha", status: "ok" },
  { id: "2", name: "Beta", status: "warn" },
  { id: "3", name: "Gamma", status: "ok" },
];

const columns: ColumnDefinition<Row>[] = [
  { field: "name", header: "Name" },
  { field: "status", header: "Status" },
];

/** A grid plus a pager drawn outside it, so a `use*State` hook hydrates too. */
function App() {
  const gridRef = useRef<DataGridApi<Row>>(null);
  const { pageCount } = usePaginationState(gridRef);
  return (
    <>
      <p>{`Pages: ${String(pageCount)}`}</p>
      <DataGrid
        ref={gridRef}
        columns={columns}
        dataSource={rows}
        label="Hydrated"
        groupBy={[{ columnId: "status" }]}
        paginated
        toolbar
      />
    </>
  );
}

class NoopResizeObserver {
  observe(): void {
    // jsdom does no layout, so there is nothing to report.
  }
  unobserve(): void {
    // As above.
  }
  disconnect(): void {
    // As above.
  }
}

describe("DataGrid hydration", () => {
  beforeAll(() => {
    // jsdom has no ResizeObserver; the grid only reaches for it in effects.
    vi.stubGlobal("ResizeObserver", NoopResizeObserver);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("hydrates server markup without a mismatch", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<App />);
    document.body.append(container);
    const serverHtml = container.innerHTML;
    expect(serverHtml).toContain("Pages: 0");

    const error = vi.spyOn(console, "error");
    const recoverable: unknown[] = [];
    const root = await act(() =>
      hydrateRoot(container, <App />, {
        onRecoverableError: (cause) => {
          recoverable.push(cause);
        },
      }),
    );

    expect(recoverable).toEqual([]);
    expect(error).not.toHaveBeenCalled();
    expect(container.querySelector('[role="treegrid"]')).not.toBeNull();
    // Once hydrated, the hook outside the grid reads the mounted grid.
    expect(container.textContent).toContain("Pages: 1");
    act(() => {
      root.unmount();
    });
  });
});
