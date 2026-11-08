---
"@gridkitjs/theme-css": minor
---

New package: `@gridkitjs/theme-css`, the grid's stylesheet as plain CSS for
apps without Tailwind. It is generated from `@gridkitjs/theme-tailwind`, so
it has the same rules, theme tokens, defaults and class names. Import it
once, before your own CSS:

```css
@import "@gridkitjs/theme-css/styles.css";
```

Dark mode follows `prefers-color-scheme`. An app with its own theme switch
puts `.gridkit-light` or `.gridkit-dark` on `<html>`, or on any ancestor of
a grid, to override it.
