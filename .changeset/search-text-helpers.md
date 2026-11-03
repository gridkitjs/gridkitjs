---
"@gridkitjs/core": minor
---

`searchTextOf(filter)` and `setSearchText(filter, text)` read and write the
filter's global text entry as a search box shows it: `setSearchText` stores
`%text%` — contains `text`, in any column — or removes the entry for empty
text, leaving every column's entries alone; `searchTextOf` gives the text
back without its `%` anchors, so a box reading from the filter shows what was
typed.
