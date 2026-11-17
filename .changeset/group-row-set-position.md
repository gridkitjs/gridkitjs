---
"@gridkitjs/core": minor
"@gridkitjs/react": minor
---

`ResolvedGroupRow` has two new fields, `position` and `setSize`: a group's
1-based place among the groups sharing its parent, and how many there are.
`groupRows` sets them over the whole grouped result. Code that builds a
`ResolvedGroupRow` by hand, such as a test fixture, needs to add them.

`DataGrid` draws a group row's `aria-posinset` and `aria-setsize` from them.
On a paginated grid they were counted over the current page only, so the
first group on page 2 read as "1 of 1" where it was the second of two; they
now count every group, whichever page is showing.
