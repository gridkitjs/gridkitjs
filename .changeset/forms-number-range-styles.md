---
"@gridkitjs/theme-tailwind": minor
"@gridkitjs/theme-css": minor
---

`forms.css` styles the forms packages' number range input
(`gridkit-forms-number-range-input`). Its two ends share one box
(`gridkit-forms-range-control`, beside `gridkit-forms-control`), each a
number control (`gridkit-forms-range-start`, `gridkit-forms-range-end`)
sharing the room and shrinking to three characters before the box would
wrap, with the separator (`gridkit-forms-range-separator`) between them,
`--gridkit-forms-range-gap` on each side (the spacing unit by default).
The span after the end (`gridkit-forms-range-span`) is muted, at the hint
size. The numbers align as a number input's do, following the field's
direction; under forced colours the separator and span draw in
`CanvasText`.
