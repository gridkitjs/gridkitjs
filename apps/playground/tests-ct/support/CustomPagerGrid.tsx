import {
  DataGridComponent,
  type DataGridProps,
  type PagerTemplateContext,
} from "@gridkitjs/react";

interface RowWithId {
  readonly id: string;
}

/**
 * `pager.template` is called synchronously by `DataGridComponent` during
 * render — the same cross-process bridge limitation documented on
 * `RowIdentifiedGrid` for `getRowId` — so defining it here keeps it
 * browser-side rather than crossing the bridge from a spec file.
 */
export default function CustomPagerGrid<Row extends RowWithId>(
  props: Omit<DataGridProps<Row>, "getRowId" | "pager"> & {
    /** `"suppressed"` renders `pager.template={() => null}`. */
    pagerTemplate?: "custom" | "suppressed";
  },
) {
  const { pagerTemplate = "custom", ...rest } = props;

  return (
    <DataGridComponent
      {...rest}
      getRowId={(row) => row.id}
      pager={{
        template:
          pagerTemplate === "suppressed"
            ? () => null
            : (context: PagerTemplateContext) => (
                <div data-testid="custom-pager">
                  <button
                    type="button"
                    data-testid="custom-prev"
                    onClick={context.previousPage}
                  >
                    Back
                  </button>
                  <span data-testid="custom-status">
                    {context.currentPage} / {context.pageCount}
                  </span>
                  <button
                    type="button"
                    data-testid="custom-next"
                    onClick={context.nextPage}
                  >
                    Forward
                  </button>
                  <button
                    type="button"
                    data-testid="custom-goto-3"
                    onClick={() => {
                      context.goToPage(2);
                    }}
                  >
                    Go to page 3
                  </button>
                </div>
              ),
      }}
    />
  );
}
