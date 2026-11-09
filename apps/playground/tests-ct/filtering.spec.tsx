// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type {
  ColumnDefinition,
  FilterChangeEvent,
  FilterState,
  PaginationState,
} from "@gridkitjs/core";
import { DataGrid } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import ImperativeApiGrid from "./support/ImperativeApiGrid";
import { mountGrid } from "./support/mountGrid";

interface Row {
  id: string;
  name: string;
  active: boolean;
  score: number;
}

function buildRows(): Row[] {
  return [
    { id: "row-1", name: "Alice", active: true, score: 42 },
    { id: "row-2", name: "Bob", active: false, score: 7 },
    { id: "row-3", name: "Charlie", active: true, score: 42 },
  ];
}

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "id", width: 80 },
  { field: "name", width: 120 },
  { field: "active", width: 80, type: "boolean" },
  { field: "score", width: 80, type: "number" },
];

async function names(root: MountResult): Promise<string[]> {
  return root.locator("tbody tr td:nth-child(2)").allTextContents();
}

test("a column-scoped TextFilterEntry renders only matching rows", async ({
  mount,
}) => {
  const filter: FilterState<Row> = [
    { kind: "text", columnId: "name", query: "Ali%" },
  ];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows()}
      label="Column filter"
      defaultFilter={filter}
    />,
  );

  expect(await names(root)).toEqual(["Alice"]);
  await expect(root.getByRole("grid")).toHaveAttribute("aria-rowcount", "2");
});

test("a global TextFilterEntry matches against every column", async ({
  mount,
}) => {
  const filter: FilterState<Row> = [{ kind: "text", query: "%Char%" }];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows()}
      label="Global filter"
      defaultFilter={filter}
    />,
  );

  expect(await names(root)).toEqual(["Charlie"]);
});

test("a ValueFilterEntry matches only the exact value on a correctly-typed column", async ({
  mount,
}) => {
  const filter: FilterState<Row> = [
    { kind: "value", columnId: "score", value: 42 },
  ];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows()}
      label="Value filter"
      defaultFilter={filter}
    />,
  );

  expect(await names(root)).toEqual(["Alice", "Charlie"]);
});

test("a ValueFilterEntry never matches a differently-typed column, even with an equal-looking stringified value", async ({
  mount,
}) => {
  const filter: FilterState<Row> = [
    { kind: "value", columnId: "name", value: 42 },
  ];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows()}
      label="Value type mismatch"
      defaultFilter={filter}
    />,
  );

  expect(await names(root)).toEqual([]);
});

// No PredicateFilterEntry test here: Playwright CT serializes every function
// prop into an async cross-process binding, even ones nested deep inside a
// data structure like `defaultFilter` — so a genuinely synchronous
// `predicate` becomes an async stub in the mounted component, and
// `filterRows`'s `.every()`/`.some()` sees the Promise it returns as always
// truthy, matching every row regardless of the predicate's real answer. A
// real consumer's bundle has no such boundary; this is a CT testing-tool
// artifact, not a product bug. `PredicateFilterEntry` is fully covered by
// `packages/core/src/util/filtering.test.ts` instead, where it runs as the
// plain synchronous function it actually is.

test('a GroupFilterEntry with combinator "or" renders rows matching either nested entry', async ({
  mount,
}) => {
  const filter: FilterState<Row> = [
    {
      kind: "group",
      combinator: "or",
      entries: [
        { kind: "text", columnId: "name", query: "Alice" },
        { kind: "text", columnId: "name", query: "Bob" },
      ],
    },
  ];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows()}
      label="Group filter"
      defaultFilter={filter}
    />,
  );

  expect(await names(root)).toEqual(["Alice", "Bob"]);
});

test("two entries of different variants AND together, narrower than either alone", async ({
  mount,
}) => {
  const filter: FilterState<Row> = [
    { kind: "text", columnId: "name", query: "%a%" },
    { kind: "value", columnId: "active", value: true },
  ];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows()}
      label="Mixed filter"
      defaultFilter={filter}
    />,
  );

  expect(await names(root)).toEqual(["Alice", "Charlie"]);
});

test("a defaultFilter matching nothing renders zero body rows, not a crash", async ({
  mount,
}) => {
  const filter: FilterState<Row> = [
    { kind: "text", columnId: "name", query: "Nobody" },
  ];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows()}
      label="No matches"
      defaultFilter={filter}
    />,
  );

  await expect(root.locator("tbody tr")).toHaveCount(0);
  await expect(root.getByRole("grid")).toHaveAttribute("aria-rowcount", "1");
});

test("defaultFilter and defaultColumnSort together filter before sorting", async ({
  mount,
}) => {
  const filter: FilterState<Row> = [
    { kind: "value", columnId: "active", value: true },
  ];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows()}
      label="Filter and sort"
      defaultFilter={filter}
      defaultColumnSort={[{ columnId: "name", direction: "desc" }]}
    />,
  );

  // Only Alice and Charlie are active; sorted by name descending.
  expect(await names(root)).toEqual(["Charlie", "Alice"]);
});

test("omitting defaultFilter renders every row", async ({ mount }) => {
  const root = await mountGrid(
    mount,
    <DataGrid columns={columns} dataSource={buildRows()} label="Unfiltered" />,
  );

  expect(await names(root)).toEqual(["Alice", "Bob", "Charlie"]);
});

test("setFilter through the ref filters the rendered rows, goes back to page 0 and reports once", async ({
  mount,
}) => {
  const events: FilterChangeEvent<Row>[] = [];
  const filter: FilterState<Row> = [
    { kind: "value", columnId: "active", value: true },
  ];
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={columns}
      dataSource={buildRows()}
      label="setFilter"
      paginated
      defaultPagination={{ pageIndex: 1, pageSize: 2 }}
      filterToSet={filter}
      onFilterChange={(event) => {
        events.push(event);
      }}
    />,
  );
  expect(await names(root)).toEqual(["Charlie"]);

  await root.getByRole("button", { name: "set-filter" }).click();
  expect(await names(root)).toEqual(["Alice", "Charlie"]);

  await root.getByRole("button", { name: "set-filter" }).click();
  await root.getByRole("button", { name: "report" }).click();
  const status = JSON.parse(
    (await root.getByTestId("imperative-status").textContent()) ?? "{}",
  ) as { filter: FilterState<Row>; pagination: PaginationState };
  expect(status.filter).toEqual(filter);
  expect(status.pagination.pageIndex).toBe(0);
  expect(events).toEqual([{ filter }]);
});
