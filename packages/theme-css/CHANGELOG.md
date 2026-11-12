# @gridkitjs/theme-css

## 0.2.0

### Minor Changes

- f7250e8: Breaking: every class name the grid renders starts with `gridkit-`, so the theme's rules can no longer match a host page's own elements and a host's rules no longer reach into the grid. The rest of each name is unchanged (`grid-row` is `gridkit-grid-row`, `header-cell` is `gridkit-header-cell`, `borders-all` is `gridkit-borders-all`), and the `is-*` state classes keep their names. Names that already started with `gridkit-` are unchanged too. Custom CSS and test selectors that name a grid class add the prefix:

  ```css
  /* Before */
  .grid-row.is-overdue {
    color: red;
  }

  /* After */
  .gridkit-grid-row.is-overdue {
    color: red;
  }
  ```

  ```ts
  // Before
  page.locator(".header-cell.is-selected");

  // After
  page.locator(".gridkit-header-cell.is-selected");
  ```

  The print document and the HTML table `@gridkitjs/core` writes for copy and print follow the same rule: `export-group`, `export-group-summary`, `print-title`, `print-subtitle` and `print-timestamp` are `gridkit-export-group`, `gridkit-export-group-summary`, `gridkit-print-title`, `gridkit-print-subtitle` and `gridkit-print-timestamp`, and `printStyles` from `@gridkitjs/dom` targets them.

## 0.1.0

### Minor Changes

- 432b82f: Theme presets: ready-made themes you import after the stylesheet to restyle
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

- 680515a: New package: `@gridkitjs/theme-css`, the grid's stylesheet as plain CSS for
  apps without Tailwind. It is generated from `@gridkitjs/theme-tailwind`, so
  it has the same rules, theme tokens, defaults and class names. Import it
  once, before your own CSS:

  ```css
  @import "@gridkitjs/theme-css/styles.css";
  ```

  Dark mode follows `prefers-color-scheme`. An app with its own theme switch
  puts `.gridkit-light` or `.gridkit-dark` on `<html>`, or on any ancestor of
  a grid, to override it.

### Patch Changes

- 680515a: The grid no longer relies on Tailwind's Preflight. It sets
  `box-sizing: border-box` on itself, its menus and its drag ghosts, and its
  buttons and inputs take the surrounding font, so it draws the same in an app
  with Preflight turned off. With Preflight on, nothing changes.
