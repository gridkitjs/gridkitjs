---
"@gridkitjs/theme-tailwind": patch
---

The triangle on a group row turns open or closed at once, without its
transition, when the user's system asks for reduced motion
(`prefers-reduced-motion: reduce`), whatever a theme sets
`--gridkit-transition-duration` to.
