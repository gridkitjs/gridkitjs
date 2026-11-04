---
"@gridkitjs/export-xlsx": minor
---

First release of `@gridkitjs/export-xlsx`: `xlsxWriter(options?)`, an export
writer that saves what a grid shows as an Excel workbook. Numbers, dates and
booleans are stored typed, in a format read from each column's `type` and
`format`; the header row is bold, frozen and printed on every page; column
widths follow the grid's; group headers are bold, with their rows outlined
beneath them; summary rows and the grand total are bold. Register it through
the grid's `exportWriters` and the `export.xlsx` command appears:

```tsx
import { xlsxWriter } from "@gridkitjs/export-xlsx";

<DataGrid exportWriters={[xlsxWriter({ sheetName: "Orders" })]} />;
```

Options: `sheetName`, `headerRows` (title lines above the header) and
`values: "typed" | "text"`.
