---
"@gridkitjs/theme-tailwind": patch
"@gridkitjs/theme-css": patch
---

A header's sort, filter and group toggles can be found and tapped on a touch
screen. On a screen that cannot hover (`hover: none`) they show at rest, where
before they appeared only on hover or keyboard focus. On a coarse pointer
(`pointer: coarse`) each toggle and the resize handle take a 24 by 24 pixel
target, the toggles sit side by side clear of the handle, and the label keeps
clear of the toggles. Desktop rendering is unchanged.
