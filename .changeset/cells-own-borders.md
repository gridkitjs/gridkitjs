---
"@gridkitjs/theme-tailwind": minor
"@gridkitjs/theme-css": minor
---

Each cell draws its own borders: the grid's tables use `border-collapse:
separate` with `border-spacing: 0`, where they used `border-collapse:
collapse`. Lines stay where they were, and column positions and widths are
unchanged, but a body row under `borders="horizontal"` or `"all"` is half a
pixel taller (41px where it was 40.5px at the default sizes), as the whole
row line now sits inside the row.

Custom CSS that draws a border on every side of every cell now shows doubled
lines between cells, since two neighbouring cells no longer share one. Draw
each seam from one side, as the theme does: a `border-bottom` for the line
between rows and a `border-inline-end` for the line between columns, leaving
out the last row and the last column.
