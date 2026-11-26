---
"@gridkitjs/theme-tailwind": minor
"@gridkitjs/theme-css": minor
---

`forms.css` styles the forms packages' fields: a label above, beside
(`--gridkit-forms-label-width`, 10rem by default), visually hidden or
floating inside the control until it rises onto its top border, the
required and optional markers, the description, and messages whose icon
takes the colour of their severity while their text keeps the body colour.
A floating label rests without a transition under
`prefers-reduced-motion`. The rules live in `@layer base`, scoped to
`.gridkit-forms-*` classes.
