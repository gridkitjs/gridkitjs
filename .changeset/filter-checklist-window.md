---
"@gridkitjs/core": minor
---

`filterChecklist(draft, { valueLimit, blanksLabel })` returns the list a
checklist filter editor draws: `items` — the values its search shows, in sort
order, cut to `valueLimit`, then a blanks item while nothing is searched —
each with its `key`, `label`, `count` and `checked`. A column with more values
than `valueLimit` lists nothing until something is searched (`needsSearch`),
and a search matching more lists the first of them, with the rest counted in
`hiddenCount`.

`GridMessages` gains `filterBlanks` ("(Blanks)"), `filterSearchFirst(total)`
("Type to search 12000 values") and `filterMoreValues(count)` ("250 more,
refine the search").
