---
"@gridkitjs/theme-tailwind": minor
---

Styles for the filter menu's simple editor. `.filter-menu-condition` puts a
condition's `.filter-menu-operator` picker on a line of its own and its
`.filter-menu-value` boxes on the next, a "Between"'s two halving it;
`.filter-menu-combinator` lays out the And/Or radio buttons between the two
conditions, and `.filter-menu-custom` is the muted "Custom filter" note. A
value box marked `[aria-invalid="true"]`, and the `.filter-menu-invalid`
message under the conditions, take `--gridkit-accent` turned red — no token
names an error colour — over the text colour in a browser without relative
colour syntax.
