---
"@gridkitjs/theme-tailwind": minor
"@gridkitjs/theme-css": minor
---

The grid's stylesheet mirrors in a right-to-left page. Under `dir="rtl"`,
column borders, the resize handle, the sort and filter toggles, the group
toggle's spacing, the resize and drop lines and the group-by bar's drop
marks sit on the mirrored side, and the group row's triangle and the menus'
submenu and back chevrons point the other way. The grid follows the `dir`
attribute it inherits; setting only the CSS `direction` property mirrors the
layout but not the lines and chevrons, which use `:dir(rtl)`. Left-to-right
pages are unaffected: they render exactly as before.
