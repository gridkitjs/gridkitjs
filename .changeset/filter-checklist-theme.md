---
"@gridkitjs/theme-tailwind": minor
---

Styles for the filter menu's excel editor. `.filter-menu-values` stacks its
`.filter-menu-search` box, the `.filter-menu-select-all` checkbox and the
`.filter-menu-checklist`, a fixed-height list that scrolls inside itself.
Each value is a `.filter-menu-option` whose `.filter-menu-option-check` is
drawn as a checkbox — filled with `--gridkit-accent` and ticked while
`[aria-checked="true"]` — beside its `.filter-menu-option-label`, ending in an
ellipsis when too long, and its muted `.filter-menu-option-count`. The muted
`.filter-menu-search-first` note takes the list's box while it waits for a
search, and `.filter-menu-more` sits under a list cut short.
