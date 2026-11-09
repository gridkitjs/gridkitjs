---
"@gridkitjs/react": patch
---

Turning `virtualized` on keeps the browser's focus on a focused cell near the scroll position, and a `scrollToRow` in the same commit scrolls to its row. Before, every body row unmounted for a pass, or every row outside the window last drawn while virtualized, taking the focus to the page, and a `scrollToRow` from a parent's layout effect in that commit did nothing.
