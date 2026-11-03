---
"@gridkitjs/theme-tailwind": patch
---

Dropped the `.header-resize-grip` rules; no component has rendered that element, so the stylesheet is smaller with nothing visible changed.
