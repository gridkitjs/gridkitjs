---
"@gridkitjs/theme-tailwind": minor
"@gridkitjs/theme-css": minor
---

`forms.css` styles the forms packages' form structure: a form, a
fieldset and a section's body stack their parts; a section has a titled
header over a line and, when collapsible, a chevron that turns while it is
closed (without a transition under `prefers-reduced-motion`); a layout lays
fields out in up to four columns that drop to fewer as it narrows (fixed
breakpoints at 32rem, 48rem and 64rem, through container queries), with
spans that never take more columns than there are, and stacks start labels
on top below 30rem; a field group puts its inputs side by side; and a
message summary is a panel edged in its most serious severity's colour,
listing links to the fields. It now also declares `--gridkit-border-width`,
`--gridkit-radius`, `--gridkit-control-radius`, `--gridkit-focus-ring-width`
and `--gridkit-focus-ring` with the grid's defaults, so it still works
alone.
