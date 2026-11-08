---
"@gridkitjs/react": patch
---

A context menu open when `contextMenu` is turned off, or when the grid
unmounts, now closes and reports `onContextMenuOpenChange({ open: false })`.
Before, turning the option off left the menu up, and unmounting closed it
without a word.
