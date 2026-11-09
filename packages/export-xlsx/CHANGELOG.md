# @gridkitjs/export-xlsx

## 0.1.5

### Patch Changes

- Updated dependencies [f0a8a8a]
- Updated dependencies [53d54fd]
- Updated dependencies [0784333]
- Updated dependencies [a2bfcd7]
- Updated dependencies [77b851d]
- Updated dependencies [9c1c06b]
  - @gridkitjs/core@0.17.0

## 0.1.4

### Patch Changes

- Updated dependencies [071c1b7]
- Updated dependencies [04748e4]
- Updated dependencies [0e66a82]
- Updated dependencies [04748e4]
- Updated dependencies [071c1b7]
- Updated dependencies [071c1b7]
  - @gridkitjs/core@0.16.0

## 0.1.3

### Patch Changes

- Updated dependencies [8ac72f8]
- Updated dependencies [9d549d2]
- Updated dependencies [2de78a3]
- Updated dependencies [479e045]
  - @gridkitjs/core@0.15.0

## 0.1.2

### Patch Changes

- Updated dependencies [2980dcf]
  - @gridkitjs/core@0.14.1

## 0.1.1

### Patch Changes

- Updated dependencies [2ac1c45]
- Updated dependencies [6a4c6c2]
- Updated dependencies [6a4c6c2]
  - @gridkitjs/core@0.14.0

## 0.1.0

### Minor Changes

- a46fa8c: First release of `@gridkitjs/export-xlsx`: `xlsxWriter(options?)`, an export
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

### Patch Changes

- bd78d43: The package manifests and READMEs now point at the repository's current home, `github.com/gridkitjs/gridkitjs`.
- Updated dependencies [7fc1b14]
- Updated dependencies [7fc1b14]
- Updated dependencies [ebac1dd]
- Updated dependencies [7fc1b14]
- Updated dependencies [812d0b6]
- Updated dependencies [812d0b6]
- Updated dependencies [812d0b6]
- Updated dependencies [7fc1b14]
- Updated dependencies [0119cd3]
- Updated dependencies [812d0b6]
- Updated dependencies [ebac1dd]
- Updated dependencies [7fc1b14]
- Updated dependencies [7fc1b14]
- Updated dependencies [0119cd3]
- Updated dependencies [0119cd3]
- Updated dependencies [610d28a]
- Updated dependencies [a5ace0c]
- Updated dependencies [a5ace0c]
- Updated dependencies [a5ace0c]
- Updated dependencies [1026158]
- Updated dependencies [1026158]
- Updated dependencies [a5ace0c]
- Updated dependencies [098fd6e]
- Updated dependencies [610d28a]
- Updated dependencies [a5ace0c]
- Updated dependencies [a5ace0c]
- Updated dependencies [bd78d43]
  - @gridkitjs/core@0.13.0
