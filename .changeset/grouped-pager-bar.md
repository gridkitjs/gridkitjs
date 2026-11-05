---
"@gridkitjs/react": minor
---

The built-in pager is redrawn as one connected bar, `« ‹ pages › »`, that no longer shifts as the user pages through it, followed by the page-size `<select>` with its label to its right.

- New First and Last buttons, named by the new `firstPage` and `lastPage` messages.
- Previous and Next show chevron icons instead of their text; `previousPage` and `nextPage` are now their accessible names and tooltips. A test that found them by text, such as `locator(".grid-pager-button", { hasText: "Next" })`, should find them by role: `getByRole("button", { name: "Next" })`.
- The arrows and pages sit inside a new `.grid-pager-bar`. Arrow buttons carry `grid-pager-nav` plus `grid-pager-first`, `grid-pager-previous`, `grid-pager-next` or `grid-pager-last`; page-number buttons carry `grid-pager-page`. All of them keep `grid-pager-button`.
- The compact status is wrapped in `.grid-pager-status-slot` beside a hidden `.grid-pager-status-sizer` holding its widest text, so it keeps one width; `.grid-pager-status` still holds the visible text.
- The page-size label text follows the `<select>` inside `.grid-pager-page-size`, in a `.grid-pager-page-size-label` span, where it came before it.
