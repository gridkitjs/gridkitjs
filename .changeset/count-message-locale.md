---
"@gridkitjs/core": minor
---

Count messages such as `filterResults`, `filterSearchFirst`, `copied` and `selectedCount` now format numbers with the grid's `locale` — "1,204 of 10,000 rows" under `en`, "1.204 of 10.000 rows" under `de-DE` — and in the runtime's locale when none is given, where they printed bare digits ("1204 of 10000 rows"). Overrides keep their signatures and still receive plain numbers.

`resolveMessages` takes the locale as an optional second argument, `resolveMessages(messages, locale)`, and the new `createDefaultMessages(locale)` returns the English defaults for a locale; `defaultMessages` is the one for the runtime's locale.
