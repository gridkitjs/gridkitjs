---
"@gridkitjs/react": minor
---

`DataGrid` under `dataMode: "server"` counts the server's rows for assistive technology: the grid's `aria-rowcount` is `rowCount` plus the header (and the grand-total footer), and each row's `aria-rowindex` continues from the pages before it, so a screen reader on page 3 hears the row's place in the whole result. With `paginated`, the built-in pager counts its pages from `rowCount` too. A client grid's counts are unchanged.

A server grid holds one page, and a few features cover only the rows it holds: the Excel-style filter checklist lists the values in those rows, select-all selects them (a selected row on another page keeps its id, and `getSelectedRows()` returns only the held ones), export scope `"all"` exports them, and `scrollToRow` does nothing for a row on another page.
