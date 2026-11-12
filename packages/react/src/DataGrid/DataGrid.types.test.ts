import { describe, expectTypeOf, it } from "vitest";
import type {
  AggregateFn,
  AggregateResults,
  AggregateSpec,
  AggregateState,
  BuiltInAggregate,
  ColumnAlignment,
  ColumnDefinition,
  ColumnFilterMenuOptions,
  ColumnOrderEvent,
  ColumnOrderState,
  ColumnSortEntry,
  ColumnSortEvent,
  ColumnSortState,
  ColumnType,
  ColumnWrapConfig,
  DataGridApi,
  DataGridProps,
  DisplayRow,
  ExportScalar,
  FieldPath,
  FooterTemplateContext,
  FormatLocale,
  GridFilterMenuOptions,
  GroupAggregateDisplay,
  GroupByEntry,
  GroupByEvent,
  GroupByState,
  GroupExpansionEvent,
  GroupExpansionState,
  PaginationChangeEvent,
  PaginationState,
  ResolvedGroupRow,
  ResolvedGroupSummaryRow,
  ResolvedRow,
  SortDirection,
} from "../index";

interface Row {
  id: string;
  amount: number;
}

type Props = DataGridProps<Row>;
type Api = DataGridApi<Row>;
type Column = ColumnDefinition<Row>;
type ArgumentOf<Callback> =
  NonNullable<Callback> extends (event: infer Event) => void ? Event : never;

// The checks run in `tsc`, not at run time: each pins a type imported from
// the package entry to the prop, column field or method that names it, so a consumer can
// type the grid without importing from `@gridkitjs/core`.
describe("the types DataGrid's props and api name", () => {
  it("are importable from the package entry", () => {
    expectTypeOf<Props["columns"]>().toEqualTypeOf<
      readonly Column[] | undefined
    >();
    expectTypeOf<Column["field"]>().toEqualTypeOf<
      FieldPath<Row> | (string & {})
    >();
    expectTypeOf<Column["type"]>().toEqualTypeOf<ColumnType | undefined>();
    expectTypeOf<Column["alignment"]>().toEqualTypeOf<
      ColumnAlignment | undefined
    >();
    expectTypeOf<Column["wrap"]>().toEqualTypeOf<
      ColumnWrapConfig | undefined
    >();
    expectTypeOf<Column["filterMenu"]>().toEqualTypeOf<
      ColumnFilterMenuOptions | undefined
    >();
    expectTypeOf<ArgumentOf<Column["footerTemplate"]>>().toEqualTypeOf<
      FooterTemplateContext<Row>
    >();
    expectTypeOf<
      ReturnType<NonNullable<Column["exportValue"]>>
    >().toEqualTypeOf<ExportScalar>();

    expectTypeOf<Props["columnSort"]>().toEqualTypeOf<
      ColumnSortState | undefined
    >();
    expectTypeOf<ColumnSortState[number]>().toEqualTypeOf<ColumnSortEntry>();
    expectTypeOf<ColumnSortEntry["direction"]>().toEqualTypeOf<SortDirection>();
    expectTypeOf<
      ArgumentOf<Props["onColumnSortChange"]>
    >().toEqualTypeOf<ColumnSortEvent>();

    expectTypeOf<Props["columnOrder"]>().toEqualTypeOf<
      ColumnOrderState | undefined
    >();
    expectTypeOf<
      ArgumentOf<Props["onColumnOrderChange"]>
    >().toEqualTypeOf<ColumnOrderEvent>();

    expectTypeOf<Props["groupBy"]>().toEqualTypeOf<GroupByState | undefined>();
    expectTypeOf<GroupByState[number]>().toEqualTypeOf<GroupByEntry>();
    expectTypeOf<
      ArgumentOf<Props["onGroupByChange"]>
    >().toEqualTypeOf<GroupByEvent>();

    expectTypeOf<Props["groupExpansion"]>().toEqualTypeOf<
      GroupExpansionState | undefined
    >();
    expectTypeOf<
      ArgumentOf<Props["onGroupExpansionChange"]>
    >().toEqualTypeOf<GroupExpansionEvent>();

    expectTypeOf<Props["pagination"]>().toEqualTypeOf<
      PaginationState | undefined
    >();
    expectTypeOf<
      ArgumentOf<Props["onPaginationChange"]>
    >().toEqualTypeOf<PaginationChangeEvent>();

    expectTypeOf<Props["aggregates"]>().toEqualTypeOf<
      AggregateState<Row> | undefined
    >();
    expectTypeOf<AggregateState<Row>[number]>().toEqualTypeOf<
      AggregateSpec<Row>
    >();
    expectTypeOf<AggregateSpec<Row>["fn"]>().toEqualTypeOf<
      BuiltInAggregate | AggregateFn<Row>
    >();
    expectTypeOf<Props["groupAggregateDisplay"]>().toEqualTypeOf<
      GroupAggregateDisplay | undefined
    >();

    expectTypeOf<Props["filterMenu"]>().toEqualTypeOf<
      GridFilterMenuOptions | undefined
    >();
    expectTypeOf<Props["locale"]>().toEqualTypeOf<FormatLocale | undefined>();

    expectTypeOf<
      ReturnType<Api["getAggregates"]>
    >().toEqualTypeOf<AggregateResults>();
    expectTypeOf<ReturnType<Api["getDisplayRows"]>>().toEqualTypeOf<
      readonly DisplayRow<Row>[]
    >();
    expectTypeOf<DisplayRow<Row>>().toEqualTypeOf<
      ResolvedRow<Row> | ResolvedGroupRow | ResolvedGroupSummaryRow
    >();
  });
});
