---
"@gridkitjs/react": minor
"@gridkitjs/core": minor
"@gridkitjs/dom": minor
"@gridkitjs/theme-tailwind": minor
"@gridkitjs/theme-css": minor
---

Breaking: every class name the grid renders starts with `gridkit-`, so the theme's rules can no longer match a host page's own elements and a host's rules no longer reach into the grid. The rest of each name is unchanged (`grid-row` is `gridkit-grid-row`, `header-cell` is `gridkit-header-cell`, `borders-all` is `gridkit-borders-all`), and the `is-*` state classes keep their names. Names that already started with `gridkit-` are unchanged too. Custom CSS and test selectors that name a grid class add the prefix:

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
