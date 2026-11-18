---
"@gridkitjs/react": minor
"@gridkitjs/dom": minor
"@gridkitjs/theme-tailwind": minor
"@gridkitjs/theme-css": minor
---

Breaking: the header, the rows and the footer scroll in one element,
`.gridkit-data-grid-tables`, both up and down and sideways, with the header
and footer stuck to its top and bottom. Before, `.gridkit-data-grid-body`
scrolled the rows up and down under `height`, and
`.gridkit-data-grid-viewport`, which `DataGridApi.element` returns, scrolled
the tables sideways. No class, `data-gridkit-*` attribute or ARIA role moves,
and `element` and `table` are the same elements, but code that reads or sets
a scroll position, or listens for `scroll`, on the body or the viewport now
addresses `.gridkit-data-grid-tables`:

```ts
// before
grid.querySelector(".gridkit-data-grid-body").scrollTop = 0;
api.element.scrollLeft = 0;

// after
const tables = grid.querySelector(".gridkit-data-grid-tables");
tables.scrollTop = 0;
tables.scrollLeft = 0;
```

`--gridkit-body-height`, which `height` sets, is set on
`.gridkit-data-grid-tables` in place of `.gridkit-data-grid-body`; CSS that
sets it itself sets it there.

This fixes a grid wider than its container putting its column titles over the
wrong columns. The rows scrolled sideways on their own, without the header and
footer, on a horizontal wheel or trackpad over them, a swipe, or keyboard
focus moving to a column out of view, and scrolling the grid sideways by its
scrollbar cut the rows off at the container's width. Now the header, rows and
footer stay in line however the scroll starts, in left-to-right and
right-to-left pages, with or without `height`. Under `height` the vertical
scrollbar stays at the grid's visible edge wherever it is scrolled sideways.

What stays the same: `height` bounds the rows alone, as the scroll area grows
by the header's and footer's measured heights (a server-rendered grid shows the
rows that much shorter until it hydrates); the toolbar, group-by bar and pager
stay where they are; keyboard focus and `scrollToRow` bring a row into view
clear of the header and footer; and the browser's print of the page is
unchanged. Under `resizeMode: "fit"` the columns fill the scroll area, so a
vertical scrollbar no longer makes them overflow sideways by its width.

`@gridkitjs/dom`: `observeElementHeight` reports an element's height as it
changes. `measurePageSize(bodyTable, scrollElement?)` takes the element the
rows scroll in and leaves out their block `scroll-margin`. `createGridFocus`
scrolls a body cell that focus leaves partly in view the rest of the way
(`block` and `inline` `"nearest"`). `createRowVirtualizer` works on a scroll
element whose rows follow a header stuck to its top.
