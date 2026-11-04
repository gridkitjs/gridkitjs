# @gridkitjs/export-xlsx

An Excel export for GridKit grids: a writer that turns what the grid shows
into a real `.xlsx` workbook — numbers, dates and booleans stored as Excel's
own in the column's format, a bold header row frozen at the top, each
column's width, group headers above rows Excel's outline collapses, and the
grand total. Built on
[`@gridkitjs/core`](https://www.npmjs.com/package/@gridkitjs/core) and
[`fflate`](https://www.npmjs.com/package/fflate), with no DOM: it runs in the
browser or in Node.

> **Early development.** The API is still moving and may break between minor
> versions.

```bash
pnpm add @gridkitjs/export-xlsx
```

Register the writer on the grid, and its "Export to Excel" command appears in
the toolbar's Export dropdown and wherever export commands are listed:

```tsx
import { DataGrid } from "@gridkitjs/react";
import { xlsxWriter } from "@gridkitjs/export-xlsx";

const writers = [xlsxWriter({ sheetName: "Orders" })];

<DataGrid
  columns={columns}
  dataSource={orders}
  toolbar={{ items: ["export"] }}
  exportWriters={writers}
/>;
```

| Option       | Type                                  | Default    | Description                                                                  |
| ------------ | ------------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| `sheetName`  | `string`                              | `"Sheet1"` | The sheet's name, cut to 31 characters with `[ ] : * ? / \` replaced.        |
| `headerRows` | `string[]` or `(context) => string[]` | none       | Lines above the header row: a report's name, when it was exported.           |
| `values`     | `"typed"` or `"text"`                 | `"typed"`  | Store numbers, dates and booleans as Excel's own, or every cell as its text. |

Full documentation: [github.com/gridkitjs/gridkitjs](https://github.com/gridkitjs/gridkitjs#readme)

## License

MIT © Blagoja Blazhevski
