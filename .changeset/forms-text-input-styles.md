---
"@gridkitjs/theme-tailwind": minor
"@gridkitjs/theme-css": minor
---

`forms.css` styles the forms packages' text inputs. A text control sits in
a box (`gridkit-forms-control`) as tall as its density picks (24px compact,
32px standard, 40px comfortable by default, read from
`--gridkit-forms-control-height`, `-compact` and `-comfortable`), with a
border in the muted text colour, at 3:1 or more against the surface in
every preset. While the field shows a message the border and the focus
ring take the colour of the most serious one: error, warning, info or
success. Read-only and disabled boxes sit on the muted surface. The box
holds a prefix and a suffix, a clear button, a password's reveal button and
a spinner that turns while the input loads (a still ring under
`prefers-reduced-motion`); a counter shows under it. A multiline input's
textarea has a line height of 1.5 and rests a floating label on its first
line, a search input shows a search icon and hides the browser's own clear
button, and an upper-cased input shows its text upper-cased. Under forced
colours an error or warning box keeps a thicker border; under a coarse
pointer the icon buttons are at least 24px. It now also declares
`--gridkit-icon-size` with the grid's default, so it still works alone.
