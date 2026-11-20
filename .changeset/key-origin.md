---
"@gridkitjs/dom": minor
---

Adds `keyOrigin(target)`, which sorts a key event's target as `"text-entry"` (a text-like input, a textarea, a select, editable content, or a textbox, searchbox, combobox, spinbutton or slider role), `"control"` (any other interactive element, such as a button, a link or a checkbox) or `"grid"` (a cell, the grid, anything else), with its type `KeyOrigin`, so a renderer can leave a control's keys to it. `isNativeCopy` now reads a press in any text-entry control as the browser's: a select or a range input joins the text fields it already left alone.
