---
"@gridkitjs/react": patch
---

Keys pressed in content a template portals out of the grid — a popover or
menu rendered into `document.body` — no longer reach the grid's own key
handling. React bubbles a portal's events through the component tree, so
Escape in such a panel used to clear the grid's selection, Ctrl+A in its text
box selected every row instead of the text, and the arrow keys moved the
grid's focus.
