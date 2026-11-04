---
"@gridkitjs/react": minor
---

The grid exports. The toolbar's `"export"` entry draws an Export dropdown, and
the export commands — `export.csv`, `export.json`, `exportSelection.csv` and
the rest — download their file from the toolbar, a context menu or
`runCommand`; none is shown by default, so list them where you want them:

```tsx
<DataGrid toolbar={{ items: ["search", "spacer", "export"] }} />
```

One export downloads at a time — one asked for while an asynchronous writer
is still writing is dropped and logged — and a writer that fails is logged
and announced as `messages.exportFailed`.

The ref gains `exportData(format, options?)`, which resolves to a `Blob` of
the export instead of downloading it, under the grid's `export` option with
`options` over it. It rejects for a format no writer is registered for.
`ExportFile`, `ExportOptions`, `ExportWriter` and `GridExportOptions` are
re-exported from `@gridkitjs/react`.
