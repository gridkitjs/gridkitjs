---
"@gridkitjs/theme-tailwind": minor
"@gridkitjs/theme-css": minor
---

`forms.css` styles the forms packages' masked input
(`gridkit-forms-masked-input`, its control
`gridkit-forms-masked-input-control`) in the box every text input shares.
The mask is always written left to right, so the text sits at the field's
start by the field's direction, in tabular figures; `is-monospace` sets
the control in `--gridkit-forms-mask-font-family` (the system's monospace
fonts by default), so the slots line up down a column of fields.
