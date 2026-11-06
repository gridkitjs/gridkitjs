# @gridkitjs/export-xlsx

An Excel (`.xlsx`) export writer, registered through `exportWriters`:
typed numbers and dates, number formats, a frozen header, column widths,
groups and totals. Published.

## What must not go in it

`export-xlsx` is held to `core`'s rule, so the writer runs in Node too: no
DOM in its `tsconfig.json` `lib`, and the `packages/export-xlsx/**` block of
`eslint.config.mjs` rejects `react`, `react-dom`, `@gridkitjs/react` and
`@gridkitjs/dom` imports. Its only dependencies are `@gridkitjs/core` (for
the `ExportWriter` types) and `fflate` (zipping the workbook).

## Layout

| Path                | What it holds                                                        |
| ------------------- | -------------------------------------------------------------------- |
| `src/index.ts`      | The entry point: `xlsxWriter` and `XlsxWriterOptions`.               |
| `src/xlsxWriter.ts` | The writer: turns an export table into a zipped workbook.            |
| `src/parts/`        | The workbook's XML parts: package, workbook, sheet, styles.          |
| `src/formats.ts`    | Excel number format codes, read from a column's `type` and `format`. |
| `src/dateSerial.ts` | Dates as Excel serial numbers.                                       |
| `src/xml.ts`        | XML escaping helpers.                                                |

## Commands

```bash
pnpm --filter @gridkitjs/export-xlsx test        # Vitest
pnpm --filter @gridkitjs/export-xlsx typecheck
pnpm --filter @gridkitjs/export-xlsx lint
pnpm --filter @gridkitjs/export-xlsx build       # tsup, only for publishing
```

## Tests

Vitest, next to the code as `*.test.ts`. The grid-side export flow is also
covered by `apps/playground/tests-ct/export.spec.tsx`.

## Docs

`packages/export-xlsx/docs/`. The writing rules are in the root
[Docs](../../AGENTS.md#docs) section.

## Releasing

Published, so a change here needs a changeset: see the root
[Versioning](../../AGENTS.md#versioning) section.
