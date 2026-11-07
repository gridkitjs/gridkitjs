---
"@gridkitjs/core": minor
---

`GridToolbarOptions` takes `itemAttributes`, a map from an entry's key (a
command's, inline item's, dropdown's or custom entry's id, `"search"` or
`"export"`) to a `ToolbarItemAttributes`: an `id` and `data-*` attributes for
that entry's element. `resolveToolbar` takes the map as
`options.itemAttributes` and hands the matching attributes on as `attributes`
on each `ResolvedToolbarButton`, `ResolvedToolbarMenu`, `ResolvedToolbarSearch`
and `ResolvedToolbarCustom`. `ToolbarItemAttributes` is exported.
