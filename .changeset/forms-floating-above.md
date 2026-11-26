---
"@gridkitjs/theme-tailwind": minor
"@gridkitjs/theme-css": minor
---

`forms.css` has a second look for a floating label: under the class
`gridkit-forms-floating-above`, on a field or on any element around it
(`<html>`, a form, a section), a raised label sits above the control, full
size and in line with its inline start, where a top label sits, instead of
on its top border. The field keeps the room above the control at all
times, so rising moves nothing else; at rest the label lies inside the
control as before. Without the class a raised label still sits on the
border.
