---
"@gridkitjs/theme-css": minor
---

Theme presets: ready-made themes you import after the stylesheet to restyle
the grid, its menus included, in one line. They are the same files
`@gridkitjs/theme-tailwind` ships.

```css
@import "@gridkitjs/theme-css/styles.css";
@import "@gridkitjs/theme-css/presets/spreadsheet.css";
```

Each preset sets theme tokens on `:root` and nothing else, in light and dark
mode: `spreadsheet.css`, `comfortable.css`, `high-contrast.css` and
`midnight.css`. `default.css` sets every token to its default, as a template
to copy for a theme of your own: change what you want, and delete the lines
you keep. `@gridkitjs/theme-css/presets/index.json` lists the presets with an
`id`, `label`, `description` and `file` each, for tools that offer a choice
of them.
