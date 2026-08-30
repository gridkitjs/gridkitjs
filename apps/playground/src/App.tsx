import { AggregatedGrid } from "./demos/AggregatedGrid";
import { CustomPagerGrid } from "./demos/CustomPagerGrid";
import { FilteredGrid } from "./demos/FilteredGrid";
import { GroupedGrid } from "./demos/GroupedGrid";
import { InfiniteScrollGrid } from "./demos/InfiniteScrollGrid";
import { LiveMetricsGrid } from "./demos/LiveMetricsGrid";
import { PaginatedGrid } from "./demos/PaginatedGrid";
import { PropsTable } from "./demos/PropsTable";
import { ReactiveToolbarGrid } from "./demos/ReactiveToolbarGrid";
import { ResizableSelectableGrid } from "./demos/ResizableSelectableGrid";
import { VirtualizedGrid } from "./demos/VirtualizedGrid";

export default function App() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">GridKit Playground</h1>
      <p className="mt-2 text-sm text-gray-600">
        Import from <code>@gridkitjs/react</code> and render it here. Drag a
        column edge to resize, or double-click it to fit the content. Drag a
        header itself to reorder — or focus one and press{" "}
        <code>Ctrl+Arrow</code>. Click a header's sort toggle to cycle
        ascending, descending and off; <code>Shift+Click</code> a second toggle
        to stack it instead of replacing the sort — or focus a header and press{" "}
        <code>Alt+ArrowUp</code> / <code>Alt+Shift+ArrowUp</code>. Tab into the
        grid and the arrow keys move cell to cell; <code>Space</code> selects,{" "}
        <code>Shift+Click</code> takes a range, <code>Ctrl+A</code> takes every
        row and <code>Escape</code> lets them go.
      </p>
      <div className="mt-4">
        <ResizableSelectableGrid />
      </div>
      <h2 className="mt-8 text-lg font-bold">
        Same data, <code>defaultFilter</code>-seeded
      </h2>
      <div className="mt-2">
        <FilteredGrid />
      </div>
      <h2 className="mt-8 text-lg font-bold">
        <code>groupableColumns</code>, grouped by Status
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Click a header's group icon, or focus a header and press{" "}
        <code>Alt+ArrowDown</code>, to add or remove it from the group-by stack.
        Click a group row, or focus it and press <code>Space</code>/
        <code>Enter</code>, to expand or collapse it.
      </p>
      <div className="mt-2">
        <GroupedGrid />
      </div>
      <h2 className="mt-8 text-lg font-bold">
        <code>paginated</code>, grouped by Region
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        A page never splits a group — <code>pageSize</code> counts top-level
        groups here, not leaf rows, so pages hold a different number of rendered
        rows despite sharing one size. Change the page size, sort a column, or
        add/remove a group-by level to see the grid jump back to page 1.
      </p>
      <div className="mt-2">
        <PaginatedGrid />
      </div>
      <h2 className="mt-8 text-lg font-bold">
        <code>pager.template</code>, a fully custom pager
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Replaces the built-in pager's markup entirely — this one is styled
        nothing like it, to show <code>paginated</code> row-windowing works the
        same either way.
      </p>
      <div className="mt-2">
        <CustomPagerGrid />
      </div>
      <h2 className="mt-8 text-lg font-bold">
        <code>aggregates</code>, grouped by Region
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Every built-in aggregate at once — <code>sum</code>/<code>avg</code>/
        <code>min</code>/<code>max</code> of Amount, <code>min</code>/
        <code>max</code> of the Closed date, <code>count</code> of every row,
        <code>countDistinct</code> of Rep — plus a custom function computing the
        percent of rows still Open. Each region's results render inline or as
        their own summary row, per <code>groupAggregateDisplay</code>, computed
        over the full dataset regardless of what's currently rendered. A
        grand-total footer below the grid totals every row the same way,
        regardless of grouping or collapse state.
      </p>
      <div className="mt-2">
        <AggregatedGrid />
      </div>
      <h2 className="mt-8 text-lg font-bold">
        <code>usePaginationState</code>/<code>useSelectionState</code>, an
        external toolbar
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        The pager and selection count above the grid live entirely outside{" "}
        <code>DataGridComponent</code>'s own tree — no <code>ref</code>-plus-
        <code>on*Change</code> wiring, just the reactive hooks reading the grid
        through its <code>ref</code>. Sort a column to see the toolbar follow
        the silent page reset too.
      </p>
      <div className="mt-2">
        <ReactiveToolbarGrid />
      </div>
      <h2 className="mt-8 text-lg font-bold">
        <code>virtualized</code>, 5,000 rows
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Only the rows near the current scroll position are ever mounted — watch
        the DOM node count in devtools stay flat while scrolling instead of
        climbing with the dataset. <code>Notes</code> wraps on roughly one row
        in five, so heights are measured per row rather than assumed uniform.
      </p>
      <div className="mt-2">
        <VirtualizedGrid />
      </div>
      <h2 className="mt-8 text-lg font-bold">
        <code>infiniteScroll</code>, paired with <code>virtualized</code>
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Starts with one 100-row chunk of the same 5,000-row dataset loaded;
        scrolling near the bottom loads the next chunk after a simulated 500ms
        request, showing a loading row while it's in flight. The sentinel
        disappears once every row has loaded.
      </p>
      <div className="mt-2">
        <InfiniteScrollGrid />
      </div>
      <h2 className="mt-8 text-lg font-bold">Fast-changing async data</h2>
      <p className="mt-2 text-sm text-gray-600">
        A mock metrics feed ticking every 700ms — each tick resolves a promise
        (standing in for a websocket/poll response) with a whole new row set,
        which just becomes the grid's next <code>dataSource</code>. Red/green
        marks a value that rose or fell since the previous tick.
      </p>
      <div className="mt-2">
        <LiveMetricsGrid />
      </div>
      <h2 className="mt-8 text-lg font-bold">
        PropsTable, in a 360px-wide panel
      </h2>
      <div className="mt-2 w-90 border border-dashed border-red-400 p-2">
        <PropsTable />
      </div>
    </main>
  );
}
