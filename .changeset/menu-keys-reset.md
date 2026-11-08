---
"@gridkitjs/dom": patch
---

`attachMenu` starts the typeahead afresh after any other key it acts on, so
a letter typed after an arrow key searches for that letter alone rather than
for every letter typed in the last half second. A key it acts on also
cancels the wait of a pointer resting on an item, so a submenu item the
pointer was resting on no longer opens its submenu after the keyboard moved
focus on.
