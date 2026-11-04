---
"@gridkitjs/react": minor
---

The column filter menu has an editor: one condition — an operator and a value
— and an optional second, joined by And or Or. The operators are the column
type's, or its own `filterMenu.operators`, and the value box suits the type: a
number box, a date picker on a `"date"` column, a date-and-time picker on a
`"dateTime"` or `"time"` one, a true/false choice on a `"boolean"` one, text
otherwise. OK, or Enter, applies the conditions in place of the column's
filter; reopened, the menu shows them, however they were set. A value missing
or not reading keeps the menu open, its box marked `aria-invalid` and
focused; a filter the editor can't show reads "Custom filter" until
conditions replace it.

Focus now starts on the first condition's value box rather than the menu's
first button.
