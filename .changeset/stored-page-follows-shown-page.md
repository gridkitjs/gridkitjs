---
"@gridkitjs/core": patch
---

An uncontrolled pagination now stores the page it shows. When rows shrink
under a later page, say by collapsing a group on page 5 or a `dataSource`
getting shorter, the grid showed the last page that exists (page 3) but kept
`pageIndex: 5`, so expanding the group again jumped back to page 5. It now
stores page 3 and stays there. Like the page reset a sort or filter makes,
this fires no `onPaginationChange`. `setPagination` and `restoreState` with a
page past the last store and report the last page. A controlled `pagination`
is unchanged: the grid shows the last page that exists and leaves the value
to you.
