---
"@gridkitjs/theme-tailwind": minor
---

New entry `@gridkitjs/theme-tailwind/forms.css`, the stylesheet for the
upcoming GridKit forms packages. It declares the palette with the grid's
defaults, follows dark mode and `.gridkit-light`/`.gridkit-dark` as
`styles.css` does, and registers the same colour utilities
(`bg-gridkit-accent`), so it works alone or beside `styles.css`, in either
order. Its tokens sit on `:where(:root)`, so a preset or your own `:root`
overrides win wherever they are loaded. `styles.css` is unchanged.
