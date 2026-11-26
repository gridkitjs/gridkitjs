---
"@gridkitjs/theme-tailwind": minor
"@gridkitjs/theme-css": minor
---

`forms.css` styles the forms packages' checkboxes and switches. Each sits
on a row as tall as a text box of its density, the native control laid
transparent over the whole row so the label is part of what a press hits.
A checkbox's box is drawn as the grid draws its own checks: an outline in
the muted text colour, filled with the accent and ticked (or marked with a
dash when mixed) in `--gridkit-accent-fg` when checked. A switch's track is
1.75 times as wide as it is tall, muted when off and the accent when on,
and its thumb moves to the inline end when on, so it follows `dir`. The box
border and the track border, and their focus rings, take the colour of the
most serious message shown. Under forced colours both draw in system
colours, under `prefers-reduced-motion` they stop animating, and under a
coarse pointer each row is at least 24px in both directions. It now also
declares `--gridkit-accent-fg` with the grid's default, so it still works
alone.
