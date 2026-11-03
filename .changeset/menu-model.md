---
"@gridkitjs/core": minor
---

A menu model every renderer draws its menus from. A menu is a list of
`MenuEntry`s — command ids, `"separator"`, inline items and submenus — and
`resolveMenu(entries, { commands, context })` turns it into what to draw:
hidden entries and unknown ids left out, labels resolved to strings, `checked`
set only on checkable items, separators never leading, trailing or doubled,
empty submenus dropped, and each item's `run()` bound to its context.

`nextMenuIndex` and `typeaheadIndex` are the pure halves of a menu's keyboard
handling: where an arrow, Home or End key moves focus, skipping separators and
wrapping, and which item a typed prefix picks.
