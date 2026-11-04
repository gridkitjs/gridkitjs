---
"@gridkitjs/core": minor
---

Operators by column type, for a filter menu's conditions.
`filterOperatorFamily(type)` reads a column's `type` as the
`FilterOperatorFamily` it filters as — `"text"`, `"number"`, `"date"` or
`"boolean"` — and `defaultFilterOperators(type)` lists the operators a menu
offers on it: contains, equality, the ends and blanks on text; the orderings
and `between` on numbers; before, after and `between` on dates, with equality
left out on date-time and time columns, whose instants a typed value seldom
equals. `in` is never among them: the checklist is its editor.

`GridMessages` gains `filterOperatorLabel(operator, family)` — "Before" for
`lt` on a date, "Less than" on a number, "Is blank" for `isEmpty`.
