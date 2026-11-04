---
"@gridkitjs/core": minor
---

Exporting is a set of built-in commands. `export.csv` and `export.json` save
the grid's view through `host.saveFile`, under the grid's `export` defaults;
`export.xlsx` and `export.pdf` do the same and show only once a writer for
their format is registered through `exportWriters`. `exportSelection.csv`,
`exportSelection.json` and `exportSelection.xlsx` save the selected rows, and
show only while rows are selected. Each shows on the grid, toolbar, body and
cell targets, and is disabled while there is nothing to export. Their labels
are new `messages` keys: `exportCsv`, `exportJson`, `exportXlsx`, `exportPdf`,
`exportSelectionCsv`, `exportSelectionJson` and `exportSelectionXlsx`.

A toolbar takes a new entry, `"export"`: a dropdown, labelled
`messages.exportMenu` ("Export"), of the export commands that show — left out
when none do. It is not among the default toolbar's entries; list it to add
it:

```ts
toolbar={{ items: ["search", "spacer", "export"] }}
```
