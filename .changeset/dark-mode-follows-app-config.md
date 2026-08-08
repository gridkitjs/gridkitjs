---
"@gridkitjs/theme-tailwind": minor
---

The stylesheet no longer registers its own `@custom-variant dark` — it now
follows whatever `dark:` variant your app's own Tailwind build already
resolves to, so it never conflicts with an app that configures its own
(a class, a `data-` attribute, or anything else). Out of the box, with
nothing customized, a grid now follows the OS `prefers-color-scheme`
instead of a `.dark` class.

To keep the previous class-toggle behavior, declare it yourself, same as any
Tailwind v4 app would:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
@import "@gridkitjs/theme-tailwind/styles.css";
```

Also new: `.gridkit-light` / `.gridkit-dark`, which pin a grid to one palette
regardless of the ambient `dark:` state. Put either on any ancestor of the
grid, including the grid's own root, to force a single grid's theme
independent of the app around it.
