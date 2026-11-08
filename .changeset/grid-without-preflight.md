---
"@gridkitjs/theme-tailwind": patch
"@gridkitjs/theme-css": patch
---

The grid no longer relies on Tailwind's Preflight. It sets
`box-sizing: border-box` on itself, its menus and its drag ghosts, and its
buttons and inputs take the surrounding font, so it draws the same in an app
with Preflight turned off. With Preflight on, nothing changes.
