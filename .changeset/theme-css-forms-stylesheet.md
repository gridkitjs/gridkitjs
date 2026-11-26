---
"@gridkitjs/theme-css": minor
---

New entry `@gridkitjs/theme-css/forms.css`, the plain-CSS copy of the
Tailwind theme's forms stylesheet for the upcoming GridKit forms packages.
It declares the palette with the grid's defaults and follows
`prefers-color-scheme` and `.gridkit-light`/`.gridkit-dark` as `styles.css`
does, so it works alone or beside `styles.css`, in either order. Its tokens
sit on `:where(:root)`, so a preset or your own `:root` overrides win
wherever they are loaded. `styles.css` is unchanged.
