---
"@gridkitjs/theme-tailwind": patch
"@gridkitjs/theme-css": patch
---

`forms.css` no longer shrinks text again at each level when
`--gridkit-font-size` is relative, as the Spreadsheet preset's `0.875em`
is. Only the outermost forms element (a form, a field, a text or search
input, a message summary) takes the token; the ones inside it keep the size
they inherit, so a field's label and its control's text match, and section
and summary titles scale from the form's text.
