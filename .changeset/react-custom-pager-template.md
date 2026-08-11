---
"@gridkitjs/react": minor
---

`pager.template` — a render prop that replaces the built-in pager's markup entirely, called on every render where pagination-relevant state changed. Also exports the new `PagerTemplateContext` type. As a side effect, `pager={{ template: () => null }}` is now the documented way to suppress the built-in pager while keeping `paginated` row-windowing and the imperative API active — previously there was no way to do that short of turning `paginated` off entirely.
