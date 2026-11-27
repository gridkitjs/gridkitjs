---
"@gridkitjs/theme-tailwind": minor
"@gridkitjs/theme-css": minor
---

`forms.css` styles the forms packages' number inputs. A number input
(`gridkit-forms-number-input`, with `gridkit-forms-percent-input` beside it
for a percentage) draws the text input's box; its number sits at the box's
end in tabular figures (the start with `is-align-start`), on the side the
field's direction gives even when the control itself is left to right. The
currency sign, percent sign or unit beside it
(`gridkit-forms-number-input-affix`) is in the muted text colour, or
`--gridkit-forms-affix-color` when set. Stepper buttons
(`gridkit-forms-stepper-button`) sit inside the box against its edge:
stacked in a column `--gridkit-forms-stepper-width` wide (20px by default)
at the end with `is-stepper-end`, or one at each end with
`is-stepper-split`, divided from the text by a line, on the muted surface
when hovered and in the muted text colour when `is-disabled`. Under a
coarse pointer the stacked buttons sit side by side, each at least 24px;
under forced colours they draw in `CanvasText`, and `GrayText` when
disabled.
