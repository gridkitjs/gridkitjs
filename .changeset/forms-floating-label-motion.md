---
"@gridkitjs/theme-tailwind": minor
"@gridkitjs/theme-css": minor
---

A floating label in `forms.css` now glides between resting and raised
instead of jumping. It moves and shrinks by a transition of its
`transform` (ease-out, 0.18s by default, set with
`--gridkit-forms-label-transition-duration`), with its colour and
background fading alongside, rather than by changing its `font-size`,
offsets and padding; it scales from its inline start, so it mirrors under
`dir="rtl"`. The label keeps its weight in both places. Under
`prefers-reduced-motion: reduce` it still moves without a transition.
